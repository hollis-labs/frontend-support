import { useSyncExternalStore, type ReactNode } from 'react'
import type { ChatStreamClient, ChatstreamEvent, ConnectionStatus, Cursor } from '@hollis-labs/chatstream-client'
import { reduce, toolCalls, type Approval, type Message, type ToolCall } from '@hollis-labs/chatstream-reducer'
import type { ChatItem, ChatStreamStatus } from './types'

export interface ChatStreamBindingCheckpoint {
  readonly cursor: Cursor | null
  readonly message: Message | null
  /** Event order for rows already received when the view detaches. */
  readonly ordering: readonly (readonly [string, number])[]
}

export interface ChatStreamBindingSnapshot {
  readonly items: readonly ChatItem[]
  readonly status: ChatStreamStatus
  readonly cursor: Cursor | null
  /** Persist with cursor to resume an open run, including partial text and tool state. */
  readonly message: Message | null
  /** Persist this whole value to resume an open run without losing row order. */
  readonly checkpoint: ChatStreamBindingCheckpoint
  /** Number of React-visible transcript updates, useful for profiling and tests. */
  readonly commits: number
}

export interface ChatStreamBindingOptions {
  readonly client?: ChatStreamClient
  readonly initialItems?: readonly ChatItem[]
  readonly cursor?: Cursor | null
  /** Resume input: cursor, reducer state and row chronology together. */
  readonly checkpoint?: ChatStreamBindingCheckpoint
  /** The host may supply a rich card; the default remains a readable text card. */
  readonly renderTool?: (call: ToolCall) => ReactNode
  readonly renderApproval?: (approval: Approval) => ReactNode
  /** Defaults to requestAnimationFrame, with a timer fallback outside a browser. */
  readonly scheduleFrame?: (flush: () => void) => () => void
  /** Diagnostic control for comparing one publication per event with frame batching. */
  readonly publishEachEvent?: boolean
}

export interface ChatStreamBinding {
  getSnapshot(): ChatStreamBindingSnapshot
  subscribe(listener: () => void): () => void
  /** Apply recorded events or events from a transport. Replayed seq values are ignored by the reducer. */
  consume(event: ChatstreamEvent): void
  start(): void
  stop(): void
}

const scheduleBrowserFrame = (flush: () => void): (() => void) => {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(flush)
    return () => cancelAnimationFrame(id)
  }
  const id = setTimeout(flush, 16)
  return () => clearTimeout(id)
}

const cardText = (call: ToolCall): string => {
  const label = call.name || 'Tool'
  return `${label}: ${call.status}`
}

/**
 * Optional bridge from chatstream/v1 to kit-chat's transport-free ChatItem model.
 * The reducer consumes every event immediately; only the projected transcript is
 * published once per frame. This also keeps unchanged history row objects stable.
 */
export function createChatStreamBinding(options: ChatStreamBindingOptions = {}): ChatStreamBinding {
  const listeners = new Set<() => void>()
  const baseItems = options.initialItems ?? []
  const schedule = options.scheduleFrame ?? scheduleBrowserFrame
  let state: Message | null = options.checkpoint?.message ?? null
  let cursor = options.checkpoint?.cursor ?? options.cursor ?? (state?.lastSeq ? { seq: state.lastSeq } : null)
  const order = new Map<string, number>(options.checkpoint?.ordering ?? [])
  let snapshot: ChatStreamBindingSnapshot = { items: baseItems, status: { status: 'idle' }, cursor, message: state, checkpoint: { cursor, message: state, ordering: [...order] }, commits: 0 }
  let projected = new Map<string, { signature: string; item: ChatItem }>()
  let pending = false
  let cancelFrame: (() => void) | null = null
  let abort: AbortController | null = null
  let offStatus: (() => void) | null = null
  let transportError: string | null = null
  let connection: ConnectionStatus | null = null

  function publish() {
    pending = false
    cancelFrame = null
    const nextProjected = new Map<string, { signature: string; item: ChatItem }>()
    const current: ChatItem[] = []
    const stable = (id: string, signature: string, item: ChatItem) => {
      const cached = projected.get(id)
      const value = cached?.signature === signature ? cached.item : item
      nextProjected.set(id, { signature, item: value })
      current.push(value)
    }

    if (state) {
      const parts = state.parts
      const tail = parts.at(-1)
      const activeTail = state.status !== 'done' && state.status !== 'error' && !transportError && tail?.kind === 'text' && tail.open ? tail : null
      for (const part of parts) {
          if (part.kind !== 'text' || !part.text || part === activeTail) continue
          const id = `text:${part.id}`
          stable(id, part.text, { kind: 'message', id, role: 'assistant', content: part.text, source: part.text })
      }
      for (const call of toolCalls(state)) {
        const id = `tool:${call.id}`
        const signature = JSON.stringify([call.name, call.status, call.arguments, call.resultPart])
        stable(id, signature, { kind: 'card', id, wireKind: 'tool', content: options.renderTool?.(call) ?? cardText(call) })
      }
      for (const approval of state.approvals) {
        const id = `approval:${approval.id}`
        const signature = JSON.stringify(approval)
        stable(id, signature, {
          kind: 'card', id, wireKind: 'approval',
          content: options.renderApproval?.(approval) ?? `Approval requested${approval.reason ? `: ${approval.reason}` : ''}`,
        })
      }
      for (const gap of state.gaps) {
        const id = `gap:${gap.from}:${gap.to}`
        stable(id, gap.reason, { kind: 'marker', id, variant: 'error', label: `Stream gap ${gap.from}–${gap.to}: ${gap.reason}` })
      }
      if (state.error) {
        const id = `error:${state.runId}`
        stable(id, state.error.message, { kind: 'marker', id, variant: 'error', label: state.error.message })
      }
    }
    if (transportError) {
      stable('transport:error', transportError, { kind: 'marker', id: 'transport:error', variant: 'error', label: transportError })
    }
    projected = nextProjected
    current.sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    const items = current.length ? [...baseItems, ...current] : baseItems
    let status: ChatStreamStatus = { status: 'idle' }
    if (transportError) status = { status: 'error', message: transportError }
    else if (state?.status === 'error') status = { status: 'error', message: state.error?.message ?? 'Stream error' }
    else if (state && state.status !== 'done' && state.status !== 'idle') {
      const tail = state.parts.at(-1)
      status = { status: connection === 'stalled' || state.status === 'stalled' ? 'stalled' : 'streaming', role: 'assistant', content: tail?.kind === 'text' && tail.open ? tail.text ?? '' : '' }
    }
    snapshot = { items, status, cursor, message: state, checkpoint: { cursor, message: state, ordering: [...order] }, commits: snapshot.commits + 1 }
    for (const listener of listeners) listener()
  }

  function queuePublish() {
    if (options.publishEachEvent) { publish(); return }
    if (pending) return
    pending = true
    cancelFrame = schedule(publish)
  }

  if (state) publish()

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    consume(event) {
      if (event.seq > 0 && event.seq <= (cursor?.seq ?? 0)) return
      const next = reduce([event], state)
      if (next === state) return
      state = next
      if (event.verb === 'part.start' && event.part_id) {
        if (event.kind === 'text') order.set(`text:${event.part_id}`, event.seq)
        if (event.kind === 'tool_call') order.set(`tool:${event.part_id}`, event.seq)
      }
      if (event.verb === 'approval.request' && event.approval_id) order.set(`approval:${event.approval_id}`, event.seq)
      if (event.verb === 'gap') order.set(`gap:${event.from}:${event.to}`, event.seq)
      if (event.verb === 'run.error') order.set(`error:${event.run_id}`, event.seq)
      if (event.seq > (cursor?.seq ?? 0)) cursor = { seq: event.seq }
      queuePublish()
    },
    start() {
      if (!options.client || abort) return
      const controller = new AbortController()
      abort = controller
      transportError = null
      offStatus = options.client.onStatus((status) => { connection = status; queuePublish() })
      void (async () => {
        try {
          for await (const event of options.client!.open(cursor, controller.signal)) this.consume(event)
        } catch (error) {
          if (!controller.signal.aborted) {
            transportError = error instanceof Error ? error.message : String(error)
            queuePublish()
          }
        } finally {
          if (abort === controller) {
            abort = null
            offStatus?.()
            offStatus = null
          }
        }
      })()
    },
    stop() {
      abort?.abort()
      abort = null
      offStatus?.()
      offStatus = null
      cancelFrame?.()
      cancelFrame = null
      if (pending) publish()
    },
  }
}

/** Subscribe to an already-created binding; the host owns its lifetime. */
export function useChatStreamBinding(binding: ChatStreamBinding): ChatStreamBindingSnapshot {
  return useSyncExternalStore(binding.subscribe, binding.getSnapshot, binding.getSnapshot)
}
