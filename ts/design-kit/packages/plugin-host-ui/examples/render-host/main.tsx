import '@hollis-labs/design-tokens/design-tokens.css'
import { useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { createSlotCatalog, createPluginHostRuntime, type AdoptedEntry, type Observable, type RegistryEntry, type AppIsolationSnapshot, type PluginActionIntent, type HostScope } from '../../src/index.js'
import { PluginHostProvider, PluginPanelBody, WidgetRenderer, usePluginSlots, usePluginAction } from '../../src/react.js'
function externalStore<T>(value: T): Observable<T> & { set(next: T): void } {
  const listeners = new Set<() => void>()
  return { getSnapshot: () => value, getServerSnapshot: () => value,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    set(next) { value = next; for (const listener of listeners) listener() } }
}
const navigation: PluginActionIntent = { type: 'navigate', route: 'example.canvas', parameters: {} }
const selectedRegion = externalStore('example.rail')
const scope: HostScope = { appId: 'example', environmentId: 'development', clientId: 'browser' }
function Panel() { const [count, setCount] = useState(0); return <button onClick={() => setCount(count + 1)}>Owned panel: {count}</button> }
function Widget() { return <p>Owned widget</p> }
const entries: RegistryEntry[] = [
  { owner_id: 'example', owner_generation: '1', local_key: 'panel', kind: 'panel', status: 'accepted', representation: 'component', schema_version: 1, required: false, metadata: { action: navigation }, component: { export: 'Panel', region: 'example.rail' } },
  { owner_id: 'example', owner_generation: '1', local_key: 'widget', kind: 'widget', status: 'accepted', representation: 'component', schema_version: 1, required: false, metadata: {}, component: { export: 'Widget', region: 'example.canvas' } },
]
let revision = 0, current: RegistryEntry[] = []
const listeners = new Set<() => void>()
const registry = {
  async sync(input: readonly RegistryEntry[] | string) {
    if (typeof input === 'string') throw new Error('Example accepts projected entries')
    current = await Promise.resolve([...input]); revision++
    for (const listener of listeners) listener()
  },
  snapshot: () => ({ registryVersion: 2, hostInstance: 'example-epoch', revision, version: revision, contributions: current }),
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  list(kind: string): AdoptedEntry[] { return current.filter(entry => entry.kind === kind).map(entry => ({ ...entry, hostInstance: 'example-epoch', value: entry.local_key === 'panel' ? Panel : Widget, isActive: () => current.includes(entry) })) },
  get(kind: string, key: string) { return this.list(kind).find(entry => `${entry.owner_id}/${entry.local_key}` === key) },
}
// Explicit development override. Production app settings normally choose sandboxed-frame;
// this example supplies no frame controller and cannot render that mode.
const isolation = externalStore<AppIsolationSnapshot>({ appId: 'example', effectiveMode: 'main-origin', revision: 'development' })
const panelStore = new Map<string, readonly string[]>()
const runtime = createPluginHostRuntime({
  scope, registry, isolation,
  renderContext: externalStore<Readonly<Record<string, unknown>>>({}),
  catalog: createSlotCatalog({
    kinds: [
      { kind: 'panel', schemaVersion: 1, role: 'contribution', representations: ['component'], regions: ['example.rail'], validate: entry => JSON.stringify((entry.metadata as { action?: unknown }).action) === JSON.stringify(navigation), project: entry => ({ label: entry.local_key, region: entry.component!.region, action: navigation }) },
      { kind: 'widget', schemaVersion: 1, role: 'widget', representations: ['component'], regions: ['example.canvas'], validate: () => true, project: entry => ({ label: entry.local_key, region: entry.component!.region }) },
    ],
    regions: [
      { name: 'example.rail', representation: 'component', kinds: ['panel'], widgetKinds: [], ordering: 'priority-ascending', actions: { cardinality: 'optional', allowedTags: ['navigate'] } },
      { name: 'example.canvas', representation: 'component', kinds: ['widget'], widgetKinds: ['widget'], ordering: 'manifest' },
    ], reserved: () => false,
  }),
  actions: {
    scope: externalStore<HostScope | undefined>(scope),
    invocation: externalStore<Readonly<Record<string, unknown>>>({ caller: 'example-host-user' }),
    async validate(intent, context, signal) {
      // A real host checks typed arguments, effects, capabilities and caller authorization here.
      if (signal.aborted) return { status: 'refused', reason: 'cancelled' }
      return intent.type === 'navigate' && intent.route === 'example.canvas' && context.invocation.caller === 'example-host-user'
        ? { status: 'success' } : { status: 'refused', reason: 'denied' }
    },
    async navigate(intent, context, signal) {
      void context
      if (signal.aborted) return { status: 'refused', reason: 'cancelled' }
      selectedRegion.set(intent.route); return { status: 'success' }
    },
    async command() { return { status: 'refused', reason: 'unsupported-action' } },
    async modal() { return { status: 'refused', reason: 'unsupported-action' } },
  },
  panels: { reconcile(scope, views) { panelStore.set(scope.clientId, views.map(view => view.id)) }, releaseScope(scope) { panelStore.delete(scope.clientId) } },
  diagnostics: event => console.warn(event.reason),
})
function Example() {
  const rail = usePluginSlots('example.rail'), canvas = usePluginSlots('example.canvas')
  const dispatch = usePluginAction(), selected = useSyncExternalStore(selectedRegion.subscribe, selectedRegion.getSnapshot)
  const [result, setResult] = useState('No action yet')
  return <main className="p-3 space-y-3"><p>Selected region: {selected}. {result}</p>
    <section aria-label="Rail">{rail.map(panel => <div key={panel.id}><PluginPanelBody panel={panel} />
      <button onClick={() => { void dispatch(panel).then(outcome => setResult(outcome.status === 'success' ? 'Navigation approved' : outcome.reason)) }}>Open canvas</button></div>)}</section>
    <section aria-label="Canvas">{canvas.map(widget => <WidgetRenderer key={widget.id} widget={widget} />)}</section>
    <button onClick={() => { void runtime.sync([]) }}>Unload example owner</button></main>
}
await runtime.sync(entries)
createRoot(document.getElementById('root')!).render(<PluginHostProvider runtime={runtime}><Example /></PluginHostProvider>)
