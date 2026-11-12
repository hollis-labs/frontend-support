import { describe, expect, it, vi } from 'vitest'
import { buildFrameCsp, createFrameSession, createWindowBinding, createFrameWindowBinding, createFrameResources, createFrameNonce, parseBridgeMessage, encodeBridgeMessage, BRIDGE_LIMITS, type BridgeMessage } from '../src/isolation.js'
const nonce = 'ab'.repeat(32), envelope = { bridge_version: 1 as const, frame_id: 'frame', nonce }
const navigate = { type: 'navigate' as const, route: 'host.settings', parameters: {} }
const raw = (type: string, seq = 1, extra: object = {}) => JSON.stringify({ ...envelope, seq, type, ...extra })
function readySession(now: () => number = () => 0) {
  const revoke = vi.fn(), session = createFrameSession({ frameId: 'frame', nonce, requestedExports: ['View', 'Missing'], now, onRevoke: revoke })
  expect(session.beginBinding()).toBe(true)
  expect(session.accept('frame', raw('bound')).accepted).toBe(true)
  expect(session.accept('parent', raw('init', 1, { artifacts: [{ id: 'plugin', kind: 'module', sha256: '0'.repeat(64), base64: 'eA==' }], imports: [], context: {}, bindings: [{ id: 'open', intent: navigate }] })).accepted).toBe(true)
  expect(session.accept('frame', raw('initialized', 2, { exports: ['View', 'Unreviewed'] })).accepted).toBe(true)
  expect(session.exports).toEqual(['View'])
  expect(session.accept('parent', raw('mount', 2, { export: 'View', props: {}, context_revision: '1' })).accepted).toBe(true)
  expect(session.accept('frame', raw('ready', 3)).accepted).toBe(true)
  return { session, revoke }
}
describe('closed bridge parsing', () => {
  it('copies and deeply freezes exact nested DTOs and all three action intents', () => {
    for (const intent of [navigate, { type: 'command', command: 'tools/run', arguments: { selection: ['one'] } }, { type: 'modal', region: 'modal', entry: { owner_id: 'tools', local_key: 'view' }, props: {} }]) {
      const parsed = parseBridgeMessage(raw('invoke', 1, { id: '1', binding: 'open', intent }))
      expect(parsed.accepted).toBe(true)
      if (parsed.accepted && parsed.message.type === 'invoke') { expect(Object.isFrozen(parsed.message.intent)).toBe(true); expect(Object.isFrozen(parsed.message)).toBe(true) }
    }
  })
  it('refuses duplicates, prototype keys, unknown fields, nonfinite data, transfers and malformed ids', () => {
    for (const input of [raw('ready').replace('"seq":1', '"seq":1,"seq":2'), raw('ready').replace('"seq":1', '"seq":1,"\\u0073eq":2'), raw('ready', 1, { extra: true }),
      raw('context', 1, { revision: '1', value: { constructor: 'spoof' } }), raw('context', 1, { revision: '1', value: { x: 1 } }).replace('"x":1', '"x":1e999'),
      { ...envelope, seq: 1, type: 'ready' }, raw('invoke', 1, { id: '01', binding: 'open', intent: navigate }), raw('invoke', 1, { id: '1', binding: 'open', intent: { type: 'handler' } }),
      raw('failed', 1, { code: 'raw-exception' }), raw('result', 1, { id: '1', outcome: { status: 'success', secret: 'x' } })]) expect(parseBridgeMessage(input).accepted).toBe(false)
  })
  it('bounds UTF-8 bytes, depth, artifacts, module graphs and unique binding ids', () => {
    expect(parseBridgeMessage(raw('context', 1, { revision: '1', value: { x: '界'.repeat(30_000) } }))).toEqual({ accepted: false, reason: 'payload-too-large' })
    expect(parseBridgeMessage(raw('context', 1, { revision: '1', value: { x: '['.repeat(33) } })).accepted).toBe(true)
    let nested: unknown = {}; for (let i = 0; i < 33; i++) nested = { x: nested }
    expect(parseBridgeMessage(raw('context', 1, { revision: '1', value: nested })).accepted).toBe(false)
    const artifact = { id: 'runtime', kind: 'module', sha256: '0'.repeat(64), base64: 'eA==' }
    const init = { artifacts: [artifact], imports: [{ specifier: 'react', artifact: 'runtime' }], context: {}, bindings: [{ id: 'open', intent: navigate }] }
    expect(parseBridgeMessage(raw('init', 1, init)).accepted).toBe(true)
    for (const changes of [{ artifacts: [artifact, artifact] }, { artifacts: [{ ...artifact, url: 'https://bad.test' }] }, { imports: [{ specifier: './runtime.js', artifact: 'runtime' }] }, { imports: [{ specifier: 'react', artifact: 'missing' }] }, { bindings: [init.bindings[0], init.bindings[0]] }]) expect(parseBridgeMessage(raw('init', 1, { ...init, ...changes })).accepted).toBe(false)
    // Large init does not impose a JSON property-order requirement.
    expect(parseBridgeMessage(raw('init', 1, { ...init, artifacts: [{ ...artifact, base64: 'eHh4'.repeat(20_000) }] })).accepted).toBe(true)
  })
  it('uses closed failure and result codes, including policy-unavailable', () => {
    expect(parseBridgeMessage(raw('failed', 1, { code: 'policy-unavailable' })).accepted).toBe(true)
    expect(parseBridgeMessage(raw('result', 1, { id: '1', outcome: { status: 'refused', reason: 'denied', action_reason: 'denied', text: 'Refused.' } })).accepted).toBe(true)
    expect(parseBridgeMessage(raw('result', 1, { id: '1', outcome: { status: 'unknown-outcome', error: {} } })).accepted).toBe(false)
    const message = { ...envelope, seq: 1, type: 'ready' } as BridgeMessage
    expect(parseBridgeMessage(encodeBridgeMessage(message))).toMatchObject({ accepted: true, message })
  })
})
describe('generation-bound lifecycle', () => {
  it('rejects invocations during initialization, duplicate bind/init and unsupported exports', () => {
    const session = createFrameSession({ frameId: 'frame', nonce, requestedExports: ['View'], onRevoke: vi.fn() })
    session.beginBinding(); session.accept('frame', raw('bound'))
    expect(session.accept('frame', raw('invoke', 2, { id: '1', binding: 'open', intent: navigate }))).toMatchObject({ accepted: false })
    expect(session.phase).toBe('revoked')
    const h = readySession(); expect(h.session.accept('parent', raw('mount', 3, { export: 'Missing', props: {}, context_revision: '1' })).accepted).toBe(false)
  })
  it('fences replay, wrong direction/nonce/version and drops disposed messages without parsing', () => {
    for (const input of [raw('ready', 3), raw('invoke', 4, { id: '1', binding: 'open', intent: navigate }).replace(nonce, 'cc'.repeat(32)), raw('ready', 4).replace('"bridge_version":1', '"bridge_version":2')]) {
      const h = readySession(); expect(h.session.accept('frame', input).accepted).toBe(false); expect(h.revoke).toHaveBeenCalledOnce()
      h.session.dispose(); expect(h.session.accept('frame', 'invalid')).toEqual({ accepted: false, reason: 'disposed' })
    }
    const h = readySession(); expect(h.session.accept('parent', raw('invoke', 3, { id: '1', binding: 'open', intent: navigate })).accepted).toBe(false)
  })
  it('correlates exactly one result, unique ids and preserves uncertainty after execution', () => {
    const h = readySession()
    expect(h.session.accept('frame', raw('invoke', 4, { id: '1', binding: 'open', intent: navigate })).accepted).toBe(true)
    expect(h.session.markExecuting('1')).toBe(true)
    expect(h.session.accept('frame', raw('cancel', 5, { id: '1' })).accepted).toBe(true)
    expect(h.session.interrupt('1', 'cancelled')).toEqual({ status: 'unknown-outcome' })
    expect(h.session.accept('parent', raw('result', 3, { id: '1', outcome: { status: 'unknown-outcome' } })).accepted).toBe(true)
    expect(h.session.accept('parent', raw('result', 4, { id: '1', outcome: { status: 'success' } }))).toMatchObject({ ignored: true })
    expect(h.session.accept('frame', raw('invoke', 6, { id: '1', binding: 'open', intent: navigate })).accepted).toBe(false)
  })
  it('bounds pending work, floods, deadlines and forbids loosening policy', () => {
    let time = 0; const h = readySession(() => time)
    for (let n = 1; n <= 32; n++) expect(h.session.accept('frame', raw('invoke', n + 3, { id: String(n), binding: 'open', intent: navigate })).accepted).toBe(true)
    expect(h.session.accept('frame', raw('invoke', 36, { id: '33', binding: 'open', intent: navigate }))).toMatchObject({ reason: 'rate-limited' })
    time = 30_000; expect(h.session.expired()).toContain('1'); expect(h.session.interrupt('1', 'timeout')).toEqual({ status: 'timeout' })
    expect(h.session.markExecuting('1')).toBe(false)
    expect(() => createFrameSession({ frameId: 'frame', nonce, requestedExports: [], onRevoke: vi.fn(), limits: { pending: 33 } })).toThrow()
    expect(h.session.pendingCount).toBe(BRIDGE_LIMITS.pending)
    h.session.dispose(); expect(h.session.pendingCount).toBe(0)
  })
})
it('authenticates only the exact opaque window once; rejects extra ports and insecure randomness', () => {
  const frameWindow = {}, binding = createWindowBinding({ frameWindow, frameId: 'frame', nonce, active: () => true })
  const event = { source: frameWindow, origin: 'null', data: { ...envelope, type: 'ready-window' }, ports: [] }
  expect(binding.acceptReady({ ...event, source: {} })).toBe(false)
  expect(binding.acceptReady({ ...event, origin: 'https://host.test' })).toBe(false)
  const close = vi.fn(); expect(binding.acceptReady({ ...event, ports: [{ close }] })).toBe(false); expect(close).toHaveBeenCalledOnce()
  expect(binding.acceptReady(event)).toBe(true); expect(binding.acceptReady(event)).toBe(false)
  expect(() => createFrameNonce({} as Crypto)).toThrow('secure-randomness-unavailable')
  expect(createFrameNonce({ getRandomValues: array => { (array as unknown as Uint8Array).fill(1); return array } })).toBe('01'.repeat(32))
})
it('fences before reverse cleanup and continues after errors', () => {
  const calls: string[] = [], report = vi.fn(), resources = createFrameResources(() => { calls.push('fenced') }, report)
  resources.acquire(() => { calls.push('first') }); resources.acquire(() => { calls.push('second'); throw new Error('private') })
  resources.dispose(); resources.dispose()
  expect(calls).toEqual(['fenced', 'second', 'first']); expect(report).toHaveBeenCalledWith('cleanup-failed')
})
it('builds the reviewed CSP and refuses attempted directive injection', () => {
  const valid = { bootstrapSha256: 'A'.repeat(43) + '=', documentNonce: 'B'.repeat(43) + '=' }
  const policy = buildFrameCsp(valid)
  expect(policy.accepted).toBe(true)
  expect(buildFrameCsp({ ...valid, documentNonce: "x'; script-src *" })).toEqual({ accepted: false, reason: 'policy-unavailable' })
  // Pure validation only: browser CSP enforcement is tested separately by the host.
})

it('accepts exactly one frame-side port from its pinned parent, closes extras and repeated binds', () => {
  const parentWindow = {}, active = { value: true }, binding = createFrameWindowBinding({ parentWindow, parentOrigin: 'https://host.test', frameId: 'frame', nonce, active: () => active.value })
  const close = vi.fn(), port = { close }, event = { source: parentWindow, origin: 'https://host.test', data: { ...envelope, type: 'bind-window' }, ports: [port] }
  expect(binding.acceptBind({ ...event, source: {} })).toBeUndefined(); expect(close).toHaveBeenCalledOnce()
  expect(binding.acceptBind({ ...event, ports: [port, port] })).toBeUndefined()
  expect(binding.acceptBind(event)).toBe(port); expect(binding.acceptBind(event)).toBeUndefined()
})
it('enforces tighter host bounds, handshake deadlines and flood fencing', () => {
  const message = raw('context', 1, { revision: '1', value: { x: 'long-context' } })
  expect(parseBridgeMessage(message, { ...BRIDGE_LIMITS, contextBytes: 8 }).accepted).toBe(false)
  let time = 0
  const revoke = vi.fn(), session = createFrameSession({ frameId: 'frame', nonce, requestedExports: [], now: () => time, onRevoke: revoke })
  session.beginBinding(); time = 10_000; session.checkHandshake(); expect(revoke).toHaveBeenCalledWith('handshake-failed')
  const h = readySession()
  for (let i = 1; i <= 35; i++) h.session.accept('frame', raw('invoke', i + 3, { id: String(i), binding: 'open', intent: navigate }))
  expect(h.revoke).toHaveBeenCalledWith('rate-limited'); expect(h.session.phase).toBe('revoked')
})
