import { vi } from 'vitest'
import { createSlotCatalog } from '../src/catalog.js'
import { createPluginHostRuntime, type AdoptedEntry, type AppIsolationSnapshot, type HostScope, type RegistryEntry } from '../src/host.js'
import type { ActionResult, PluginActionIntent } from '../src/actions-contract.js'
import { store } from './helpers.js'
export const success = (): ActionResult => ({ status: 'success' })
export const command: PluginActionIntent = { type: 'command', command: 'tools/run', arguments: { selection: 'one' } }
export const navigate: PluginActionIntent = { type: 'navigate', route: 'host.settings', parameters: {} }
export const modal: PluginActionIntent = { type: 'modal', region: 'modal.body', entry: { owner_id: 'tools', local_key: 'view' }, props: {} }
export function actionsHarness(intent: PluginActionIntent = command) {
  const scope: HostScope = { appId: 'app', environmentId: 'test', projectId: 'project', clientId: 'browser' }
  const liveScope = store<HostScope | undefined>(scope), invocation = store<Readonly<Record<string, unknown>>>({ caller: 'verified', session_id: 'current-session' })
  const adapter = { scope: liveScope, invocation, validate: vi.fn(async (_intent: PluginActionIntent, _context: unknown, _signal: AbortSignal) => { void _intent; void _context; void _signal; return success() }),
    command: vi.fn(async (_intent: unknown, _context: unknown, _signal: AbortSignal) => { void _intent; void _context; void _signal; return success() }),
    navigate: vi.fn(async (_intent: unknown, _context: unknown, _signal: AbortSignal) => { void _intent; void _context; void _signal; return success() }),
    modal: vi.fn(async (_intent: unknown, _context: unknown, _signal: AbortSignal) => { void _intent; void _context; void _signal; return success() }) }
  let entries: RegistryEntry[] = [
    { owner_id: 'source', owner_generation: '1', local_key: 'click', kind: 'slot', schema_version: 1, required: false, status: 'accepted', representation: 'declarative', metadata: { slot: 'inline' }, declarative: { data: { label: 'Click' }, action: intent } },
    { owner_id: 'tools', owner_generation: '2', local_key: 'run', kind: 'command', schema_version: 1, required: false, status: 'accepted', representation: 'handler', metadata: {}, handler: { id: 'reviewed-run' } },
    { owner_id: 'tools', owner_generation: '2', local_key: 'view', kind: 'widget', schema_version: 1, required: false, status: 'accepted', representation: 'component', metadata: {}, component: { export: 'View', region: 'modal.body' } },
  ]
  let revision = 1, epoch = 'epoch'
  const View = () => null, listeners = new Set<() => void>()
  const adopted = (entry: RegistryEntry): AdoptedEntry => ({ ...entry, hostInstance: epoch, value: entry.representation === 'component' ? View : entry.declarative ?? entry.handler, isActive: () => entries.includes(entry) && entry.status === 'accepted' })
  const registry = {
    async sync(input: readonly RegistryEntry[] | string) { if (typeof input === 'string') throw new Error('Typed fixture only'); entries = [...input]; revision++; for (const listener of listeners) listener(); return { accepted: true } },
    snapshot: () => ({ registryVersion: 2, hostInstance: epoch, revision, version: revision, contributions: entries }),
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    get(kind: string, key: string) { const entry = entries.find(entry => entry.kind === kind && `${entry.owner_id}/${entry.local_key}` === key && entry.status === 'accepted'); return entry ? adopted(entry) : undefined },
    list(kind: string) { return entries.filter(entry => entry.kind === kind && entry.status === 'accepted').map(adopted) },
  }
  const catalog = createSlotCatalog({ kinds: [
    { kind: 'slot', schemaVersion: 1, representations: ['declarative'], regions: ['inline'], role: 'contribution', validate: entry => typeof (entry.declarative as { data?: { label?: unknown } })?.data?.label === 'string', declaredRegion: entry => (entry.metadata as { slot: string }).slot,
      project: entry => { const data = entry.declarative as { data: { label: string }; action: PluginActionIntent }; return { label: data.data.label, region: 'inline', data: data.data, action: data.action } } },
    { kind: 'command', schemaVersion: 1, representations: ['handler'], regions: ['commands'], role: 'contribution', validate: () => true, project: entry => ({ label: entry.local_key, region: 'commands' }) },
    { kind: 'widget', schemaVersion: 1, representations: ['component'], regions: ['modal.body'], role: 'widget', validate: () => true, project: entry => ({ label: entry.local_key, region: entry.component!.region }) },
  ], regions: [
    { name: 'inline', representation: 'declarative', kinds: ['slot'], widgetKinds: [], ordering: 'manifest', actions: { cardinality: 'required', allowedTags: ['command', 'navigate', 'modal'] } },
    { name: 'commands', representation: 'handler', kinds: ['command'], widgetKinds: [], ordering: 'manifest' },
    { name: 'modal.body', representation: 'component', kinds: ['widget'], widgetKinds: ['widget'], ordering: 'manifest', modal: true },
  ], reserved: () => false })
  const diagnostics = vi.fn(), runtime = createPluginHostRuntime({ scope, registry, catalog, actions: adapter, renderContext: store<Readonly<Record<string, unknown>>>({}),
    isolation: store<AppIsolationSnapshot>({ appId: 'app', effectiveMode: 'main-origin', revision: '1' }), panels: { reconcile: vi.fn(), releaseScope: vi.fn() }, diagnostics })
  const release = runtime.retain()
  return { runtime, registry, catalog, adapter, liveScope, invocation, diagnostics, scope, entries: () => entries, source: () => runtime.getSnapshot().views.find(view => view.ref.owner === 'source')!, listeners: () => listeners.size,
    restart() { epoch = 'restarted'; revision++; for (const listener of listeners) listener() }, dispose() { release(); runtime.dispose() } }
}
