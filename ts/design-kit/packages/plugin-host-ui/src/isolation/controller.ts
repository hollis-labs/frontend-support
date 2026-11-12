import { parseWindowMessage, type BridgeReason } from './protocol.js'
import type { ContributionRef } from '../host.js'
export interface FrameOwner { readonly hostInstance: string; readonly owner: string; readonly generation: string }
export function sameFrameOwner(owner: FrameOwner, source: ContributionRef): boolean {
  return owner.hostInstance === source.hostInstance && owner.owner === source.owner && owner.generation === source.generation
}
/** No fallback PRNG. Callers may supply a platform cryptographic provider for testing. */
export function createFrameNonce(random: Pick<Crypto, 'getRandomValues'> | undefined = globalThis.crypto): string {
  if (!random?.getRandomValues) throw new Error('secure-randomness-unavailable')
  const bytes = new Uint8Array(32); random.getRandomValues(bytes)
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}
export interface BootstrapEvent {
  source: unknown
  origin: string
  data: unknown
  ports: readonly { close(): void }[]
}
/** Parent-side authentication only. There is no window-message action dispatch. */
export function createWindowBinding(options: { frameWindow: unknown; frameId: string; nonce: string; active(): boolean }) {
  const { frameWindow, frameId, nonce, active } = options
  let bound = false
  return {
    acceptReady(event: BootstrapEvent): boolean {
      if (bound || !frameWindow || !active() || event.source !== frameWindow || event.origin !== 'null') return false
      if (event.ports.length) { for (const port of event.ports) { try { port.close() } catch { /* close all unexpected ports */ } } return false }
      const parsed = parseWindowMessage(event.data)
      if (!parsed.accepted || parsed.message.type !== 'ready-window' || parsed.message.frame_id !== frameId || parsed.message.nonce !== nonce) return false
      bound = true; return true
    },
  }
}
/** Reverse acquisition cleanup always begins by fencing authority. */
export function createFrameResources(fence: () => void, report: (reason: BridgeReason | 'cleanup-failed') => void) {
  let disposed = false
  const releases: (() => void)[] = []
  return {
    acquire(release: () => void) { if (disposed) { release(); return false } releases.push(release); return true },
    dispose() {
      if (disposed) return
      disposed = true
      try { fence() } catch { try { report('cleanup-failed') } catch { /* telemetry is not authority */ } }
      for (const release of releases.reverse()) { try { release() } catch { try { report('cleanup-failed') } catch { /* keep cleaning */ } } }
      releases.length = 0
    },
  }
}

/** Frame-side bootstrap authentication: exactly one port from the pinned parent. */
export function createFrameWindowBinding(options: { parentWindow: unknown; parentOrigin: string; frameId: string; nonce: string; active(): boolean }) {
  const { parentWindow, parentOrigin, frameId, nonce, active } = options
  let bound = false
  return {
    acceptBind(event: BootstrapEvent): BootstrapEvent['ports'][number] | undefined {
      const parsed = parseWindowMessage(event.data)
      if (!bound && parentWindow && parentOrigin !== '*' && parentOrigin !== 'null' && active() && event.source === parentWindow && event.origin === parentOrigin &&
        parsed.accepted && parsed.message.type === 'bind-window' && parsed.message.frame_id === frameId && parsed.message.nonce === nonce && event.ports.length === 1) {
        bound = true; return event.ports[0]
      }
      for (const port of event.ports) { try { port.close() } catch { /* close every rejected port */ } }
      return undefined
    },
  }
}
