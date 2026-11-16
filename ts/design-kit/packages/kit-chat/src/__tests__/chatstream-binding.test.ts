import { describe, expect, it, vi } from 'vitest'
import type { ChatstreamEvent } from '@hollis-labs/chatstream-client'
import { createChatStreamBinding } from '../lib/chatstream-binding'
import type { ChatItem } from '../lib/types'

const event = (seq: number, verb: string, fields: Record<string, unknown> = {}): ChatstreamEvent => ({
  v: '1', run_id: 'run-1', seq, time: '2026-11-16T00:00:00Z', verb, ...fields,
} as ChatstreamEvent)

function manualFrame() {
  let frame: (() => void) | null = null
  return {
    scheduleFrame: (flush: () => void) => { frame = flush; return () => { frame = null } },
    flush: () => { const run = frame; frame = null; run?.() },
  }
}

describe('chatstream binding', () => {
  it('projects text, tools, approvals and errors from an ordered recorded stream', () => {
    const frame = manualFrame()
    const history: ChatItem = { kind: 'message', id: 'old', role: 'user', content: 'hello' }
    const binding = createChatStreamBinding({ initialItems: [history], ...frame })
    const events = [
      event(1, 'run.start'),
      event(2, 'message.start', { message_id: 'answer', role: 'assistant' }),
      event(3, 'part.start', { part_id: 'text', kind: 'text' }),
      event(4, 'part.delta', { part_id: 'text', text: 'Hello' }),
      event(5, 'part.end', { part_id: 'text' }),
      event(6, 'part.start', { part_id: 'call', kind: 'tool_call', meta: { name: 'search' } }),
      event(7, 'part.end', { part_id: 'call', final: { q: 'example' } }),
      event(8, 'part.start', { part_id: 'result', kind: 'tool_result', meta: { call_id: 'call' } }),
      event(9, 'part.end', { part_id: 'result', final: { found: true } }),
      event(10, 'approval.request', { approval_id: 'approval-1', call_id: 'call', reason: 'Needs permission' }),
      event(11, 'message.end', { message_id: 'answer' }),
      event(12, 'run.finish', { reason: 'stop' }),
    ]
    for (const value of events) binding.consume(value)
    binding.consume(events[8]!) // cursor overlap is harmless
    expect(binding.getSnapshot().commits).toBe(0)
    frame.flush()
    const snapshot = binding.getSnapshot()
    expect(snapshot.commits).toBe(1)
    expect(snapshot.cursor).toEqual({ seq: 12 })
    expect(snapshot.items[0]).toBe(history)
    expect(snapshot.items.map((item) => item.id)).toEqual(['old', 'text:text', 'tool:call', 'approval:approval-1'])
    expect(snapshot.items[1]).toMatchObject({ kind: 'message', source: 'Hello' })
    expect(snapshot.items[2]).toMatchObject({ kind: 'card', wireKind: 'tool', content: 'search: done' })
    expect(snapshot.status.status).toBe('idle')
  })

  it('publishes N text deltas once in a frame and keeps history rows stable', () => {
    const frame = manualFrame()
    const history: ChatItem = { kind: 'message', id: 'old', role: 'assistant', content: 'history' }
    const binding = createChatStreamBinding({ initialItems: [history], ...frame })
    const listener = vi.fn()
    binding.subscribe(listener)
    binding.consume(event(1, 'run.start'))
    binding.consume(event(2, 'message.start', { message_id: 'answer', role: 'assistant' }))
    binding.consume(event(3, 'part.start', { part_id: 'text', kind: 'text' }))
    for (let i = 0; i < 40; i++) binding.consume(event(i + 4, 'part.delta', { part_id: 'text', text: 'x' }))
    frame.flush()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(binding.getSnapshot().commits).toBe(1)
    expect(binding.getSnapshot().items[0]).toBe(history)
    expect(binding.getSnapshot().status).toMatchObject({ status: 'streaming', content: 'x'.repeat(40) })
  })

  it('retains a resume cursor and reports gaps and terminal errors', () => {
    const frame = manualFrame()
    const binding = createChatStreamBinding({ cursor: { seq: 7 }, ...frame })
    binding.consume(event(7, 'run.start')) // persisted cursor overlap
    binding.consume(event(8, 'run.start'))
    binding.consume(event(9, 'gap', { from: 6, to: 7, reason: 'retention' }))
    binding.consume(event(10, 'run.error', { code: 'upstream_error', message: 'Lost connection', retryable: true }))
    frame.flush()
    expect(binding.getSnapshot().cursor).toEqual({ seq: 10 })
    expect(binding.getSnapshot().items.map((item) => item.id)).toEqual(['gap:6:7', 'error:run-1'])
    expect(binding.getSnapshot().status).toMatchObject({ status: 'error', message: 'Lost connection' })
  })

  it('keeps tool-before-text order and opens a client from the saved cursor', async () => {
    const frame = manualFrame()
    const opened = vi.fn(async function* (cursor: { seq: number } | null) {
      expect(cursor).toEqual({ seq: 20 })
      yield event(21, 'run.start')
      yield event(22, 'message.start', { message_id: 'answer', role: 'assistant' })
      yield event(23, 'part.start', { part_id: 'call', kind: 'tool_call', meta: { name: 'lookup' } })
      yield event(24, 'part.end', { part_id: 'call' })
      yield event(25, 'part.start', { part_id: 'text', kind: 'text' })
      yield event(26, 'part.delta', { part_id: 'text', text: 'Done' })
      yield event(27, 'part.end', { part_id: 'text' })
      yield event(28, 'message.end', { message_id: 'answer' })
      yield event(29, 'run.finish', { reason: 'stop' })
    })
    const binding = createChatStreamBinding({
      cursor: { seq: 20 }, ...frame,
      client: { open: opened, onStatus: () => () => {}, onGap: () => () => {} } as never,
    })
    binding.start()
    await vi.waitFor(() => expect(opened).toHaveBeenCalledOnce())
    await new Promise((resolve) => setTimeout(resolve, 0))
    frame.flush()
    expect(binding.getSnapshot().cursor).toEqual({ seq: 29 })
    expect(binding.getSnapshot().items.map((item) => item.id)).toEqual(['tool:call', 'text:text'])
    binding.stop()
  })

  it('resumes an open text part with its reducer snapshot and retains the prefix', () => {
    const prefix = [
      event(1, 'run.start'),
      event(2, 'message.start', { message_id: 'answer', role: 'assistant' }),
      event(3, 'part.start', { part_id: 'text', kind: 'text' }),
      event(4, 'part.delta', { part_id: 'text', text: 'Hello' }),
    ]
    const suffix = [
      event(5, 'part.delta', { part_id: 'text', text: ' world' }),
      event(6, 'part.end', { part_id: 'text' }),
      event(7, 'message.end', { message_id: 'answer' }),
      event(8, 'run.finish', { reason: 'stop' }),
    ]
    const firstFrame = manualFrame()
    const first = createChatStreamBinding(firstFrame)
    for (const value of prefix) first.consume(value)
    firstFrame.flush()
    const saved = first.getSnapshot()
    expect(saved.status).toMatchObject({ status: 'streaming', content: 'Hello' })
    const resumedFrame = manualFrame()
    const resumed = createChatStreamBinding({ checkpoint: saved.checkpoint, ...resumedFrame })
    for (const value of suffix) resumed.consume(value)
    resumedFrame.flush()
    const fullFrame = manualFrame()
    const full = createChatStreamBinding(fullFrame)
    for (const value of [...prefix, ...suffix]) full.consume(value)
    fullFrame.flush()
    expect(resumed.getSnapshot().items).toEqual(full.getSnapshot().items)
    expect(resumed.getSnapshot().items[0]).toMatchObject({ kind: 'message', source: 'Hello world' })
  })

  it('keeps received text when a run ends with an error', () => {
    const frame = manualFrame()
    const binding = createChatStreamBinding(frame)
    binding.consume(event(1, 'run.start'))
    binding.consume(event(2, 'message.start', { message_id: 'answer', role: 'assistant' }))
    binding.consume(event(3, 'part.start', { part_id: 'text', kind: 'text' }))
    binding.consume(event(4, 'part.delta', { part_id: 'text', text: 'Hello' }))
    frame.flush()
    expect(binding.getSnapshot().status).toMatchObject({ status: 'streaming', content: 'Hello' })
    binding.consume(event(5, 'run.error', { code: 'upstream_error', message: 'Disconnected', retryable: true }))
    frame.flush()
    expect(binding.getSnapshot().items.map((item) => item.id)).toEqual(['text:text', 'error:run-1'])
    expect(binding.getSnapshot().items[0]).toMatchObject({ source: 'Hello' })
  })

  it('shows earlier text before a later tool while the run is still streaming', () => {
    const frame = manualFrame()
    const binding = createChatStreamBinding(frame)
    for (const value of [
      event(1, 'run.start'),
      event(2, 'message.start', { message_id: 'answer', role: 'assistant' }),
      event(3, 'part.start', { part_id: 'text', kind: 'text' }),
      event(4, 'part.delta', { part_id: 'text', text: 'Hello' }),
      event(5, 'part.end', { part_id: 'text' }),
      event(6, 'part.start', { part_id: 'call', kind: 'tool_call', meta: { name: 'lookup' } }),
    ]) binding.consume(value)
    frame.flush()
    expect(binding.getSnapshot().items.map((item) => item.id)).toEqual(['text:text', 'tool:call'])
    expect(binding.getSnapshot().status).toMatchObject({ status: 'streaming', content: '' })
  })

  it('preserves partial text when the transport throws', async () => {
    const frame = manualFrame()
    const client = {
      async *open() {
        yield event(1, 'run.start')
        yield event(2, 'message.start', { message_id: 'answer', role: 'assistant' })
        yield event(3, 'part.start', { part_id: 'text', kind: 'text' })
        yield event(4, 'part.delta', { part_id: 'text', text: 'Hello' })
        throw new Error('Transport lost')
      },
      onStatus: () => () => {},
    }
    const binding = createChatStreamBinding({ client: client as never, ...frame })
    binding.start()
    await new Promise((resolve) => setTimeout(resolve, 0))
    frame.flush()
    expect(binding.getSnapshot().items.map((item) => item.id)).toEqual(['text:text', 'transport:error'])
    expect(binding.getSnapshot().status).toMatchObject({ status: 'error', message: 'Transport lost' })
  })

  it('keeps saved text before a new tool after resuming', () => {
    const firstFrame = manualFrame()
    const first = createChatStreamBinding(firstFrame)
    for (const value of [
      event(1, 'run.start'),
      event(2, 'message.start', { message_id: 'answer', role: 'assistant' }),
      event(3, 'part.start', { part_id: 'text', kind: 'text' }),
      event(4, 'part.delta', { part_id: 'text', text: 'Before tool' }),
    ]) first.consume(value)
    firstFrame.flush()
    const resumeFrame = manualFrame()
    const resumed = createChatStreamBinding({ checkpoint: first.getSnapshot().checkpoint, ...resumeFrame })
    resumed.consume(event(5, 'part.end', { part_id: 'text' }))
    resumed.consume(event(6, 'part.start', { part_id: 'call', kind: 'tool_call', meta: { name: 'lookup' } }))
    resumeFrame.flush()
    expect(resumed.getSnapshot().items.map((item) => item.id)).toEqual(['text:text', 'tool:call'])
    expect(resumed.getSnapshot().items[0]).toMatchObject({ source: 'Before tool' })
  })
})
