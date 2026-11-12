import { expect, it, vi } from 'vitest'
import { dispatchPluginAction } from '../src/actions.js'
import { parsePluginAction, type ActionResult } from '../src/actions-contract.js'
import { actionsHarness, command, modal, navigate, success } from './actions-helpers.js'
it.each([command, navigate, modal])('directly dispatches $type after host validation with verified scope and pinned target', async intent => {
  const h = actionsHarness(intent)
  try {
    expect(await dispatchPluginAction(intent, { host: h.runtime, contribution: h.source().ref })).toEqual(success())
    expect(h.adapter.validate).toHaveBeenCalledOnce()
    expect(h.adapter[intent.type]).toHaveBeenCalledOnce()
    const context = h.adapter.validate.mock.calls[0]![1]
    expect(context).toMatchObject({ contribution: h.source().ref, scope: h.scope, invocation: { caller: 'verified', session_id: 'current-session' } })
    if (intent.type !== 'navigate') {
      expect(context).toMatchObject({ target: { owner: 'tools', generation: '2', kind: intent.type === 'command' ? 'command' : 'widget' } })
      expect(Object.keys((context as { target: object }).target)).not.toContain('value')
    }
  } finally { h.dispose() }
})
it.each([
  { type: 'handler', id: 'arbitrary' }, { type: 'future' },
  { ...command, command: 'bare' }, { ...command, arguments: null }, { ...navigate, route: 'host.settings', parameters: null },
  { ...command, route: 'extra' }, { ...modal, entry: { owner_id: 'tools', local_key: 'view', generation: 'forged' } },
  { ...modal, props: { unsafe: Number.MAX_SAFE_INTEGER + 1 } }, { ...navigate, parameters: { bad: Infinity } },
])('refuses unknown/cross-variant/invalid parsed action %j without invoking adapters', async intent => {
  const h = actionsHarness()
  try {
    const result = await h.runtime.dispatchAction(intent, h.source().ref)
    expect(result.status).toBe('refused')
    if (intent.type === 'handler' || intent.type === 'future') expect(result).toEqual({ status: 'refused', reason: 'unsupported-action' })
    expect(h.adapter.validate).not.toHaveBeenCalled(); expect(h.adapter.command).not.toHaveBeenCalled()
  } finally { h.dispose() }
})
it('refuses an undeclared payload and a missing live scope', async () => {
  const h = actionsHarness()
  try {
    expect(await h.runtime.dispatchAction({ ...command, arguments: { selection: 'forged' } }, h.source().ref)).toEqual({ status: 'refused', reason: 'invalid-metadata' })
    h.liveScope.set(undefined)
    expect(await h.runtime.dispatchAction(command, h.source().ref)).toEqual({ status: 'refused', reason: 'absent-scope' })
    expect(h.adapter.validate).not.toHaveBeenCalled()
  } finally { h.dispose() }
})
it('requires host caller/effect/capability/argument authorization on each invocation', async () => {
  const h = actionsHarness()
  h.adapter.validate.mockResolvedValue({ status: 'refused', reason: 'denied' })
  try {
    expect(await h.runtime.dispatchAction(command, h.source().ref)).toEqual({ status: 'refused', reason: 'denied' })
    expect(h.adapter.command).not.toHaveBeenCalled()
  } finally { h.dispose() }
})
it.each(['command', 'modal'] as const)('refuses an unresolved %s target', async type => {
  const intent = type === 'command' ? command : modal, h = actionsHarness(intent)
  try {
    await h.runtime.sync(h.entries().filter(entry => entry.kind !== (type === 'command' ? 'command' : 'widget')))
    expect(await h.runtime.dispatchAction(intent, h.source().ref)).toEqual({ status: 'refused', reason: type === 'command' ? 'unresolved-command-target' : 'unresolved-modal-target' })
    expect(h.adapter.validate).not.toHaveBeenCalled()
  } finally { h.dispose() }
})
it('refuses a modal widget declared in a different region', async () => {
  const h = actionsHarness(modal)
  try {
    await h.runtime.sync(h.entries().map(entry => entry.kind === 'widget' ? { ...entry, component: { export: 'View', region: 'unpublished' } } : entry))
    expect(await h.runtime.dispatchAction(modal, h.source().ref)).toEqual({ status: 'refused', reason: 'unresolved-modal-target' })
  } finally { h.dispose() }
})
it('refuses stale source generations and host epochs before validation', async () => {
  const h = actionsHarness(), old = h.source().ref
  try {
    await h.runtime.sync(h.entries().map(entry => entry.owner_id === 'source' ? { ...entry, owner_generation: 'new' } : entry))
    expect(await h.runtime.dispatchAction(command, old)).toEqual({ status: 'refused', reason: 'stale-owner' })
    const current = h.source().ref; h.restart()
    expect(await h.runtime.dispatchAction(command, current)).toEqual({ status: 'refused', reason: 'stale-owner' })
    expect(h.adapter.validate).not.toHaveBeenCalled()
  } finally { h.dispose() }
})
it.each(['source-unload', 'target-unload', 'scope', 'context', 'dispose', 'parent'] as const)('aborts validation on %s and fences late success', async event => {
  const h = actionsHarness(), controller = new AbortController()
  let complete!: (result: ActionResult) => void
  h.adapter.validate.mockImplementation(() => new Promise(resolve => { complete = resolve }))
  const pending = h.runtime.dispatchAction(command, h.source().ref, controller.signal)
  expect(h.adapter.validate).toHaveBeenCalledOnce()
  const signal = h.adapter.validate.mock.calls[0]![2]
  if (event === 'source-unload') await h.runtime.sync(h.entries().filter(entry => entry.owner_id !== 'source'))
  if (event === 'target-unload') await h.runtime.sync(h.entries().filter(entry => entry.kind !== 'command'))
  if (event === 'scope') h.liveScope.set({ ...h.scope, projectId: 'other' })
  if (event === 'context') h.invocation.set({ caller: 'changed' })
  if (event === 'dispose') h.runtime.dispose()
  if (event === 'parent') controller.abort()
  expect(signal.aborted).toBe(true)
  expect((await pending).status).toBe('refused')
  complete(success()); await Promise.resolve(); await Promise.resolve()
  expect(h.adapter.command).not.toHaveBeenCalled()
  h.dispose()
})
it('aborts a running modal on target replacement and never publishes its late success', async () => {
  const h = actionsHarness(modal)
  let complete!: (result: ActionResult) => void
  h.adapter.modal.mockImplementation(() => new Promise(resolve => { complete = resolve }))
  const pending = h.runtime.dispatchAction(modal, h.source().ref)
  await vi.waitFor(() => expect(h.adapter.modal).toHaveBeenCalledOnce())
  const signal = h.adapter.modal.mock.calls[0]![2]
  await h.runtime.sync(h.entries().map(entry => entry.kind === 'widget' ? { ...entry, owner_generation: 'next' } : entry))
  expect(signal.aborted).toBe(true)
  expect(await pending).toEqual({ status: 'refused', reason: 'stale-owner' })
  complete(success()); h.dispose()
})
it('turns promise exceptions into safe refusal codes and releases invocation subscriptions', async () => {
  const h = actionsHarness(), count = h.listeners()
  h.adapter.command.mockRejectedValue(new Error('private token'))
  try {
    expect(await h.runtime.dispatchAction(command, h.source().ref)).toEqual({ status: 'refused', reason: 'host-failed' })
    expect(h.listeners()).toBe(count)
    expect(JSON.stringify(h.diagnostics.mock.calls)).not.toContain('private token')
  } finally { h.dispose() }
})
it('accepts key-order-independent declared JSON and freezes copied arguments', () => {
  const parsed = parsePluginAction({ type: 'command', command: 'tools/run', arguments: { selection: 'one', nested: { x: true } } })
  expect(parsed.accepted).toBe(true)
  if (parsed.accepted && parsed.intent.type === 'command') expect(Object.isFrozen(parsed.intent.arguments)).toBe(true)
})

it('dispatches from a component source through its host catalog binding without a declarative payload', async () => {
  const h = actionsHarness(command)
  try {
    // The source binding is host supplied, shared by ordinary and isolated component callers.
    const { createSlotCatalog } = await import('../src/catalog.js')
    const { createPluginHostRuntime } = await import('../src/host.js')
    const { store } = await import('./helpers.js')
    const catalog = createSlotCatalog({ kinds: [
      { kind: 'panel', schemaVersion: 1, representations: ['component'], regions: ['panel.body'], role: 'contribution', validate: () => true, project: () => ({ label: 'Panel', region: 'panel.body', action: command }) },
      { kind: 'command', schemaVersion: 1, representations: ['handler'], regions: ['commands'], role: 'contribution', validate: () => true, project: entry => ({ label: entry.local_key, region: 'commands' }) },
    ], regions: [
      { name: 'panel.body', representation: 'component', kinds: ['panel'], widgetKinds: [], ordering: 'manifest', actions: { cardinality: 'required', allowedTags: ['command'] } },
      { name: 'commands', representation: 'handler', kinds: ['command'], widgetKinds: [], ordering: 'manifest' },
    ], reserved: () => false })
    await h.registry.sync([{ ...h.entries()[0]!, kind: 'panel', representation: 'component', declarative: undefined, component: { export: 'View', region: 'panel.body' } }, h.entries()[1]!])
    const runtime = createPluginHostRuntime({ scope: h.scope, registry: h.registry, catalog, actions: h.adapter,
      renderContext: store<Readonly<Record<string, unknown>>>({}),
      isolation: store({ appId: 'app', effectiveMode: 'sandboxed-frame' as const, revision: '1' }),
      panels: { reconcile() {}, releaseScope() {} }, diagnostics() {} })
    const release = runtime.retain()
    try {
      const source = runtime.getSnapshot().views.find(view => view.ref.kind === 'panel')!
      expect(source.availability).toBe('isolated-controller-required')
      expect(await runtime.dispatchAction(command, source.ref)).toEqual(success())
      expect(h.adapter.command).toHaveBeenCalledOnce()
    } finally { release(); runtime.dispose() }
  } finally { h.dispose() }
})
it('fails closed on a malformed host validation result without calling the operation', async () => {
  const h = actionsHarness()
  h.adapter.validate.mockResolvedValue({ status: 'refused', reason: 'unknown' } as unknown as ActionResult)
  try {
    expect(await h.runtime.dispatchAction(command, h.source().ref)).toEqual({ status: 'refused', reason: 'host-failed' })
    expect(h.adapter.command).not.toHaveBeenCalled()
  } finally { h.dispose() }
})

it('rejects sparse or cyclic action data before any host call', () => {
  const sparse = new Array(1) as unknown[]
  Object.assign(sparse, { extra: true })
  const cycle: Record<string, unknown> = {}; cycle.self = cycle
  for (const value of [sparse, cycle]) expect(parsePluginAction({ type: 'command', command: 'tools/run', arguments: { value } })).toEqual({ accepted: false, reason: 'invalid-metadata' })
})
