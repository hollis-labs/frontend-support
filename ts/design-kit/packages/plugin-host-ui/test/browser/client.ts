import { createPluginFrameBrowser, type PluginFrameBrowserOptions, type VerifiedUiBundle, type ReviewedFramePlan, type BridgeBinding } from '@hollis-labs/plugin-host-ui/isolation'
import { createPluginHostRuntime, type AppIsolationSnapshot, type ContributionView, type HostScope, type PluginFrameMount } from '@hollis-labs/plugin-host-ui'
import { createSlotCatalog } from '@hollis-labs/plugin-host-ui'
import { createPluginRegistry, bundleDigest, type PluginRegistryResponse, type KindDescriptor, type RegionDescriptor } from '@hollis-labs/plugin-registry'
import { useState, createElement } from 'react'
function store<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return { getSnapshot: () => value, getServerSnapshot: () => value, subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }, set(next: T) { value = next; for (const listener of [...listeners]) listener() } }
}
interface Fixture { pinned?: boolean; bootstrap: string; artifacts: ReviewedFramePlan['artifacts']; imports: ReviewedFramePlan['imports']; plugin: string }
const fixture = await (await fetch('/fixture')).json() as Fixture
const setting = store<AppIsolationSnapshot>({ appId: 'fixture', effectiveMode: 'sandboxed-frame', revision: '1' })
const hostScope: HostScope = { appId: 'fixture', environmentId: 'test', clientId: 'browser' }
const scope = store<HostScope | undefined>(hostScope), invocation = store<Readonly<Record<string, unknown>>>({ caller: 'verified' })
const renderContext = store<Readonly<Record<string, unknown>>>({ label: 'verified' }), events: string[] = [], receipts: unknown[] = []
let failCleanup = false, mainUnmount: (() => void) | undefined
let executionCount = 0, allowed = true, hold = false, completeEffect: (() => void) | undefined
const modalAction = { type: 'modal' as const, region: 'modal.body', entry: { owner_id: 'notes', local_key: 'modal-target' }, props: {} }
const action = { type: 'command' as const, command: 'tools/run', arguments: {} }, bindings: readonly BridgeBinding[] = [{ id: 'run', intent: action }, { id: 'open', intent: modalAction }]
const options: PluginFrameBrowserOptions = {
  document, appId: 'fixture', isolation: setting, bootstrap: fixture.bootstrap,
  ...(fixture.pinned ? { moduleDelivery: { async provision(artifacts, scope, imports, owner) {
    const response = await fetch('/modules', { method: 'POST', body: JSON.stringify({ artifacts, scope, imports, owner }) })
    if (!response.ok) throw new Error('policy-unavailable')
    const urls = await response.json()
    return { urls, release() { void fetch(`/modules/${scope}`, { method: 'DELETE' }) } }
  } } } : {}),
  delivery: { async provision(doc) {
    const response = await fetch('/documents', { method: 'POST', body: JSON.stringify(doc) })
    if (!response.ok) throw new Error('policy-unavailable')
    return { src: new URL(`/frame/${doc.frameId}`, location.href).href, policyAdmitted: true, release() { void fetch(`/frame/${doc.frameId}`, { method: 'DELETE' }); if (failCleanup) throw new Error('fixture-cleanup-failure') } }
  } },
  review(bundle, current) { return { owner: { owner: bundle.owner, generation: bundle.generation, hostInstance: bundle.hostInstance }, digest: bundle.digest, mode: current.effectiveMode, exports: ['View', 'Missing'], artifacts: fixture.artifacts, imports: fixture.imports } },
  allowMainOrigin: () => true,
  isActive(ref) { const entry = registry.get(ref.kind, `${ref.owner}/${ref.key}`); return entry?.owner_generation === ref.generation && entry.hostInstance === ref.hostInstance && entry.isActive() === true },
  isOwnerActive(owner) { return registry.isActive(owner.owner, owner.generation, owner.hostInstance) }, subscribeLeases: listener => registry.subscribe(listener), host: () => runtime,
  bindings: () => bindings, props: (_view, props) => ({ label: typeof props.label === 'string' ? props.label : 'verified' }), diagnostics: reason => events.push(reason),
}
const kinds: Record<string, KindDescriptor> = { widget: { schema_version: 1, metadata_schema: {}, representations: ['component'], regions: ['modal.body'], required_capabilities: [] }, panel: { schema_version: 1, metadata_schema: {}, representations: ['component'], regions: ['body'], required_capabilities: [] }, command: { schema_version: 1, metadata_schema: {}, representations: ['handler'], regions: ['commands'], required_capabilities: [] } }
const regions: Record<string, RegionDescriptor> = { 'modal.body': { kinds: ['widget'], representations: ['component'], context_schema: {}, ordering: 'manifest' }, body: { kinds: ['panel'], representations: ['component'], context_schema: {}, ordering: 'manifest' }, commands: { kinds: ['command'], representations: ['handler'], context_schema: {}, ordering: 'manifest' } }
const registry = createPluginRegistry({ kinds, regions, stylesheets: false, importModule: bundle => frames.importModule(bundle), fetchBundle: async () => new TextEncoder().encode(fixture.plugin) })
const frames = createPluginFrameBrowser(options)
const catalog = createSlotCatalog({ kinds: [
  { kind: 'widget', schemaVersion: 1, representations: ['component'], regions: ['modal.body'], role: 'widget', validate: () => true, project: entry => ({ label: entry.local_key, region: 'modal.body' }) },
  { kind: 'panel', schemaVersion: 1, representations: ['component'], regions: ['body'], role: 'contribution', validate: () => true, project: entry => ({ label: entry.local_key, region: 'body' }) },
  { kind: 'command', schemaVersion: 1, representations: ['handler'], regions: ['commands'], role: 'contribution', validate: () => true, project: entry => ({ label: entry.local_key, region: 'commands' }) },
], regions: [
  { name: 'modal.body', representation: 'component', kinds: ['widget'], widgetKinds: ['widget'], ordering: 'manifest', modal: true },
  { name: 'body', representation: 'component', kinds: ['panel'], widgetKinds: [], ordering: 'manifest', actions: { cardinality: 'optional', allowedTags: ['command', 'modal'] } },
  { name: 'commands', representation: 'handler', kinds: ['command'], widgetKinds: [], ordering: 'manifest' },
], reserved: () => false })
const runtime = createPluginHostRuntime({ registry, scope: hostScope, isolation: setting, frameController: frames, renderContext, panels: { reconcile() {}, releaseScope() {} }, diagnostics: event => events.push(event.reason), catalog,
  actions: { scope, invocation, bindings: { resolve: (_source, id) => id === 'run' ? action : id === 'open' ? modalAction : undefined },
    async validate() { return allowed ? { status: 'success' } : { status: 'refused', reason: 'denied' } },
    async command(_intent, _context, signal) { executionCount++; events.push('executing'); signal.addEventListener('abort', () => events.push('adapter-aborted'), { once: true }); if (hold) await new Promise<void>(resolve => { completeEffect = resolve }); return { status: 'success' } },
    async navigate() { return { status: 'refused', reason: 'unsupported-action' } }, async modal() { const previous = document.activeElement as HTMLElement | null; const dialog = document.createElement('dialog'); const close = document.createElement('button'); close.textContent = 'Close parent modal'; close.onclick = () => { dialog.close(); dialog.remove(); previous?.focus() }; dialog.append(close); document.body.append(dialog); dialog.showModal(); close.focus(); return { status: 'success' } },
  },
})
const release = runtime.retain(), surfaces: PluginFrameMount[] = [], views: ContributionView[] = []
let revision = 0, generation = 0
async function load(mode: AppIsolationSnapshot['effectiveMode'] = 'sandboxed-frame') {
  mainUnmount?.(); mainUnmount = undefined
  setting.set({ appId: 'fixture', effectiveMode: mode, revision: String(++generation) })
  const digest = await bundleDigest(new TextEncoder().encode(fixture.plugin))
  const response: PluginRegistryResponse = { registry_version: 2, host_instance: 'fixture-host', revision: ++revision, plugins: {
    notes: { owner_generation: String(generation), bundle_url: '/changed-plugin.js', bundle_version: digest }, tools: { owner_generation: `tools-${generation}` },
  }, kinds, regions, contributions: {
    widget: { 'notes/modal-target': { owner_id: 'notes', owner_generation: String(generation), local_key: 'modal-target', kind: 'widget', schema_version: 1, required: false, status: 'accepted', representation: 'component', metadata: {}, component: { export: 'View', region: 'modal.body' } } },
    panel: Object.fromEntries(['first', 'second', 'missing'].map(key => [`notes/${key}`, { owner_id: 'notes', owner_generation: String(generation), local_key: key, kind: 'panel', schema_version: 1, required: false, status: 'accepted', representation: 'component', metadata: {}, component: { export: key === 'missing' ? 'Missing' : 'View', region: 'body' } }])),
    command: { 'tools/run': { owner_id: 'tools', owner_generation: `tools-${generation}`, local_key: 'run', kind: 'command', schema_version: 1, required: false, status: 'accepted', representation: 'handler', metadata: {}, handler: { id: 'typed-run' } } },
  }, refusals: [] }
  const result = await runtime.sync(response)
  return result
}
async function mount(key = 'first') {
  const view = runtime.getSnapshot().views.find(view => view.ref.key === key)!
  views.push(view)
  const container = document.createElement('section'); document.body.append(container)
  const surface = frames.mount(container, view, { label: 'verified' }); surfaces.push(surface)
  return surfaces.length - 1
}
Object.assign(globalThis, { fixtureHost: {
  load, mount, events, receipts,
  async forbiddenGraph(code: string) {
    const bytes = new TextEncoder().encode(code)
    try { await frames.importModule({ owner: 'forbidden', generation: '1', hostInstance: 'fixture-host', digest: await bundleDigest(bytes), bytes, sourceUrl: '/changed-plugin.js', signal: new AbortController().signal }); return 'accepted' }
    catch (error) { return error instanceof Error ? error.message : 'refused' }
  },
  info: () => ({ executionCount, frames: document.querySelectorAll('iframe').length, views: runtime.getSnapshot().views.map(view => ({ key: view.ref.key, available: view.availability, current: runtime.isCurrent(view), frozen: Object.isFrozen(view.value), callable: typeof view.value === 'function' })), events: [...events] }),
  oldIsCurrent: () => frames.isCurrent(views[0]!),
  state: (index: number) => surfaces[index]?.getSnapshot(),
  disposeSurface: (index: number) => surfaces[index]?.dispose(),
  update: (index: number, label: string) => surfaces[index]?.update({ label }),
  revoke: () => frames.revokeGeneration({ hostInstance: 'fixture-host', owner: 'notes', generation: String(generation) }),
  unloadTarget: () => registry.unload('tools', `tools-${generation}`),
  unload: () => registry.unload('notes', String(generation)),
  failCleanup: (value: boolean) => { failCleanup = value },
  setAllowed: (value: boolean) => { allowed = value }, setHold: (value: boolean) => { hold = value }, complete: () => completeEffect?.(),
  changeScope: () => scope.set({ ...hostScope, clientId: 'replacement' }), restoreScope: () => scope.set(hostScope), changeInvocation: () => invocation.set({ caller: 'replacement' }),
  mainSingleton: () => { const view = runtime.getSnapshot().views.find(view => view.ref.key === 'first')!; return (view.value as { hook?: unknown }).hook === useState },
  async mainRender() { const view = runtime.getSnapshot().views.find(view => view.ref.key === 'first')!; const { createRoot } = await import('react-dom/client'); const root = createRoot(document.getElementById('main-view')!); root.render(createElement(view.value as React.ComponentType<{ label: string }>, { label: 'main' })); mainUnmount = () => root.unmount() },
  async spoofHandle() { const view = runtime.getSnapshot().views.find(view => view.ref.key === 'first')!; return frames.isCurrent({ ...view, value: Object.freeze({ ...(view.value as object) }) }) },
  async rawImport(overrides: Partial<VerifiedUiBundle>) { const raw = { owner: 'other', generation: 'x', hostInstance: 'fixture-host', digest: await bundleDigest(new TextEncoder().encode(fixture.plugin)), bytes: new TextEncoder().encode(fixture.plugin), sourceUrl: '/changed-plugin.js', signal: new AbortController().signal, ...overrides }; try { await frames.importModule(raw); return 'accepted' } catch (error) { return error instanceof Error ? error.message : 'failed' } },
  shutdown() { for (const surface of surfaces) surface.dispose(); release(); runtime.dispose(); frames.dispose() },
} })
