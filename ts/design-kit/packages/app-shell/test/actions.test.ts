import { describe, expect, it, vi } from 'vitest'
import { OUTCOME_STATUSES, createActionGateway, outcomeMessage, parseOutcome, type ActionGatewayOptions, type AuditEntry, type CallResponse, type Outcome } from '../src'

const subject = { kind: 'item', id: 'alpha' }
const call = (name: string, hollis_action: Record<string, unknown>, extra: Record<string, unknown> = {}, n = 1) =>
  ({ surfaceId: 's1', functionCallId: `fc-${n}`, callFunction: { '@call': name, hollis_action, ...extra } })

function setup(reply: (n: number, req: Parameters<ActionGatewayOptions['backend']['execute']>[0]) => unknown, over: Partial<ActionGatewayOptions> = {}) {
  const audit: AuditEntry[] = []
  const requests: Parameters<ActionGatewayOptions['backend']['execute']>[0][] = []
  const g = createActionGateway({
    backend: { execute: async req => { requests.push(req); return reply(requests.length, req) } },
    agentFunctions: ['items.save', 'items.remove'],
    audit: e => audit.push(e),
    issueGrant: async () => 'grant-1',
    ...over,
  })
  return { g, audit, requests }
}
const value = async (p: Promise<CallResponse>): Promise<Outcome> => {
  const r = await p
  if (!('value' in r)) throw new Error('protocol error')
  return r.value
}

describe('outcome statuses (backend replies, low risk)', () => {
  const rows: [string, unknown, Outcome][] = [
    ['ok', { status: 'ok', result: { n: 1 }, receipt: 'r1' }, { status: 'ok', result: { n: 1 }, receipt: 'r1' }],
    ['accepted', { status: 'accepted', handle: 'h1', poll: true }, { status: 'accepted', handle: 'h1', poll: true }],
    ['refused', { status: 'refused', reason: 'denied' }, { status: 'refused', reason: 'denied' }],
    ['conflict', { status: 'conflict', recorded: { status: 'ok' } }, { status: 'conflict', recorded: { status: 'ok' } }],
    ['stale', { status: 'stale', current: { revision: '9' } }, { status: 'stale', current: { revision: '9' } }],
    ['canceled', { status: 'canceled', cause: 'x' }, { status: 'canceled', cause: 'x' }],
    ['expired', { status: 'expired' }, { status: 'expired' }],
    ['superseded', { status: 'superseded', by: 'z' }, { status: 'superseded', by: 'z' }],
    ['failed', { status: 'failed', code: 'boom', message: 'Disk full' }, { status: 'failed', code: 'boom', message: 'Disk full' }],
    ['unknown status is an error, never success', { status: 'maybe' }, { status: 'failed', code: 'unknown-status', message: 'The server returned an unrecognised result ("maybe").' }],
    ['known status with the wrong shape', { status: 'refused', reason: 'because' }, { status: 'failed', code: 'unknown-status', message: 'The server returned an unrecognised result ("refused").' }],
    ['not an object', 'ok', { status: 'failed', code: 'unknown-status', message: 'The server returned an unreadable result.' }],
  ]
  it.each(rows)('%s', async (_n, reply, expected) => {
    const { g, audit } = setup(() => reply)
    expect(await value(g.handleCall(call('items.save', { id: 'save-0001', subject, risk: 'low' })))).toEqual(expected)
    expect(audit).toHaveLength(1)
    expect(audit[0]!.outcome).toBe(expected.status)
  })
  it('a thrown backend becomes failed without leaking the error text', async () => {
    const { g } = setup(() => { throw new Error('token=abc') })
    const out = await value(g.handleCall(call('items.save', { id: 'save-0001', risk: 'low' })))
    expect(out).toEqual({ status: 'failed', code: 'backend-error', message: 'The action could not be completed.' })
  })
  it('the closed set is exactly the ten statuses', () => {
    expect([...OUTCOME_STATUSES]).toHaveLength(10)
    expect(parseOutcome({ status: 'partial' })).toBeNull()
  })
})

describe('idempotency', () => {
  it('the same id against a TERMINAL outcome is conflict with recorded and does not re-execute', async () => {
    const { g, requests, audit } = setup(() => ({ status: 'ok', receipt: 'r1' }))
    const a = { id: 'save-0001', subject, risk: 'low' }
    await g.handleCall(call('items.save', a))
    const second = await value(g.handleCall(call('items.save', a, {}, 2)))
    expect(second).toEqual({ status: 'conflict', recorded: { status: 'ok', receipt: 'r1' } })
    expect(requests).toHaveLength(1)
    expect(audit.map(e => [e.outcome, e.replay])).toEqual([['ok', undefined], ['conflict', true]])
  })
  it('a spent id stays spent after stale and after refusal', async () => {
    const { g, requests } = setup(() => ({ status: 'stale', current: { revision: '2' } }))
    const a = { id: 'save-0002', risk: 'low' }
    await g.handleCall(call('items.save', a))
    expect((await value(g.handleCall(call('items.save', a, {}, 2)))).status).toBe('conflict')
    expect(requests).toHaveLength(1)
  })
  it('a concurrent duplicate shares the in-flight run', async () => {
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    const { g, requests } = setup(() => gate.then(() => ({ status: 'ok' })))
    const a = { id: 'save-0003', risk: 'low' }
    const p1 = g.handleCall(call('items.save', a)); const p2 = g.handleCall(call('items.save', a, {}, 2))
    release()
    expect(await value(p1)).toEqual({ status: 'ok' }); expect(await value(p2)).toEqual({ status: 'ok' })
    expect(requests).toHaveLength(1)
  })
})

describe('risk policy and step-up', () => {
  it('high risk does not execute before a grant; the step-up retry (same id, with confirmation) is the one that executes', async () => {
    const { g, requests, audit } = setup(() => ({ status: 'ok' }))
    const p = g.handleCall(call('items.remove', { id: 'remove-001', subject, risk: 'high' }, { input: { ids: ['a'] } }))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation?.id).toBe('remove-001'))
    expect(requests).toHaveLength(0)
    g.resolveConfirmation('remove-001', 'confirm')
    expect(await value(p)).toEqual({ status: 'ok' })
    expect(requests).toHaveLength(1)
    expect(requests[0]!.action).toMatchObject({ id: 'remove-001', confirmation: 'grant-1', risk: 'high' })
    expect(audit.map(e => e.outcome)).toEqual(['ok'])
    expect(g.getSnapshot().confirmation).toBeNull()
  })
  it('a surface cannot downgrade its own risk: host policy raises it', async () => {
    const { g, requests } = setup(() => ({ status: 'ok' }), { risk: fn => (fn === 'items.remove' ? 'high' : undefined) })
    const p = g.handleCall(call('items.remove', { id: 'remove-002', risk: 'low' }))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation).not.toBeNull())
    expect(requests).toHaveLength(0)
    g.resolveConfirmation('remove-002', 'cancel')
    expect(await value(p)).toEqual({ status: 'canceled', cause: 'user' })
  })
  it('an undeclared risk with no policy fails closed to high', async () => {
    const { g, audit } = setup(() => ({ status: 'ok' }))
    void g.handleCall(call('items.save', { id: 'save-0004' }))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation).not.toBeNull())
    g.resolveConfirmation('save-0004', 'cancel')
    await vi.waitFor(() => expect(audit[0]?.risk).toBe('high'))
  })
  it('a backend that asks for confirmation on a low action goes through the same step-up, once', async () => {
    const { g, requests } = setup((n) => (n === 1 ? { status: 'needs_confirmation', confirm: { what: 'Sure?', scope: ['item:alpha'], ttlMs: 5000 } } : { status: 'ok' }))
    const p = g.handleCall(call('items.save', { id: 'save-0005', risk: 'low' }))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation?.confirm.what).toBe('Sure?'))
    g.resolveConfirmation('save-0005', 'confirm')
    expect(await value(p)).toEqual({ status: 'ok' })
    expect(requests.map(r => r.action.confirmation)).toEqual([undefined, 'grant-1'])
  })
  it('asking again after the grant is a failure, not a loop', async () => {
    const ask = { status: 'needs_confirmation', confirm: { what: 'Sure?', scope: ['x'], ttlMs: 5000 } }
    const { g } = setup(() => ask)
    const p = g.handleCall(call('items.save', { id: 'save-0006', risk: 'low' }))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation).not.toBeNull())
    g.resolveConfirmation('save-0006', 'confirm')
    expect((await value(p)).status).toBe('failed')
  })
  it('a surface-supplied confirmation is refused', async () => {
    const { g, requests } = setup(() => ({ status: 'ok' }))
    expect(await value(g.handleCall(call('items.remove', { id: 'remove-003', risk: 'high', confirmation: 'forged' })))).toEqual({ status: 'refused', reason: 'invalid-arguments' })
    expect(requests).toHaveLength(0)
  })
  it('medium executes at once and offers undo when the host has one', async () => {
    const undo = vi.fn(async () => {})
    const { g, requests } = setup(() => ({ status: 'ok' }), { undo: () => undo })
    await g.handleCall(call('items.save', { id: 'save-0007', subject, risk: 'medium' }))
    expect(requests).toHaveLength(1)
    await g.getSnapshot().notice!.undo!()
    expect(undo).toHaveBeenCalledOnce()
  })
})

describe('decision surface', () => {
  it('is frozen while shown, and an edit cancels it', async () => {
    const { g, requests } = setup(() => ({ status: 'ok' }))
    const input = { ids: ['a', 'b'] }
    const p = g.handleCall(call('items.remove', { id: 'remove-004', subject, risk: 'high' }, { input }))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation).not.toBeNull())
    input.ids.push('c')
    const shown = g.getSnapshot().confirmation!
    expect(shown.action.input).toEqual({ ids: ['a', 'b'] })
    expect(Object.isFrozen(shown.action.input)).toBe(true)
    g.cancel('other-id', 'edited')
    expect(g.getSnapshot().confirmation).not.toBeNull()
    g.cancel('remove-004', 'edited')
    expect(await value(p)).toEqual({ status: 'canceled', cause: 'edited' })
    expect(requests).toHaveLength(0)
  })
  it('a second decision while one is open is canceled, the first is untouched', async () => {
    const { g } = setup(() => ({ status: 'ok' }))
    const first = g.handleCall(call('items.remove', { id: 'remove-005', risk: 'high' }))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation).not.toBeNull())
    expect(await value(g.handleCall(call('items.remove', { id: 'remove-006', risk: 'high' }, {}, 2)))).toEqual({ status: 'canceled', cause: 'confirmation-in-progress' })
    expect(g.getSnapshot().confirmation!.id).toBe('remove-005')
    g.resolveConfirmation('remove-005', 'cancel'); await first
  })
  it('expires when the ttl passes', async () => {
    vi.useFakeTimers()
    try {
      const { g, requests } = setup(() => ({ status: 'ok' }), { describe: a => ({ what: a.function, scope: ['x'], ttlMs: 1000 }) })
      const p = g.handleCall(call('items.remove', { id: 'remove-007', risk: 'high' }))
      await vi.advanceTimersByTimeAsync(1001)
      expect(await value(p)).toEqual({ status: 'expired' })
      expect(requests).toHaveLength(0)
    } finally { vi.useRealTimers() }
  })
  it('no room for the overlay is a failure, not a silent skip', async () => {
    const { g } = setup(() => ({ status: 'ok' }), { confirmationHost: { open: () => false, close: () => {} } })
    expect((await value(g.handleCall(call('items.remove', { id: 'remove-008', risk: 'high' })))).status).toBe('failed')
  })
  it('a failing grant issuer fails the action', async () => {
    const { g } = setup(() => ({ status: 'ok' }), { issueGrant: async () => { throw new Error('nope') } })
    const p = g.handleCall(call('items.remove', { id: 'remove-009', risk: 'high' }))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation).not.toBeNull())
    g.resolveConfirmation('remove-009', 'confirm')
    expect(await value(p)).toMatchObject({ status: 'failed', code: 'grant-failed' })
  })
})

describe('staleness', () => {
  it('a basis that no longer matches is stale, with no execution', async () => {
    const { g, requests } = setup(() => ({ status: 'ok' }), { currentBasis: () => ({ revision: '8' }) })
    const out = await value(g.handleCall(call('items.save', { id: 'save-0008', subject, risk: 'medium', basis: { revision: '7' } })))
    expect(out).toEqual({ status: 'stale', current: { revision: '8' } })
    expect(requests).toHaveLength(0)
    expect(g.getSnapshot().notice!.review).toEqual({ id: 'save-0008', subject, current: { revision: '8' } })
  })
  it('a matching basis executes; a basis that goes stale while confirming does not', async () => {
    let rev = '7'
    const { g, requests } = setup(() => ({ status: 'ok' }), { currentBasis: () => ({ revision: rev }) })
    expect((await value(g.handleCall(call('items.save', { id: 'save-0009', subject, risk: 'low', basis: { revision: '7' } })))).status).toBe('ok')
    const p = g.handleCall(call('items.remove', { id: 'remove-010', subject, risk: 'high', basis: { revision: '7' } }, {}, 2))
    await vi.waitFor(() => expect(g.getSnapshot().confirmation).not.toBeNull())
    rev = '8'
    g.resolveConfirmation('remove-010', 'confirm')
    expect((await value(p)).status).toBe('stale')
    expect(requests).toHaveLength(1)
  })
})

describe('local catalog and routing', () => {
  const locals = ['navigate', 'openOverlay', 'closeOverlay', 'openRegion', 'closeRegion', 'toast', 'focus', 'setData'] as const
  it.each(locals)('%s runs its handler and answers ok', async name => {
    const handler = vi.fn()
    const { g, requests } = setup(() => ({ status: 'ok' }), { catalog: { [name]: handler } })
    const res = await g.handleCall({ surfaceId: 's1', functionCallId: 'f', callFunction: { '@call': name, route: 'items' } })
    expect(res).toEqual({ functionCallId: 'f', value: { status: 'ok' } })
    expect(handler).toHaveBeenCalledWith({ route: 'items' }, { surfaceId: 's1' })
    expect(requests).toHaveLength(0)
  })
  it.each(['openModal', 'eval', 'items.delete', 'navigate '])('%s is refused', async name => {
    const { g, requests, audit } = setup(() => ({ status: 'ok' }))
    expect((await g.handleCall({ surfaceId: 's1', functionCallId: 'f', callFunction: { '@call': name } })).functionCallId).toBe('f')
    expect(await value(g.handleCall({ surfaceId: 's1', functionCallId: 'f', callFunction: { '@call': name } }))).toEqual({ status: 'refused', reason: 'unsupported-action' })
    expect(requests).toHaveLength(0); expect(audit).toHaveLength(0)
  })
  it('a catalog function with no handler is refused; a throwing handler fails', async () => {
    const { g } = setup(() => ({ status: 'ok' }), { catalog: { navigate: () => { throw new Error('x') } } })
    expect(await value(g.handleCall({ surfaceId: 's', functionCallId: 'f', callFunction: { '@call': 'toast' } }))).toEqual({ status: 'refused', reason: 'unsupported-action' })
    expect((await value(g.handleCall({ surfaceId: 's', functionCallId: 'f', callFunction: { '@call': 'navigate' } }))).status).toBe('failed')
  })
  it('a catalog name cannot also be an agent function', () => {
    expect(() => createActionGateway({ backend: { execute: async () => ({}) }, agentFunctions: ['toast'], audit: () => {}, issueGrant: async () => 'g' })).toThrow(/catalog function/)
  })
  it('protocol failures use the error object, domain outcomes use value', async () => {
    const { g } = setup(() => ({ status: 'ok' }))
    expect(await g.handleCall({ surfaceId: 's', functionCallId: 'f', callFunction: {} })).toMatchObject({ functionCallId: 'f', error: { code: 'invalid_request' } })
    expect(await g.handleCall({ surfaceId: 's', functionCallId: '', callFunction: { '@call': 'toast' } })).toMatchObject({ error: { code: 'invalid_request' } })
  })
  it.each([
    ['short id', { id: 'x' }],
    ['bad risk', { id: 'save-0010', risk: 'extreme' }],
    ['extra field', { id: 'save-0010', payload: 1 }],
    ['bad subject', { id: 'save-0010', subject: { kind: 'item' } }],
    ['bad basis', { id: 'save-0010', basis: {} }],
  ])('invalid hollis_action (%s) is refused without a ledger entry', async (_n, a) => {
    const { g, requests } = setup(() => ({ status: 'ok' }))
    expect(await value(g.handleCall(call('items.save', a)))).toEqual({ status: 'refused', reason: 'invalid-arguments' })
    expect(requests).toHaveLength(0)
  })
})

describe('audit and messages', () => {
  it('audit carries id, subject, risk, status and time, and never input, grants or results', async () => {
    const { g, audit } = setup(() => ({ status: 'ok', result: { secret: 's3cret' }, receipt: 'r' }), { now: () => Date.UTC(2026, 10, 12) })
    await g.handleCall(call('items.save', { id: 'save-0011', subject, risk: 'low' }, { input: { password: 'hunter2' } }))
    expect(audit).toEqual([{ id: 'save-0011', function: 'items.save', subject, risk: 'low', outcome: 'ok', at: '2026-11-12T00:00:00.000Z', surfaceId: 's1' }])
    expect(JSON.stringify(audit)).not.toMatch(/hunter2|s3cret/)
  })
  it('a throwing audit sink does not change the outcome', async () => {
    const { g } = setup(() => ({ status: 'ok' }), { audit: () => { throw new Error('sink down') } })
    expect((await value(g.handleCall(call('items.save', { id: 'save-0012', risk: 'low' })))).status).toBe('ok')
  })
  it('refused, conflict and failed read differently and carry the backend reason', () => {
    const r = outcomeMessage({ status: 'refused', reason: 'absent-scope' })
    const c = outcomeMessage({ status: 'conflict', recorded: { status: 'ok' } })
    const f = outcomeMessage({ status: 'failed', code: 'x', message: 'Disk full' })
    expect(new Set([r.title, c.title, f.title]).size).toBe(3)
    expect(r.detail).toContain('absent-scope'); expect(f.detail).toBe('Disk full'); expect(c.detail).toContain('done')
    expect([r, c, f].every(m => m.kind === 'error')).toBe(true)
  })
})
