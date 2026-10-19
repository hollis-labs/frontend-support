import { createFrameWindowBinding } from './controller.js'
import { parseWindowMessage, parseBridgeMessage, encodeBridgeMessage, BRIDGE_LIMITS, type BridgeMessage, type BridgeBinding, type BridgeOutcome } from './protocol.js'
import { artifactModuleUrl, verifyArtifact } from './bytes.js'
import { admitFrameModuleLocations, type FrameModuleLocations } from './delivery.js'
/** Bundled as a fixed classic bootstrap before any plugin executes. No host service authority. */
export function startFrameBootstrap() {
  const configuration = document.getElementById('plugin-frame-config')?.textContent
  if (!configuration) return
  const config = JSON.parse(configuration) as { bridge_version: number; frame_id: string; nonce: string; parent_origin: string; modules?: FrameModuleLocations }
  if (!parseWindowMessage({ bridge_version: config.bridge_version, frame_id: config.frame_id, nonce: config.nonce, type: 'ready-window' }).accepted) return
  const documentNonce = (document.currentScript as HTMLScriptElement | null)?.nonce
  let port: MessagePort | undefined, sent = 0, received = 0, phase: 'binding' | 'initializing' | 'initialized' | 'ready' | 'disposed' = 'binding'
  let module: Record<string, unknown>, render: ((props: Record<string, unknown>) => void) | undefined, unmount: (() => void) | undefined
  let bindings: readonly BridgeBinding[] = [], context: Record<string, unknown> = {}, props: Record<string, unknown> = {}, nextId = 0n
  const pending = new Map<string, (outcome: BridgeOutcome) => void>()
  const binding = createFrameWindowBinding({ parentWindow: parent, parentOrigin: config.parent_origin, frameId: config.frame_id, nonce: config.nonce, active: () => phase === 'binding' })
  function send(fields: object) {
    port?.postMessage(encodeBridgeMessage({ bridge_version: 1, frame_id: config.frame_id, nonce: config.nonce, seq: ++sent, ...fields } as BridgeMessage))
  }
  const isDisposed = () => phase === 'disposed'
  function dispose() {
    if (phase === 'disposed') return
    phase = 'disposed'; removeEventListener('message', bind)
    try { unmount?.() } finally { for (const resolve of pending.values()) resolve({ status: 'cancelled' }); pending.clear(); port?.close(); document.body.replaceChildren() }
  }
  function fail(code: 'invalid-message' | 'digest-mismatch' | 'import-failed' | 'mount-failed' | 'policy-unavailable') {
    try { send({ type: 'failed', code }) } finally { dispose() }
  }
  async function initialize(message: Extract<BridgeMessage, { type: 'init' }>) {
    try {
      const delivered = config.modules ? await admitFrameModuleLocations(message.artifacts, config.modules.urls, config.parent_origin, message.imports) : undefined
      if (delivered && JSON.stringify(delivered.imports) !== JSON.stringify(config.modules!.imports)) return fail('policy-unavailable')
      const urls: Record<string, string> = Object.create(null)
      let probeSize = 0
      for (const artifact of message.artifacts) {
        const bytes = await verifyArtifact(artifact)
        if (phase === 'disposed') return
        if (artifact.id === 'integrity-probe') probeSize = bytes.byteLength
        if (artifact.kind === 'module') urls[artifact.id] = delivered ? delivered.urls[artifact.id] : artifactModuleUrl(artifact, config.frame_id)
        else { const style = document.createElement('style'); style.textContent = new TextDecoder('utf-8', { fatal: true }).decode(bytes); document.head.append(style) }
      }
      if (!urls.plugin || !documentNonce) return fail('policy-unavailable')
      const probeUrl = delivered?.urls['integrity-probe']
      if (delivered && (!probeUrl || !delivered.urls['integrity-positive-probe'])) return fail('policy-unavailable')
      const integrity = delivered ? { ...delivered.integrity, [probeUrl!]: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' } : undefined
      const imports = Object.fromEntries(message.imports.map(entry => [entry.specifier, urls[entry.artifact]]))
      const map = document.createElement('script'); map.type = 'importmap'; map.nonce = documentNonce; map.textContent = JSON.stringify({ imports, ...(delivered ? { integrity } : {}) }); document.head.append(map)
      // Importmap installation is complete. Do not expose the bootstrap nonce
      // to arbitrary plugin code: parsed/header CSP remains enforced after
      // removing its metadata and nonce attributes from the document.
      for (const script of Array.from(document.scripts)) { script.nonce = ''; script.removeAttribute('nonce') }
      for (const meta of Array.from(document.querySelectorAll('meta[http-equiv]'))) {
        if (meta.getAttribute('http-equiv')?.toLowerCase() === 'content-security-policy') meta.remove()
      }
      if (probeUrl) {
        // A harmless package-owned module must fail SRI before any plugin executes.
        // Browsers which ignore importmap integrity fail closed here.
        // Delivery must provide exact probe bytes/headers with TAO. A network,
        // missing-route or policy error is not evidence of integrity enforcement.
        await import(/* @vite-ignore */ delivered!.urls['integrity-positive-probe'])
        let enforced = false, policyBlocked = false
        const denied = (event: SecurityPolicyViolationEvent) => { if (event.blockedURI === probeUrl) policyBlocked = true }
        addEventListener('securitypolicyviolation', denied)
        try { await import(/* @vite-ignore */ probeUrl) } catch { enforced = true }
        finally { await new Promise(resolve => setTimeout(resolve, 0)); removeEventListener('securitypolicyviolation', denied) }
        const transfer = performance.getEntriesByName(probeUrl, 'resource').at(-1) as PerformanceResourceTiming | undefined
        if (!enforced || policyBlocked || !transfer || transfer.responseStatus !== 200 || transfer.decodedBodySize !== probeSize) return fail('policy-unavailable')
      }
      context = message.context; bindings = message.bindings
      const sdk = Object.freeze({
        bindings,
        invoke(id: string, intent: unknown): Promise<BridgeOutcome> {
          if (phase !== 'ready') return Promise.resolve({ status: 'refused', reason: 'stale-frame' })
          if (pending.size >= BRIDGE_LIMITS.pending) return Promise.resolve({ status: 'refused', reason: 'rate-limited' })
          const call = String(++nextId)
          return new Promise(resolve => {
            pending.set(call, resolve)
            try { send({ type: 'invoke', id: call, binding: id, intent }) }
            catch { pending.delete(call); resolve({ status: 'refused', reason: 'invalid-message' }) }
          })
        },
        cancel(id: string) { if (pending.has(id)) send({ type: 'cancel', id }) },
      })
      Object.defineProperty(globalThis, 'pluginFrame', { value: sdk, writable: false, configurable: false })
      module = await import(/* @vite-ignore */ urls.plugin) as Record<string, unknown>
      if (phase === 'disposed') return
      phase = 'initialized'; send({ type: 'initialized', exports: Object.keys(module) })
    } catch (error) { fail(error instanceof Error && error.message === 'digest-mismatch' ? 'digest-mismatch' : 'import-failed') }
  }
  async function mount(message: Extract<BridgeMessage, { type: 'mount' }>) {
    try {
      if (!Object.hasOwn(module, message.export)) return fail('mount-failed')
      const reactName = 'react', domName = 'react-dom', clientName = 'react-dom/client'
      const React = await import(/* @vite-ignore */ reactName), ReactDOM = await import(/* @vite-ignore */ domName), client = await import(/* @vite-ignore */ clientName)
      if (phase === 'disposed') return
      const target = document.createElement('div'); document.body.append(target)
      const root = client.createRoot(target, { onUncaughtError: () => fail('mount-failed') })
      unmount = () => root.unmount()
      render = next => ReactDOM.flushSync(() => root.render(React.createElement(module[message.export], next)))
      props = message.props; render({ ...props, ...context })
      if (isDisposed()) return
      phase = 'ready'; send({ type: 'ready' })
    } catch { fail('mount-failed') }
  }
  function receive(event: MessageEvent) {
    if (phase === 'disposed') return
    if (event.ports.length) { for (const extra of event.ports) extra.close(); fail('invalid-message'); return }
    const parsed = parseBridgeMessage(event.data)
    if (!parsed.accepted) { fail('invalid-message'); return }
    const m = parsed.message
    if (m.frame_id !== config.frame_id || m.nonce !== config.nonce || m.seq <= received) { fail('invalid-message'); return }
    received = m.seq
    switch (m.type) {
      case 'init': if (phase !== 'initializing') return fail('invalid-message'); phase = 'initialized'; void initialize(m); break
      case 'mount': if (phase !== 'initialized' || !module || render) return fail('invalid-message'); phase = 'initializing'; void mount(m); break
      case 'result': { if (phase !== 'ready') return fail('invalid-message'); const resolve = pending.get(m.id); pending.delete(m.id); resolve?.(m.outcome); break }
      case 'context': if (phase !== 'ready') return fail('invalid-message'); context = m.value; try { render?.(context) } catch { fail('mount-failed') } break
      case 'dispose': dispose(); break
      default: fail('invalid-message')
    }
  }
  function bind(event: MessageEvent) {
    const accepted = binding.acceptBind(event)
    if (!accepted) return
    port = accepted as MessagePort; removeEventListener('message', bind)
    phase = 'initializing'; port.onmessage = receive; port.start(); send({ type: 'bound' })
  }
  addEventListener('message', bind)
  parent.postMessage({ bridge_version: 1, frame_id: config.frame_id, nonce: config.nonce, type: 'ready-window' }, config.parent_origin)
}
