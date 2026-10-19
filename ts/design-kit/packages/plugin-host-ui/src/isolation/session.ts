import { BRIDGE_LIMITS, parseBridgeMessage, type BridgeMessage, type BridgeOutcome, type BridgeReason, type FrameFailureCode, type BridgeLimits, parseWindowMessage, utf8Bytes } from './protocol.js'
export type FramePhase = 'prepared' | 'binding' | 'initializing' | 'initialized' | 'ready' | 'revoked' | 'disposed'
export type BridgeDirection = 'parent' | 'frame'
export type SessionReceipt = { accepted: true; message: BridgeMessage; ignored?: boolean }
  | { accepted: false; reason: BridgeReason; outcome?: BridgeOutcome }
export interface FrameSessionOptions {
  frameId: string
  nonce: string
  /** Host-reviewed exports, intersected with actual names reported by the frame. */
  requestedExports: readonly string[]
  now?: () => number
  limits?: Partial<BridgeLimits>
  onRevoke(reason: BridgeReason | FrameFailureCode): void
}
const parentTypes = new Set(['init', 'mount', 'result', 'context', 'dispose'])
/** Pure protocol/lifecycle controller; it has no window, network, registry or service authority. */
export function createFrameSession(options: FrameSessionOptions) {
  const { frameId, nonce, onRevoke } = options
  if (options.limits && Object.keys(options.limits).some(key => !Object.hasOwn(BRIDGE_LIMITS, key))) throw new Error('Invalid bridge limit')
  const limits = { ...BRIDGE_LIMITS, ...options.limits }
  for (const key of Object.keys(BRIDGE_LIMITS) as (keyof typeof BRIDGE_LIMITS)[]) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0 || limits[key] > BRIDGE_LIMITS[key]) throw new Error('Invalid bridge limit')
  }
  if (!parseWindowMessage({ bridge_version: 1, type: 'ready-window', frame_id: frameId, nonce: nonce }).accepted || options.requestedExports.length > 256 || options.requestedExports.some(name => !name || utf8Bytes(name) > 256) || new Set(options.requestedExports).size !== options.requestedExports.length) throw new Error('Invalid frame session')
  const now = options.now ?? (() => performance.now()), start = now()
  let phase: FramePhase = 'prepared', parentSeq = 0, frameSeq = 0, lastId = 0n, exports: readonly string[] = Object.freeze([])
  let mounted = false, tokens = limits.burst, tokenAt = start, controlTokens = limits.burst, controlAt = start
  let initializedSent = false
  const requested = new Set(options.requestedExports)
  const pending = new Map<string, { started: boolean; deadline: number; cancelled: boolean }>()
  const rejected: number[] = []
  function revoke(reason: BridgeReason | FrameFailureCode) {
    if (phase === 'revoked' || phase === 'disposed') return
    phase = 'revoked'
    // Fence first, then notify the owner; notification failures never restore authority.
    pending.clear()
    try { onRevoke(reason) } catch { /* authority is already fenced */ }
  }
  function fail(reason: BridgeReason): SessionReceipt { revoke(reason); return { accepted: false, reason } }
  function rejectRate(time: number): SessionReceipt {
    rejected.push(time); while (rejected.length && rejected[0]! < time - 10_000) rejected.shift()
    if (rejected.length >= 3) return fail('rate-limited')
    return { accepted: false, reason: 'rate-limited', outcome: { status: 'refused', reason: 'rate-limited' } }
  }
  return {
    get phase(): FramePhase { return phase },
    get exports(): readonly string[] { return exports },
    get pendingCount() { return pending.size },
    beginBinding() { if (phase !== 'prepared') return false; phase = 'binding'; return true },
    revoke,
    dispose() { revoke('disposed'); phase = 'disposed' },
    /** The transport drops a disposed port before parsing any stale bytes. */
    accept(direction: BridgeDirection, raw: unknown): SessionReceipt {
      if (phase === 'revoked' || phase === 'disposed') return { accepted: false, reason: 'disposed' }
      const time = now()
      if (phase !== 'ready' && time - start >= limits.handshakeMs) return fail('handshake-failed')
      const parsed = parseBridgeMessage(raw, limits)
      if (!parsed.accepted) return fail(parsed.reason)
      const m = parsed.message
      if (m.frame_id !== frameId || m.nonce !== nonce) return fail('stale-frame')
      if (parentTypes.has(m.type) !== (direction === 'parent')) return fail('invalid-message')
      if (m.seq <= (direction === 'parent' ? parentSeq : frameSeq)) return fail('invalid-message')
      if (direction === 'parent') parentSeq = m.seq; else frameSeq = m.seq
      switch (m.type) {
        case 'bound': if (phase !== 'binding') return fail('invalid-message'); phase = 'initializing'; break
        case 'init':
          if (phase !== 'initializing' || mounted) return fail('invalid-message')
          // init is tracked separately from adoption/mount; a second init is never allowed.
          if (initializedSent) return fail('invalid-message')
          initializedSent = true; break
        case 'initialized':
          if (phase !== 'initializing' || !initializedSent) return fail('invalid-message')
          exports = Object.freeze(m.exports.filter(name => requested.has(name))); phase = 'initialized'; break
        case 'mount':
          if (phase !== 'initialized' || mounted || !exports.includes(m.export)) return fail('invalid-message')
          mounted = true; break
        case 'ready': if (phase !== 'initialized' || !mounted) return fail('invalid-message'); phase = 'ready'; break
        case 'invoke': {
          if (phase !== 'ready' || BigInt(m.id) <= lastId) return fail('invalid-message')
          lastId = BigInt(m.id)
          tokens = Math.min(limits.burst, tokens + Math.max(0, time - tokenAt) / 1000 * limits.invokesPerSecond); tokenAt = time
          if (pending.size >= limits.pending || tokens < 1) return rejectRate(time)
          tokens--
          pending.set(m.id, { started: false, deadline: time + limits.callMs, cancelled: false }); break
        }
        case 'result':
          if (phase !== 'ready') return fail('invalid-message')
          if (!pending.has(m.id)) return { accepted: true, message: m, ignored: true }
          pending.delete(m.id); break
        case 'cancel': {
          if (phase !== 'ready') return fail('invalid-message')
          controlTokens = Math.min(limits.burst, controlTokens + Math.max(0, time - controlAt) / 1000 * limits.invokesPerSecond); controlAt = time
          if (controlTokens < 1) return fail('rate-limited'); controlTokens--
          const call = pending.get(m.id)
          if (!call) return { accepted: true, message: m, ignored: true }
          call.cancelled = true; break
        }
        case 'context': if (phase !== 'ready') return fail('invalid-message'); break
        case 'dispose': revoke(m.reason); break
        case 'failed': revoke(m.code); break
      }
      return { accepted: true, message: m }
    },
    markExecuting(id: string): boolean {
      const call = pending.get(id)
      if (phase !== 'ready' || !call || call.cancelled || now() >= call.deadline) return false
      call.started = true; return true
    },
    /** Cancellation/deadline after effect execution began is explicitly uncertain. No retries. */
    interrupt(id: string, cause: 'cancelled' | 'timeout'): BridgeOutcome | undefined {
      const call = pending.get(id); if (!call) return undefined
      call.cancelled = true
      return Object.freeze({ status: call.started ? 'unknown-outcome' : cause })
    },
    expired(): readonly string[] { const time = now(); return [...pending].filter(([, call]) => time >= call.deadline && !call.cancelled).map(([id]) => id) },
    checkHandshake(): boolean { if (!['ready', 'revoked', 'disposed'].includes(phase) && now() - start >= limits.handshakeMs) revoke('handshake-failed'); return phase === 'ready' },
  }
}
