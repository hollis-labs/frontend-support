import { expect, it, vi } from 'vitest'
import { createPluginActionDispatcher } from '../src/actions.js'
import { createSlotCatalog } from '../src/catalog.js'
import type { ContributionRef, RegistryEntry } from '../src/host.js'
import type { PluginActionsAdapter } from '../src/actions-contract.js'
import { actionsHarness, command, navigate } from './actions-helpers.js'
const ref: ContributionRef = { hostInstance: 'epoch', owner: 'source', generation: '1', kind: 'panel', key: 'component' }
function componentHarness() {
  const base = actionsHarness()
  const source: RegistryEntry = { owner_id: 'source', owner_generation: '1', local_key: 'component', kind: 'panel', schema_version: 1, required: false, status: 'accepted', representation: 'component', component: { export: 'View', region: 'body' }, metadata: {} }
  const catalog = createSlotCatalog({ kinds: [...base.catalog.kinds, { kind: 'panel', schemaVersion: 1, role: 'contribution', representations: ['component'], regions: ['body'], validate: () => true, project: () => ({ label: 'Component', region: 'body' }) }],
    regions: [...base.catalog.regions, { name: 'body', representation: 'component', kinds: ['panel'], widgetKinds: [], ordering: 'manifest', actions: { cardinality: 'optional', allowedTags: ['command', 'navigate', 'modal'] } }], reserved: () => false })
  let reviewed = true
  const bindings = { resolve: vi.fn((source: ContributionRef, binding: string) => reviewed && source.key === ref.key ? binding === 'run' ? command : binding === 'settings' ? navigate : undefined : undefined) }
  const adapter: PluginActionsAdapter = { ...base.adapter, bindings }
  const dispatcher = createPluginActionDispatcher({ registry: base.registry, scope: base.scope, catalog, adapter, report: vi.fn() })
  return { ...base, component: source, dispatcher, bindings, revokeBinding() { reviewed = false } }
}
it('resolves multiple reviewed bindings from a pinned component source through the existing adapter', async () => {
  const h = componentHarness(); await h.registry.sync([...h.entries(), h.component])
  expect(await h.dispatcher.dispatch(command, ref, undefined, 'run')).toEqual({ status: 'success' })
  expect(await h.dispatcher.dispatch(navigate, ref, undefined, 'settings')).toEqual({ status: 'success' })
  expect(h.adapter.command).toHaveBeenCalledOnce(); expect(h.adapter.navigate).toHaveBeenCalledOnce()
  expect(h.adapter.command.mock.calls[0]?.[1]).toMatchObject({ contribution: ref, target: { owner: 'tools', generation: '2' } })
  expect(await h.dispatcher.dispatch(navigate, ref, undefined, 'run')).toEqual({ status: 'refused', reason: 'invalid-metadata' })
  expect(await h.dispatcher.dispatch(command, ref, undefined, 'undeclared')).toEqual({ status: 'refused', reason: 'unsupported-action' })
  expect(await h.dispatcher.dispatch(command, ref)).toEqual({ status: 'refused', reason: 'invalid-metadata' })
  h.dispatcher.dispose(); h.dispose()
})
it('never uses component bindings to spoof a declarative source or bypass target policy', async () => {
  const h = componentHarness(); await h.registry.sync([...h.entries(), h.component])
  expect(await h.dispatcher.dispatch(command, h.source().ref, undefined, 'run')).toEqual({ status: 'refused', reason: 'unsupported-action' })
  h.adapter.validate.mockResolvedValue({ status: 'refused', reason: 'denied' })
  expect(await h.dispatcher.dispatch(command, ref, undefined, 'run')).toEqual({ status: 'refused', reason: 'denied' })
  expect(h.adapter.command).not.toHaveBeenCalled()
  h.dispatcher.dispose(); h.dispose()
})
it('rechecks component binding and target leases after asynchronous validation', async () => {
  const h = componentHarness(); await h.registry.sync([...h.entries(), h.component])
  let finish!: (result: { status: 'success' }) => void
  h.adapter.validate.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const pending = h.dispatcher.dispatch(command, ref, undefined, 'run')
  h.revokeBinding(); finish({ status: 'success' })
  expect(await pending).toEqual({ status: 'refused', reason: 'unsupported-action' }); expect(h.adapter.command).not.toHaveBeenCalled()
  h.dispatcher.dispose(); h.dispose()
})

it('exposes the execution boundary only after admission and fences expired calls without an effect', async () => {
  const h = componentHarness(); await h.registry.sync([...h.entries(), h.component])
  const start = vi.fn(() => false)
  expect(await h.dispatcher.dispatch(command, ref, undefined, 'run', start)).toEqual({ status: 'refused', reason: 'cancelled' })
  expect(start).toHaveBeenCalledOnce(); expect(h.adapter.command).not.toHaveBeenCalled()
  start.mockReturnValue(true)
  expect(await h.dispatcher.dispatch(command, ref, undefined, 'run', start)).toEqual({ status: 'success' })
  expect(h.adapter.command).toHaveBeenCalledOnce()
  h.adapter.validate.mockResolvedValue({ status: 'refused', reason: 'denied' })
  start.mockClear()
  await h.dispatcher.dispatch(command, ref, undefined, 'run', start)
  expect(start).not.toHaveBeenCalled()
  h.dispatcher.dispose(); h.dispose()
})
