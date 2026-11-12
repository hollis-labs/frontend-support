/**
 * The shell's plugin-host-ui runtime. Every contribution the shell placed is registered with
 * the host by kind (registry v2 entries), a slot catalog built from the shell model admits
 * them into their regions, and the React side reads the published views back. Component
 * kinds (panel, dock.tab, widget) render through the host; the declarative kinds are
 * registered under the same catalog, and anything the host refuses surfaces as a shell diagnostic.
 */
import {
  createPluginHostRuntime, createSlotCatalog,
  type AdoptedEntry, type AppIsolationSnapshot, type HostDiagnostic, type Observable, type PluginHostRuntime, type PluginRegistryInstance,
  type RegistryEntry, type SlotKindDefinition, type SlotRegionDefinition,
} from '@hollis-labs/plugin-host-ui'
import { effectiveRegion } from './model'
import type { ShellModel } from './model'
import type { ManifestItem, ShellDiagnostic } from './manifest'

const SCHEMA_VERSION = 1
const COMPONENT_KINDS = ['panel', 'dock.tab', 'widget'] as const
const isComponentKind = (k: string) => (COMPONENT_KINDS as readonly string[]).includes(k)

function store<T>(initial: T): Observable<T> {
  return { getSnapshot: () => initial, getServerSnapshot: () => initial, subscribe: () => () => {} }
}

/** Every item the shell placed, in the order the manifest lists them. */
export function placedItems(model: ShellModel): ManifestItem[] {
  const seen = new Set<ManifestItem>()
  const add = (it: ManifestItem) => { seen.add(it) }
  for (const n of model.navPrimary) { if (n.type === 'item') add(n.link.item); else { add(n.item); n.children.forEach(c => add(c.item)) } }
  model.navFooter.forEach(l => add(l.item))
  model.surfaces.forEach(s => add(s.item))
  model.panels.forEach(add); model.widgets.forEach(add); model.slots.forEach(add)
  model.docks.forEach(d => d.tabs.forEach(add))
  model.settingsSections.forEach(s => add(s.item))
  return [...seen]
}

/** An in-process registry v2 instance over the shell's own entries; nothing is fetched. */
function createShellRegistry(entries: readonly RegistryEntry[], values: ReadonlyMap<string, unknown>): PluginRegistryInstance<readonly RegistryEntry[]> {
  let current = entries, revision = 1
  const listeners = new Set<() => void>()
  const adopt = (e: RegistryEntry): AdoptedEntry => ({ ...e, hostInstance: 'shell', value: values.get(`${e.kind}/${e.owner_id}/${e.local_key}`), isActive: () => true })
  return {
    async sync(input) {
      if (typeof input === 'string') throw new Error('The shell registry takes entries, not a document reference.')
      current = input; revision++
      for (const l of [...listeners]) l()
    },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
    snapshot: () => ({ registryVersion: 2, hostInstance: 'shell', revision, version: revision, contributions: current }),
    list: kind => current.filter(e => e.kind === kind).map(adopt),
    get: (kind, key) => { const e = current.find(x => x.kind === kind && `${x.owner_id}/${x.local_key}` === key); return e ? adopt(e) : undefined },
  }
}

export interface ShellPluginHost {
  runtime: PluginHostRuntime<readonly RegistryEntry[]>
}

export interface ShellPluginHostOptions {
  views: Readonly<Record<string, unknown>>
  apiBase: string
  onDiagnostic?: (event: HostDiagnostic) => void
}

export function createShellPluginHost(app: string, model: ShellModel, options: ShellPluginHostOptions): ShellPluginHost {
  const items = placedItems(model)
  const dockedNames = model.docks.map(d => d.region.name)

  // Registry entries: component kinds carry their view component, the rest their declaration.
  const values = new Map<string, unknown>()
  const entries: RegistryEntry[] = items.map(it => {
    const region = effectiveRegion(it)
    const component = isComponentKind(it.kind)
    const base = { owner_id: it.module, owner_generation: '1', local_key: it.key, kind: it.kind, status: 'accepted', schema_version: SCHEMA_VERSION, required: false, metadata: it }
    if (component) {
      values.set(`${it.kind}/${it.module}/${it.key}`, options.views[it.view ?? ''])
      return { ...base, representation: 'component', component: { export: it.view ?? '', region } }
    }
    values.set(`${it.kind}/${it.module}/${it.key}`, it)
    return { ...base, representation: 'declarative', declarative: it }
  })

  // Catalog: each kind lists the regions the manifest puts it in; each region admits those kinds.
  const kindRegions = new Map<string, Set<string>>()
  const regionKinds = new Map<string, Set<string>>()
  const note = (kind: string, region: string) => {
    if (!kindRegions.has(kind)) kindRegions.set(kind, new Set())
    kindRegions.get(kind)!.add(region)
    if (!regionKinds.has(region)) regionKinds.set(region, new Set())
    regionKinds.get(region)!.add(kind)
  }
  for (const it of items) note(it.kind, effectiveRegion(it))
  for (const name of dockedNames) note('dock.tab', name)
  const project = (e: RegistryEntry) => {
    const it = e.metadata as ManifestItem
    return {
      label: it.label || it.title || it.key, region: effectiveRegion(it), icon: it.icon, priority: it.priority,
      props: isComponentKind(it.kind) ? { item: it, apiBase: options.apiBase } : { item: it },
    }
  }
  const kinds: SlotKindDefinition[] = [...kindRegions].map(([kind, regions]) => ({
    kind, schemaVersion: SCHEMA_VERSION, role: kind === 'widget' ? 'widget' : 'contribution',
    representations: [isComponentKind(kind) ? 'component' : 'declarative'], regions: [...regions],
    validate: e => typeof e.metadata === 'object' && e.metadata !== null && (e.metadata as ManifestItem).kind === kind,
    project,
  }))
  const regions: SlotRegionDefinition[] = [...regionKinds].map(([name, ks]) => ({
    name, representation: [...ks].some(isComponentKind) ? 'component' : 'declarative', kinds: [...ks],
    widgetKinds: ks.has('widget') ? ['widget'] : [], ordering: 'priority-ascending',
  }))
  const catalog = createSlotCatalog({ kinds, regions, reserved: () => false })

  const registry = createShellRegistry(entries, values)
  const isolation = store<AppIsolationSnapshot>({ appId: app, effectiveMode: 'main-origin', revision: '1' })
  const runtime = createPluginHostRuntime({
    scope: { appId: app, environmentId: 'shell', clientId: 'browser' },
    registry, catalog, isolation, renderContext: store<Readonly<Record<string, unknown>>>({}),
    panels: { reconcile: () => {}, releaseScope: () => {} },
    diagnostics: event => options.onDiagnostic?.(event),
  })
  return { runtime }
}

/** The host's refusals, as shell diagnostics. */
export function refusalDiagnostics(refusals: readonly { ref: { kind: string; key: string; owner: string }; reason: string }[]): ShellDiagnostic[] {
  return refusals.map(r => ({ code: 'host-refused', message: `plugin-host-ui refused ${r.ref.kind} ${r.ref.key}: ${r.reason}.`, module: r.ref.owner, kind: r.ref.kind, key: r.ref.key }))
}
