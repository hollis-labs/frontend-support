import { describe, expect, it } from 'vitest'
import { createCardEngine, describeExpiry, type CardRule } from '../engine'

const rules: CardRule[] = [
  {
    id: 'approvals',
    match: { kind: 'sample.approval*' },
    surface: 'toast',
    dedupeBy: ['kind', 'subject'],
    supersedes: 'dedupe-key',
    ttlMs: 120_000,
    actions: [{ id: 'approve', label: 'Approve' }],
    escalateBlocking: true,
  },
  { id: 'notices', match: { kind: 'sample.notice' }, surface: 'toast', ttlMs: 5_000 },
  { id: 'metrics', match: { kind: 'sample.metric' }, surface: 'inline', dedupeBy: ['kind', 'subject'] },
]

function make(start = 1_000) {
  let now = start
  const engine = createCardEngine({ rules, now: () => now })
  return { engine, tick: (ms: number) => { now += ms } }
}

describe('lifecycle engine', () => {
  it('returns null for a card no rule matches instead of dropping it silently', () => {
    expect(make().engine.ingest({ id: 'x', kind: 'sample.unknown' })).toBeNull()
  })

  it('never lets a toast hold the only copy of an answerable card', () => {
    const { engine } = make()
    const vm = engine.ingest({ id: 'a1', kind: 'sample.approval', subject: 'op-1' })!
    expect(vm.answerable).toBe(true)
    expect(vm.home).toBe('tray')
    expect(vm.surfaces).toEqual(['tray', 'toast'])
    engine.dismissToast('a1')
    expect(engine.select('toast')).toHaveLength(0)
    expect(engine.select('tray').map((c) => c.id)).toEqual(['a1'])
  })

  it('gives a non-answerable notice a toast only, and auto-dismisses it on ttl', () => {
    const { engine, tick } = make()
    const vm = engine.ingest({ id: 'n1', kind: 'sample.notice' })!
    expect(vm.surfaces).toEqual(['toast'])
    tick(5_001)
    expect(engine.dismissExpiredToasts()).toEqual(['n1'])
    expect(engine.select('toast')).toHaveLength(0)
  })

  it('does not auto-dismiss an answerable card when its ttl passes', () => {
    const { engine, tick } = make()
    engine.ingest({ id: 'a1', kind: 'sample.approval', subject: 'op-1' })
    tick(10 * 60_000)
    expect(engine.dismissExpiredToasts()).toEqual([])
    expect(engine.get('a1')!.status).toBeNull()
  })

  it('never infers expiry: only the server status moves a card to expired', () => {
    const { engine, tick } = make()
    engine.ingest({ id: 'a1', kind: 'sample.approval', subject: 'op-1' })
    tick(10 * 60_000)
    expect(engine.get('a1')!.status).toBeNull()
    engine.applyServerState('a1', 'expired')
    expect(engine.get('a1')!.status).toBe('expired')
  })

  it('shows absolute expiry, and a countdown only in the final minute', () => {
    const { engine } = make(0)
    const vm = engine.ingest({ id: 'a1', kind: 'sample.approval', subject: 'op-1' })!
    expect(describeExpiry(vm, 0)).toEqual({ at: 120_000, countdownSeconds: null })
    expect(describeExpiry(vm, 60_000)!.countdownSeconds).toBe(60)
    expect(describeExpiry(vm, 119_500)!.countdownSeconds).toBe(1)
    expect(describeExpiry({ expiresAt: null }, 0)).toBeNull()
  })

  it('lets a server expiresAt win over the rule ttl', () => {
    const { engine } = make()
    expect(engine.ingest({ id: 'a1', kind: 'sample.approval', subject: 's', expiresAt: 9_999 })!.expiresAt).toBe(9_999)
  })

  it('supersedes by dedupe key without reordering existing cards', () => {
    const { engine } = make()
    engine.ingest({ id: 'a1', kind: 'sample.approval', subject: 'op-1' })
    engine.ingest({ id: 'm1', kind: 'sample.metric', subject: 'm' })
    engine.ingest({ id: 'a2', kind: 'sample.approval', subject: 'op-1' })
    expect(engine.snapshot().order).toEqual(['a1', 'm1', 'a2'])
    expect(engine.get('a1')).toMatchObject({ status: 'superseded', supersededBy: 'a2' })
  })

  it('folds a plain dedupe hit into the existing card in place', () => {
    const { engine } = make()
    engine.ingest({ id: 'm1', kind: 'sample.metric', subject: 'm', payload: 1 })
    engine.ingest({ id: 'm2', kind: 'sample.metric', subject: 'm', payload: 2 })
    expect(engine.snapshot().order).toEqual(['m1'])
    expect(engine.get('m1')!.input.payload).toBe(2)
  })

  it('holds a replacement while the person is editing, then swaps on request', () => {
    const { engine } = make()
    engine.ingest({ id: 'a1', kind: 'sample.approval', subject: 'op-1' })
    engine.setEditing('a1', true)
    engine.ingest({ id: 'a2', kind: 'sample.approval', subject: 'op-1' })
    expect(engine.get('a1')).toMatchObject({ status: null, updatedAvailable: true, editing: true })
    expect(engine.get('a2')).toBeUndefined()
    engine.setEditing('a1', false)
    expect(engine.get('a2')).toBeUndefined() // stopping an edit does not swap by itself
    engine.applyPending('a1')
    expect(engine.get('a1')).toMatchObject({ status: 'superseded', supersededBy: 'a2', updatedAvailable: false })
    expect(engine.get('a2')).toBeDefined()
  })

  it('holds a same-id update while editing', () => {
    const { engine } = make()
    engine.ingest({ id: 'm1', kind: 'sample.metric', subject: 'm', payload: 1, revision: 1 })
    engine.setEditing('m1', true)
    engine.ingest({ id: 'm1', kind: 'sample.metric', subject: 'm', payload: 2, revision: 2 })
    expect(engine.get('m1')!.input.payload).toBe(1)
    expect(engine.get('m1')!.updatedAvailable).toBe(true)
    engine.applyPending('m1')
    expect(engine.get('m1')!.input.payload).toBe(2)
  })

  it('ignores a stale revision for a known id', () => {
    const { engine } = make()
    engine.ingest({ id: 'm1', kind: 'sample.metric', subject: 'm', payload: 2, revision: 2 })
    engine.ingest({ id: 'm1', kind: 'sample.metric', subject: 'm', payload: 1, revision: 1 })
    expect(engine.get('m1')!.input.payload).toBe(2)
  })

  it('escalates a blocking card to a modal when the rule says so', () => {
    const { engine } = make()
    const vm = engine.ingest({ id: 'a1', kind: 'sample.approval', subject: 'x', blocking: true })!
    expect(vm.home).toBe('modal')
    expect(engine.select('modal')).toHaveLength(1)
  })

  it('notifies subscribers and stops after unsubscribe', () => {
    const { engine } = make()
    let calls = 0
    const off = engine.subscribe(() => { calls += 1 })
    engine.ingest({ id: 'm1', kind: 'sample.metric', subject: 'm' })
    off()
    engine.ingest({ id: 'm9', kind: 'sample.metric', subject: 'z' })
    expect(calls).toBe(1)
  })
})
