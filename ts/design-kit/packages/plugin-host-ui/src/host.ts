import { createPluginActionDispatcher } from './actions.js'
import type { PluginActionIntent, PluginActionsAdapter, ActionResult } from './actions-contract.js'
import { isSlotCatalog, type SlotCatalog, type CatalogRefusal } from './catalog.js'
import { orderContributions, type OrderingPolicy } from './order.js'
import type { PluginSettingsAdapter } from './settings-contract.js'
/** Built-in registry v2 render kind names; hosts opt in upstream. */
export const PANEL_KIND = 'panel'
export const DRAWER_TAB_KIND = 'drawer.tab'
export const WIDGET_KIND = 'widget'

/** Structural view of registry v2. No registry package or wire parser is bundled. */
export interface RegistryEntry {
  owner_id: string
  owner_generation: string
  local_key: string
  kind: string
  status: string
  status_reason?: string
  representation: string
  metadata: unknown
  schema_version: number
  required: boolean
  declarative?: unknown
  handler?: { id: string }
  component?: { export: string; region: string }
}
export interface AdoptedEntry extends RegistryEntry {
  hostInstance: string
  value: unknown
  isActive(): boolean
}
export interface RegistrySnapshot {
  registryVersion: number
  hostInstance: string
  revision: number
  version: number
  contributions: readonly RegistryEntry[]
}
export interface PluginRegistryInstance<Input> {
  sync(input: Input | string): Promise<unknown>
  subscribe(listener: () => void): () => void
  snapshot(): RegistrySnapshot
  list(kind: string): readonly AdoptedEntry[]
  get(kind: string, qualifiedKey: string): AdoptedEntry | undefined
}
export interface Observable<T> {
  getSnapshot(): T
  getServerSnapshot(): T
  subscribe(listener: () => void): () => void
}
export interface HostScope {
  appId: string
  environmentId: string
  projectId?: string
  clientId: string
}
export interface ContributionRef {
  hostInstance: string
  owner: string
  generation: string
  kind: string
  /** Local key, distinct from the registry's owner/local key. */
  key: string
}
/** Durable identity excludes generation and host epoch so reload retains preferences. */
export function contributionId(ref: Pick<ContributionRef, 'kind' | 'owner' | 'key'>): string {
  return JSON.stringify([ref.kind, ref.owner, ref.key])
}
export function drawerTabId(ref: Pick<ContributionRef, 'owner' | 'key'>): string {
  return `plugin:${encodeURIComponent(ref.owner)}:${encodeURIComponent(ref.key)}`
}
export type PluginIsolationMode = 'sandboxed-frame' | 'main-origin'
export interface AppIsolationSnapshot {
  appId: string
  effectiveMode: PluginIsolationMode
  revision: string
}
export interface ViewProjection {
  /** Host-validated presentation data; no inline wire schema is defined here. */
  data?: unknown
  action?: PluginActionIntent
  label: string
  region: string
  description?: string
  icon?: string
  props?: Readonly<Record<string, unknown>>
  priority?: number
  manifestOrder?: number
}
export interface ContributionView extends ViewProjection {
  ref: ContributionRef
  representation: string
  widget: boolean
  refusal?: CatalogRefusal
  id: string
  status: string
  statusReason?: string
  props: Readonly<Record<string, unknown>>
  value?: unknown
  availability: 'available' | 'inactive' | 'unavailable' | 'isolated-controller-required'
}
export interface HostDiagnostic {
  stage: 'action' | 'catalog' | 'registry' | 'projection' | 'panels' | 'isolation' | 'render' | 'persistence'
  reason: string
  ref?: ContributionRef
}
/** Structural DOM surface only: core never imports the optional isolation implementation. */
export interface PluginFrameController {
  isCurrent(view: ContributionView): boolean
  subscribe(listener: () => void): () => void
  mount(container: HTMLElement, view: ContributionView, props: Readonly<Record<string, unknown>>): PluginFrameMount
}
export interface PluginFrameMount extends Observable<PluginFrameRenderState> {
  update(props: Readonly<Record<string, unknown>>): void
  dispose(): void
}
export type PluginFrameRenderState = { status: 'loading' | 'ready' } | { status: 'failed'; reason: string }
export interface PluginHostAdapter<Input> {
  frameController?: PluginFrameController
  scope: HostScope
  settings?: PluginSettingsAdapter
  actions?: PluginActionsAdapter
  registry: PluginRegistryInstance<Input>
  catalog: SlotCatalog
  isolation: Observable<AppIsolationSnapshot>
  renderContext: Observable<Readonly<Record<string, unknown>>>
  panels: {
    reconcile(scope: HostScope, views: readonly ContributionView[]): void
    releaseScope(scope: HostScope): void
  }
  icons?: { resolve(name: string): unknown }
  diagnostics(event: HostDiagnostic): void
}
export interface HostSnapshot {
  version: number
  hostInstance: string
  revision: number
  isolationMode: PluginIsolationMode | null
  views: readonly ContributionView[]
  refusals: readonly CatalogRefusal[]
}
/** Read surface used by React; input transport stays with the host runtime owner. */
export interface PluginHostReader extends Observable<HostSnapshot> {
  frameController?: PluginFrameController
  settings?: PluginSettingsAdapter
  scope: HostScope
  renderContext: Observable<Readonly<Record<string, unknown>>>
  retain(): () => void
  dispatchAction(intent: unknown, contribution: ContributionRef, signal?: AbortSignal): Promise<ActionResult>
  dispatchBoundAction(binding: string, intent: unknown, contribution: ContributionRef, signal?: AbortSignal, onExecutionStart?: () => boolean): Promise<ActionResult>
  ordering(region: string): OrderingPolicy | undefined
  isCurrent(view: ContributionView): boolean
  report(event: HostDiagnostic): void
  resolveIcon(name: string): unknown
}
export interface RequiredInactiveEntry { ref: ContributionRef; status: string }
export interface HostPlanningResult { accepted: boolean; refusals: readonly CatalogRefusal[]; requiredInactive: readonly RequiredInactiveEntry[] }
export interface HostSyncResult { registryResult: unknown; planning: HostPlanningResult }
export interface PluginHostRuntime<Input> extends PluginHostReader {
  sync(input: Input | string): Promise<HostSyncResult>
  dispose(): void
}
const emptyViews: readonly ContributionView[] = Object.freeze([])
function shallowEqual(a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
}
function sameView(a: ContributionView, b: ContributionView): boolean {
  return a.id === b.id && a.ref.hostInstance === b.ref.hostInstance && a.ref.generation === b.ref.generation &&
    a.label === b.label && a.region === b.region && a.description === b.description && a.icon === b.icon &&
    a.priority === b.priority && a.manifestOrder === b.manifestOrder && a.status === b.status &&
    a.statusReason === b.statusReason && a.representation === b.representation && a.widget === b.widget &&
    JSON.stringify(a.data) === JSON.stringify(b.data) && JSON.stringify(a.action) === JSON.stringify(b.action) && a.refusal?.reason === b.refusal?.reason && a.availability === b.availability && a.value === b.value && shallowEqual(a.props, b.props)
}

/** One reconciliation controller per explicit runtime, regardless of selector count. */
export function createPluginHostRuntime<Input>(adapter: PluginHostAdapter<Input>): PluginHostRuntime<Input> {
  if (!isSlotCatalog(adapter.catalog)) throw new Error('A validated host slot catalog is required')
  const scope = Object.freeze({ ...adapter.scope })
  const serverSnapshot: HostSnapshot = Object.freeze({ version: 0, hostInstance: '', revision: 0, isolationMode: null, views: emptyViews, refusals: Object.freeze([]) })
  let snapshot = serverSnapshot
  let planning: HostPlanningResult = Object.freeze({ accepted: true, refusals: Object.freeze([]), requiredInactive: Object.freeze([]) })
  let disposed = false, retains = 0
  const releases: (() => void)[] = []
  const listeners = new Set<() => void>()
  const report = (event: HostDiagnostic) => { try { adapter.diagnostics(event) } catch { /* telemetry cannot break cleanup */ } }
  const actions = createPluginActionDispatcher({ registry: adapter.registry, catalog: adapter.catalog, scope, adapter: adapter.actions, report: (reason, ref) => report({ stage: 'action', reason, ref }) })
  function mode(): PluginIsolationMode | null {
    try {
      const setting = adapter.isolation.getSnapshot()
      return setting.appId === scope.appId && (setting.effectiveMode === 'main-origin' || setting.effectiveMode === 'sandboxed-frame')
        ? setting.effectiveMode : null
    } catch { return null }
  }
  function emit() {
    for (const listener of [...listeners]) {
      try { listener() } catch { report({ stage: 'projection', reason: 'subscriber-failed' }) }
    }
  }
  function reconcilePanels(views: readonly ContributionView[]) {
    try { adapter.panels.reconcile(scope, views.filter(v => v.ref.kind === PANEL_KIND && v.availability === 'available')) }
    catch { report({ stage: 'panels', reason: 'reconcile-failed' }) }
  }
  function refresh(forcePanels = false) {
    if (disposed) return
    let raw: RegistrySnapshot
    try { raw = adapter.registry.snapshot() } catch { report({ stage: 'registry', reason: 'snapshot-failed' }); return }
    if (raw.registryVersion !== 2) { report({ stage: 'registry', reason: 'unsupported-registry-version' }); return }
    if (snapshot.hostInstance === raw.hostInstance && raw.revision < snapshot.revision) {
      report({ stage: 'registry', reason: 'stale-revision' }); return
    }
    const isolationMode = mode()
    if (isolationMode === null) report({ stage: 'isolation', reason: 'missing-effective-mode' })
    const old = new Map(snapshot.views.map(v => [v.id, v]))
    const seen = new Set<string>()
    const next: ContributionView[] = []
    const refusals: CatalogRefusal[] = []
    const requiredInactive: RequiredInactiveEntry[] = []
    for (const entry of raw.contributions) {
      const ref = Object.freeze({ hostInstance: raw.hostInstance, owner: entry.owner_id, generation: entry.owner_generation, kind: entry.kind, key: entry.local_key })
      if (entry.required && entry.status !== 'accepted') requiredInactive.push(Object.freeze({ ref, status: ['declared_not_selected', 'refused', 'unavailable'].includes(entry.status) ? entry.status : 'unavailable' }))
      const id = contributionId(ref)
      if (seen.has(id)) { report({ stage: 'projection', reason: 'duplicate-identity', ref }); continue }
      seen.add(id)
      try {
        const inspected = adapter.catalog.inspect(entry, ref)
        if (!inspected.accepted) { refusals.push(inspected.refusal); report({ stage: 'catalog', reason: inspected.refusal.reason, ref }) }
        const projected = inspected.projection
        const adopted = inspected.accepted && entry.status === 'accepted' ? adapter.registry.get(entry.kind, `${entry.owner_id}/${entry.local_key}`) : undefined
        const current = adopted?.hostInstance === raw.hostInstance && adopted.owner_generation === entry.owner_generation &&
          adopted.owner_id === entry.owner_id && adopted.local_key === entry.local_key && adopted.kind === entry.kind &&
          adopted.status === 'accepted' && adopted.isActive()
        const value = current ? adopted.value : undefined
        const availability = !inspected.accepted ? 'unavailable' : entry.status !== 'accepted' ? 'inactive' : !current
          ? 'unavailable' : entry.representation !== 'component' ? 'available' : isolationMode === null
          ? 'unavailable' : isolationMode === 'sandboxed-frame' ? adapter.frameController ? 'available' : 'isolated-controller-required' : 'available'
        if (!['accepted', 'declared_not_selected', 'refused', 'unavailable'].includes(entry.status)) report({ stage: 'projection', reason: 'unknown-status', ref })
        const candidate: ContributionView = Object.freeze({ ...projected, ref, id, representation: entry.representation, widget: inspected.accepted && inspected.widget, refusal: inspected.accepted ? undefined : inspected.refusal, status: ['accepted', 'declared_not_selected', 'refused', 'unavailable'].includes(entry.status) ? entry.status : 'unavailable', statusReason: entry.status_reason,
          props: Object.freeze({ ...(projected.props ?? {}) }), value, availability })
        const previous = old.get(id)
        next.push(previous && sameView(previous, candidate) ? previous : candidate)
      } catch {
        const refusal: CatalogRefusal = Object.freeze({ ref, required: entry.required, reason: 'projection-failed' })
        planning = Object.freeze({ accepted: false, refusals: Object.freeze([...refusals, refusal]), requiredInactive: Object.freeze(requiredInactive) })
        report({ stage: 'catalog', reason: refusal.reason, ref })
        return
      }
    }
    planning = Object.freeze({ accepted: !refusals.some(refusal => refusal.required), refusals: Object.freeze(refusals), requiredInactive: Object.freeze(requiredInactive) })
    // Registry acceptance is upstream; only this host's publication is withheld.
    if (!planning.accepted) return
    const ordered = [...new Set(next.map(view => view.region))].flatMap(region => orderContributions(next.filter(view => view.region === region), [], adapter.catalog.ordering(region)))
    const same = ordered.length === snapshot.views.length && ordered.every((v, i) => v === snapshot.views[i]) &&
      snapshot.hostInstance === raw.hostInstance && snapshot.revision === raw.revision && snapshot.isolationMode === isolationMode
    if (same) { if (forcePanels) reconcilePanels(snapshot.views); return }
    snapshot = Object.freeze({ version: snapshot.version + 1, hostInstance: raw.hostInstance, revision: raw.revision, isolationMode, views: Object.freeze(ordered), refusals: planning.refusals })
    reconcilePanels(snapshot.views)
    emit()
  }
  function releaseResources() {
    for (const release of releases.splice(0).reverse()) { try { release() } catch { report({ stage: 'projection', reason: 'unsubscribe-failed' }) } }
    try { adapter.panels.releaseScope(scope) } catch { report({ stage: 'panels', reason: 'release-failed' }) }
  }
  return {
    dispatchAction: actions.dispatch,
    dispatchBoundAction: (binding, intent, contribution, signal, onExecutionStart) => actions.dispatch(intent, contribution, signal, binding, onExecutionStart),
    ordering: adapter.catalog.ordering,
    scope, settings: adapter.settings, renderContext: adapter.renderContext, frameController: adapter.frameController,
    getSnapshot: () => snapshot, getServerSnapshot: () => serverSnapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    report,
    resolveIcon(name) { try { return adapter.icons?.resolve(name) } catch { report({ stage: 'projection', reason: 'icon-failed' }); return undefined } },
    retain() {
      if (disposed) throw new Error('Plugin host runtime is disposed')
      if (retains++ === 0) {
        try {
          releases.push(adapter.registry.subscribe(() => refresh()))
          releases.push(adapter.isolation.subscribe(() => refresh()))
          if (adapter.frameController) releases.push(adapter.frameController.subscribe(() => {
            if (disposed) return
            snapshot = Object.freeze({ ...snapshot, version: snapshot.version + 1 }); emit()
          }))
          refresh(true)
        } catch (error) { retains = 0; releaseResources(); throw error }
      }
      let released = false
      return () => {
        if (released) return
        released = true
        if (!disposed && --retains === 0) releaseResources()
      }
    },
    isCurrent(view) {
      if (disposed || view.status !== 'accepted' || view.availability !== 'available') return false
      if (view.representation === 'component') {
        const effective = mode()
        if (effective === null) return false
        if (effective === 'sandboxed-frame') {
          try { if (!adapter.frameController?.isCurrent(view)) return false } catch { return false }
        }
      }
      try {
        const raw = adapter.registry.snapshot()
        const current = adapter.registry.get(view.ref.kind, `${view.ref.owner}/${view.ref.key}`)
        return raw.registryVersion === 2 && raw.hostInstance === view.ref.hostInstance && current?.status === 'accepted' &&
          current.hostInstance === view.ref.hostInstance && current.owner_generation === view.ref.generation &&
          current.owner_id === view.ref.owner && current.local_key === view.ref.key && current.kind === view.ref.kind &&
          current.representation === view.representation && current.value === view.value && current.isActive() &&
          raw.contributions.some(entry => entry.owner_id === view.ref.owner && entry.owner_generation === view.ref.generation &&
            entry.kind === view.ref.kind && entry.local_key === view.ref.key && entry.status === 'accepted' && (() => {
              const inspected = adapter.catalog.inspect(entry, view.ref)
              return inspected.accepted && inspected.projection.region === view.region && inspected.representation === view.representation
            })())
      } catch { return false }
    },
    async sync(input) {
      if (disposed) throw new Error('Plugin host runtime is disposed')
      try { const result = await adapter.registry.sync(input); refresh(); return { registryResult: result, planning } }
      catch (error) { report({ stage: 'registry', reason: 'sync-failed' }); throw error }
    },
    dispose() {
      if (disposed) return
      actions.dispose()
      disposed = true; retains = 0; releaseResources()
      snapshot = Object.freeze({ ...snapshot, version: snapshot.version + 1, views: emptyViews })
      emit(); listeners.clear()
    },
  }
}
