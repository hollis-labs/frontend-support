import type { PluginJsonObject } from '../actions-contract.js'
import type { AppIsolationSnapshot, ContributionRef, ContributionView, Observable, PluginFrameController, PluginFrameMount, PluginFrameRenderState, PluginHostReader } from '../host.js'
import { BRIDGE_LIMITS, encodeBridgeMessage, parseBridgeMessage, type BridgeArtifact, type BridgeBinding, type BridgeImport, type BridgeMessage, type BridgeOutcome, utf8Bytes } from './protocol.js'
import { artifactModuleUrl, base64Bytes, sha256Bytes, verifyArtifact } from './bytes.js'
import { createFrameNonce, createWindowBinding, type FrameOwner, sameFrameOwner } from './controller.js'
import { createFrameDocument, type FrameDocumentDelivery } from './document.js'
import { admitFrameModuleLocations, type FrameModuleDelivery } from './delivery.js'
import { FRAME_PERMISSIONS, FRAME_SANDBOX } from './csp.js'
import { reviewFrameModule } from './graph.js'
import { createFrameSession } from './session.js'
/** Structural registry importer input; the registry remains the verification/adoption authority. */
export interface VerifiedUiBundle { owner: string; generation: string; hostInstance: string; digest: string; bytes: Uint8Array; sourceUrl: string; signal: AbortSignal }
export interface ReviewedFramePlan {
  readonly owner: FrameOwner
  readonly digest: string
  readonly mode: 'sandboxed-frame' | 'main-origin'
  readonly exports: readonly string[]
  readonly artifacts: readonly BridgeArtifact[]
  readonly imports: readonly BridgeImport[]
  /** Host assurance observation, not a signature verifier supplied by this package. */
  readonly signatureVerified?: boolean
}
export interface PluginFrameBrowserOptions {
  document: Document
  appId: string
  isolation: Observable<AppIsolationSnapshot>
  bootstrap: string
  delivery: FrameDocumentDelivery
  /** Immutable same-origin modules with browser importmap integrity enforcement. */
  moduleDelivery?: FrameModuleDelivery
  /** Host checks reviewed manifest, compatible versions/variant, provenance and install policy. */
  review(bundle: Readonly<VerifiedUiBundle>, setting: AppIsolationSnapshot): ReviewedFramePlan | Promise<ReviewedFramePlan>
  allowMainOrigin?(setting: AppIsolationSnapshot): boolean
  /** Must check live registry/owner authority; source refs never come from frame requests. */
  isActive(ref: ContributionRef): boolean
  isOwnerActive(owner: FrameOwner): boolean
  subscribeLeases(listener: () => void): () => void
  host(): PluginHostReader
  bindings(view: ContributionView): readonly BridgeBinding[]
  /** Target/component schema and allowlisted JSON context projection, with no credentials. */
  props(view: ContributionView, props: Readonly<Record<string, unknown>>): PluginJsonObject
  diagnostics(reason: string, owner?: FrameOwner): void
}
export interface InertFrameExport extends FrameOwner { readonly digest: string; readonly exportName: string }
interface Inventory {
  owner: FrameOwner; digest: string; setting: AppIsolationSnapshot; requestedExports: readonly string[]
  artifacts: readonly BridgeArtifact[]; imports: readonly BridgeImport[]; namespace: Record<string, unknown>
  active: boolean; adopted: boolean; refs: number; sessions: Set<Surface>
}
interface Surface extends PluginFrameMount { readonly initialized: Promise<readonly string[]>; activate(view: ContributionView, props: PluginJsonObject): void; revoke(reason: string): void }
/** One loader/controller per app host. Each surface has an independent opaque realm. */
export function createPluginFrameBrowser(options: PluginFrameBrowserOptions): PluginFrameController & {
  importModule(bundle: VerifiedUiBundle): Promise<Record<string, unknown>>
  revokeGeneration(owner: FrameOwner): void
  dispose(): void
} {
  const win = options.document.defaultView
  if (!win) throw new Error('policy-unavailable')
  const records = new Map<string, Inventory>(), handles = new WeakMap<object, Inventory>(), listeners = new Set<() => void>()
  let disposed = false
  const releases: (() => void)[] = []
  const key = (owner: FrameOwner) => JSON.stringify([owner.hostInstance, owner.owner, owner.generation])
  const report = (reason: string, owner?: FrameOwner) => { try { options.diagnostics(reason, owner) } catch { /* no authority in telemetry */ } }
  function emit() { for (const listener of [...listeners]) { try { listener() } catch { report('subscriber-failed') } } }
  function setting(): AppIsolationSnapshot {
    const snapshot = options.isolation.getSnapshot()
    if (disposed || snapshot.appId !== options.appId || !snapshot.revision || !['sandboxed-frame', 'main-origin'].includes(snapshot.effectiveMode)) throw new Error('missing-effective-mode')
    return Object.freeze({ ...snapshot })
  }
  function current(record: Inventory): boolean {
    try { const effective = setting(); return record.active && effective.revision === record.setting.revision && effective.effectiveMode === record.setting.effectiveMode } catch { return false }
  }
  function revoke(record: Inventory, reason: string) {
    if (!record.active) return
    record.active = false // generation fence precedes every cleanup and replacement
    for (const surface of [...record.sessions]) surface.revoke(reason)
    record.refs--; if (record.refs === 0) record.artifacts = Object.freeze([])
    record.namespace = Object.freeze({})
    emit()
  }
  function live(view: ContributionView): Inventory | undefined {
    if (!view.value || typeof view.value !== 'object') return
    const record = handles.get(view.value), handle = view.value as InertFrameExport
    if (!record || !current(record) || handle.digest !== record.digest || !sameFrameOwner(handle, view.ref) || !options.isActive(view.ref)) return
    return record
  }
  function makeSurface(record: Inventory, parent: HTMLElement, initialBindings: readonly BridgeBinding[], verification: boolean): Surface {
    if (!current(record)) throw new Error('stale-frame')
    const frameId = createFrameNonce(), nonce = createFrameNonce(), iframe = options.document.createElement('iframe')
    iframe.setAttribute('sandbox', FRAME_SANDBOX); iframe.setAttribute('allow', FRAME_PERMISSIONS); iframe.referrerPolicy = 'no-referrer'
    iframe.title = verification ? 'Plugin export verification' : 'Plugin view'
    if (verification) iframe.hidden = true
    let state: PluginFrameRenderState = Object.freeze({ status: 'loading' }), port: MessagePort | undefined, seq = 0, revision = 0, armed = false, loaded = false, ended = false
    let view: ContributionView | undefined, deliveryRelease: (() => void) | undefined, moduleRelease: (() => void) | undefined, mountProps: PluginJsonObject = {}
    const bindingRows = initialBindings
    let resolveInitialized!: (exports: readonly string[]) => void, rejectInitialized!: (error: Error) => void
    const initialized = new Promise<readonly string[]>((resolve, reject) => { resolveInitialized = resolve; rejectInitialized = reject })
    // Mount starts before callers can await; keep a rejection observed during early disposal.
    void initialized.catch(() => {})
    const observers = new Set<() => void>(), calls = new Map<string, { controller: AbortController; done: boolean; timer: ReturnType<typeof setTimeout> }>()
    const cleanups: (() => void)[] = []
    record.refs++
    const session = createFrameSession({ frameId, nonce, requestedExports: record.requestedExports, onRevoke: reason => finish(reason) })
    function notify() { for (const observer of [...observers]) { try { observer() } catch { report('subscriber-failed', record.owner) } } }
    function finish(reason: string) {
      if (ended) return
      ended = true; state = Object.freeze({ status: 'failed', reason })
      session.revoke(reason === 'disposed' ? 'disposed' : 'stale-frame')
      for (const call of calls.values()) { clearTimeout(call.timer); call.controller.abort(); call.done = true }
      calls.clear()
      rejectInitialized(new Error(reason))
      for (const cleanup of cleanups.reverse()) { try { cleanup() } catch { report('cleanup-incomplete', record.owner) } }
      cleanups.length = 0
      try { port?.close() } catch { report('cleanup-incomplete', record.owner) }
      try { iframe.remove() } catch { report('cleanup-incomplete', record.owner) }
      try { deliveryRelease?.() } catch { report('cleanup-incomplete', record.owner) }
      try { moduleRelease?.() } catch { report('cleanup-incomplete', record.owner) }
      moduleRelease = undefined
      record.sessions.delete(surface); record.refs--; if (!record.active && record.refs === 0) record.artifacts = Object.freeze([])
      notify()
    }
    function send(fields: object, unchecked = false) {
      if (ended || !port) return
      const raw = encodeBridgeMessage({ bridge_version: 1, frame_id: frameId, nonce, seq: ++seq, ...fields } as BridgeMessage)
      if (!unchecked && !session.accept('parent', raw).accepted) return
      port.postMessage(raw)
    }
    function complete(id: string, outcome: BridgeOutcome) {
      const call = calls.get(id)
      if (!call || call.done || ended) return
      call.done = true; clearTimeout(call.timer); calls.delete(id)
      send({ type: 'result', id, outcome })
    }
    function cancel(id: string, cause: 'cancelled' | 'timeout') {
      const call = calls.get(id), outcome = session.interrupt(id, cause)
      if (!call || !outcome) return
      call.controller.abort(); complete(id, outcome)
    }
    async function invoke(message: Extract<BridgeMessage, { type: 'invoke' }>) {
      if (verification || !view || !live(view) || !bindingRows.some(binding => binding.id === message.binding)) { send({ type: 'result', id: message.id, outcome: { status: 'refused', reason: 'unsupported-action' } }); return }
      const controller = new AbortController()
      const timer = setTimeout(() => cancel(message.id, 'timeout'), BRIDGE_LIMITS.callMs)
      calls.set(message.id, { controller, done: false, timer })
      try {
        const result = await options.host().dispatchBoundAction(message.binding, message.intent, view.ref, controller.signal, () => !!view && !!live(view) && session.markExecuting(message.id))
        if (controller.signal.aborted) return
        if (result.status === 'refused' && ['cancelled', 'stale-owner', 'absent-scope', 'host-failed'].includes(result.reason)) { const uncertain = session.interrupt(message.id, 'cancelled'); if (uncertain && (result.reason !== 'host-failed' || uncertain.status === 'unknown-outcome')) { complete(message.id, uncertain); return } }
        complete(message.id, result.status === 'success' ? { status: 'success' } : { status: 'refused', reason: result.reason, action_reason: result.reason })
      } catch { const uncertain = session.interrupt(message.id, 'cancelled'); complete(message.id, uncertain?.status === 'unknown-outcome' ? uncertain : { status: 'refused', reason: 'host-failed' }) }
    }
    function receive(event: MessageEvent) {
      if (ended) return
      if (event.ports.length) { for (const extra of event.ports) extra.close(); finish('invalid-message'); return }
      const parsed = parseBridgeMessage(event.data)
      const receipt = session.accept('frame', event.data)
      if (!receipt.accepted) {
        if (receipt.outcome && parsed.accepted && parsed.message.type === 'invoke') send({ type: 'result', id: parsed.message.id, outcome: receipt.outcome }, true)
        return
      }
      if (receipt.ignored) return
      const m = receipt.message
      switch (m.type) {
        case 'bound': send({ type: 'init', artifacts: record.artifacts, imports: record.imports, context: {}, bindings: bindingRows }); break
        case 'initialized': resolveInitialized(session.exports); break
        case 'ready':
          if (verification || !view || !live(view)) { finish('stale-frame'); return }
          state = Object.freeze({ status: 'ready' }); notify(); break
        case 'invoke': void invoke(m); break
        case 'cancel': cancel(m.id, 'cancelled'); break
        case 'failed': finish(m.code); break
      }
    }
    function windowReady(event: MessageEvent) {
      if (ended || !iframe.contentWindow) return
      const gate = windowGate ??= createWindowBinding({ frameWindow: iframe.contentWindow, frameId, nonce, active: () => !ended && current(record) })
      if (!gate.acceptReady(event)) return
      win!.removeEventListener('message', windowReady)
      const channel = new MessageChannel(); port = channel.port1
      port.onmessage = receive; port.onmessageerror = () => finish('invalid-message'); port.start()
      iframe.contentWindow.postMessage({ bridge_version: 1, frame_id: frameId, nonce, type: 'bind-window' }, '*', [channel.port2])
    }
    let windowGate: ReturnType<typeof createWindowBinding> | undefined
    function navigation() { if (!armed) return; if (loaded) finish('stale-frame'); loaded = true }
    win!.addEventListener('message', windowReady); cleanups.push(() => win!.removeEventListener('message', windowReady))
    iframe.addEventListener('load', navigation); cleanups.push(() => iframe.removeEventListener('load', navigation))
    const deadline = setInterval(() => { session.checkHandshake(); for (const id of session.expired()) cancel(id, 'timeout') }, 100)
    cleanups.push(() => clearInterval(deadline))
    session.beginBinding()
    const surface: Surface = {
      initialized,
      getSnapshot: () => state, getServerSnapshot: () => Object.freeze({ status: 'loading' as const }),
      subscribe(listener) { observers.add(listener); return () => { observers.delete(listener) } },
      update(props) {
        if (ended || !view) return
        if (!live(view)) { finish('stale-frame'); return }
        mountProps = options.props(view, props)
        for (const id of [...calls.keys()]) cancel(id, 'cancelled')
        if (session.phase === 'ready') send({ type: 'context', revision: String(++revision), value: mountProps })
      },
      activate(contribution, props) {
        if (ended || verification || session.phase !== 'initialized' || !live(contribution) || !session.exports.includes((contribution.value as InertFrameExport).exportName)) { finish('stale-frame'); return }
        view = contribution; mountProps = props
        send({ type: 'mount', export: (view.value as InertFrameExport).exportName, props: mountProps, context_revision: String(++revision) })
      },
      revoke: finish,
      dispose() { finish('disposed'); session.dispose(); observers.clear() },
    }
    record.sessions.add(surface)
    void (async () => {
      try {
        const provisioned = options.moduleDelivery ? await options.moduleDelivery.provision(record.artifacts, frameId, record.imports, record.owner) : undefined
        if (ended || !current(record)) { provisioned?.release(); finish('stale-frame'); return }
        if (provisioned) moduleRelease = provisioned.release
        const modules = provisioned ? await admitFrameModuleLocations(record.artifacts, provisioned.urls, win!.location.origin, record.imports) : undefined
        const document = await createFrameDocument(options.bootstrap, { frameId, nonce, parentOrigin: win!.location.origin, modules })
        if (ended || !current(record)) { finish('stale-frame'); return }
        const delivery = await options.delivery.provision(document)
        if (ended || !current(record)) { delivery.release(); finish('stale-frame'); return }
        deliveryRelease = delivery.release
        if ((modules && delivery.srcdoc !== undefined) || delivery.policyAdmitted !== true || (!!delivery.src === (delivery.srcdoc !== undefined))) { finish('policy-unavailable'); return }
        if (modules) {
          const url = new URL(delivery.src!)
          if (url.origin !== win!.location.origin || url.username || url.password || url.search || url.hash || url.href !== delivery.src) { finish('policy-unavailable'); return }
        }
        armed = true
        if (delivery.srcdoc !== undefined) iframe.srcdoc = delivery.srcdoc
        else iframe.src = delivery.src
        parent.append(iframe)
      } catch { finish('policy-unavailable') }
    })()
    return surface
  }
  const controller = {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    isCurrent(view: ContributionView) { try { return !!live(view) } catch { return false } },
    mount(parent: HTMLElement, view: ContributionView, props: Readonly<Record<string, unknown>>): PluginFrameMount {
      const record = live(view); if (!record) throw new Error('stale-frame')
      // Digest/inventory are private immutable snapshots; verify again for this session.
      let latestProps = props
      const surface = makeSurface(record, parent, options.bindings(view), false)
      void (async () => {
        try {
          for (const artifact of record.artifacts) await verifyArtifact(artifact)
          const exports = await surface.initialized
          if (!exports.includes((view.value as InertFrameExport).exportName) || !live(view)) { surface.revoke('missing-export'); return }
          surface.activate(view, options.props(view, latestProps))
        } catch { surface.revoke('digest-mismatch') }
      })()
      return { ...surface, update(next) { latestProps = next; surface.update(next) } }
    },
    async importModule(input: VerifiedUiBundle): Promise<Record<string, unknown>> {
      const effective = setting(), bytes = new Uint8Array(input.bytes), bundle = Object.freeze({ ...input, bytes })
      input = bundle
      if (input.signal.aborted || bytes.length > BRIDGE_LIMITS.artifactBytes || !/^sha256:[a-f0-9]{64}$/u.test(input.digest) || `sha256:${await sha256Bytes(bytes)}` !== input.digest) throw new Error('digest-mismatch')
      const reviewed = await options.review(bundle, effective)
      if (!sameFrameOwner(reviewed.owner, { hostInstance: input.hostInstance, owner: input.owner, generation: input.generation, kind: '', key: '' }) || reviewed.digest !== input.digest || reviewed.mode !== effective.effectiveMode) throw new Error('unsupported-variant')
      const integrityProbeBytes = new TextEncoder().encode('export const integrityProbe = true;')
      const integrityProbe: BridgeArtifact = Object.freeze({ id: 'integrity-probe', kind: 'module', sha256: await sha256Bytes(integrityProbeBytes), base64: base64Bytes(integrityProbeBytes) })
      if (options.moduleDelivery && reviewed.artifacts.some(artifact => artifact.id === integrityProbe.id || artifact.id === 'integrity-positive-probe')) throw new Error('unsupported-variant')
      const plugin: BridgeArtifact = Object.freeze({ id: 'plugin', kind: 'module', sha256: input.digest.slice(7), base64: base64Bytes(bytes) })
      const parsed = parseBridgeMessage(encodeBridgeMessage({ bridge_version: 1, frame_id: 'inventory', nonce: '0'.repeat(64), seq: 1, type: 'init', artifacts: [...reviewed.artifacts, plugin, ...(options.moduleDelivery ? [integrityProbe, Object.freeze({ ...integrityProbe, id: 'integrity-positive-probe' })] : [])], imports: reviewed.imports, bindings: [], context: {} }))
      if (!parsed.accepted || parsed.message.type !== 'init') throw new Error('invalid-message')
      const { artifacts, imports } = parsed.message, specifiers = imports.map(row => row.specifier)
      for (const artifact of artifacts) { const verified = await verifyArtifact(artifact); if (artifact.kind === 'module') await reviewFrameModule(verified, specifiers) }
      if (!['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'].every(name => specifiers.includes(name))) throw new Error('unsupported-variant')
      if (input.signal.aborted || setting().revision !== effective.revision || setting().effectiveMode !== effective.effectiveMode) throw new Error('stale-frame')
      if (effective.effectiveMode === 'main-origin' && options.allowMainOrigin?.(effective) !== true) throw new Error('unsupported-variant')
      if (reviewed.exports.length > 256 || reviewed.exports.some(name => typeof name !== 'string' || !name || utf8Bytes(name) > 256) || new Set(reviewed.exports).size !== reviewed.exports.length) throw new Error('unsupported-variant')
      const owner = Object.freeze({ hostInstance: input.hostInstance, owner: input.owner, generation: input.generation })
      if (records.has(key(owner))) throw new Error('stale-frame')
      for (const old of records.values()) if (old.owner.owner === input.owner && old.active) revoke(old, 'stale-frame')
      const record: Inventory = { owner, digest: input.digest, setting: effective, requestedExports: Object.freeze([...reviewed.exports]), artifacts, imports, namespace: Object.freeze({}), active: true, adopted: false, refs: 1, sessions: new Set() }
      records.set(key(owner), record)
      if (!reviewed.signatureVerified) report('unsigned', owner)
      if (effective.effectiveMode === 'main-origin') {
        if (options.moduleDelivery) { revoke(record, 'unsupported-variant'); throw new Error('unsupported-variant') }
        report('main-origin-ambient-authority', owner)
        try {
          const namespace = await import(/* @vite-ignore */ artifactModuleUrl(plugin, key(owner))) as Record<string, unknown>
          if (!current(record) || input.signal.aborted) throw new Error('stale-frame')
          record.namespace = namespace; return namespace
        } catch (error) { revoke(record, 'import-failed'); throw error }
      }
      const verification = makeSurface(record, options.document.body, [], true), abort = () => revoke(record, 'stale-frame')
      input.signal.addEventListener('abort', abort, { once: true })
      try {
        const exports = await verification.initialized
        if (!current(record) || input.signal.aborted) throw new Error('stale-frame')
        record.namespace = Object.freeze(Object.fromEntries(exports.map(exportName => {
          const handle: InertFrameExport = Object.freeze({ ...owner, digest: record.digest, exportName }); handles.set(handle, record); return [exportName, handle]
        })))
        return record.namespace
      } catch (error) { revoke(record, 'handshake-failed'); throw error }
      finally { input.signal.removeEventListener('abort', abort); verification.dispose() }
    },
    revokeGeneration(owner: FrameOwner) { const record = records.get(key(owner)); if (record) revoke(record, 'stale-frame') },
    dispose() { if (disposed) return; disposed = true; for (const record of records.values()) revoke(record, 'disposed'); for (const release of releases.reverse()) { try { release() } catch { report('cleanup-incomplete') } } records.clear(); listeners.clear() },
  }
  releases.push(options.isolation.subscribe(() => { for (const record of records.values()) if (!current(record)) revoke(record, 'stale-frame') }))
  releases.push(options.subscribeLeases(() => {
    for (const record of records.values()) {
      if (options.isOwnerActive(record.owner)) record.adopted = true
      else if (record.adopted) revoke(record, 'stale-frame')
    }
    emit()
  }))
  return controller
}
