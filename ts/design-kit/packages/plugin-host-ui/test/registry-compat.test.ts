import { createSlotCatalog } from '../src/catalog.js'
import { describe, expect, it, vi } from 'vitest'
import {
  bundleDigest, createPluginRegistry,
  type KindDescriptor, type PluginRegistryResponse, type RegionDescriptor, type RegistryContribution,
} from '@hollis-labs/plugin-registry'
import {
  createPluginHostRuntime, PANEL_KIND,
  type AppIsolationSnapshot, type PluginRegistryInstance,
} from '../src/host.js'
import { store } from './helpers.js'

const kinds: Record<string, KindDescriptor> = {
  [PANEL_KIND]: { schema_version: 1, metadata_schema: {}, representations: ['component'], regions: ['rail'], required_capabilities: [] },
}
const regions: Record<string, RegionDescriptor> = {
  rail: { kinds: [PANEL_KIND], representations: ['component'], context_schema: {}, ordering: 'manifest' },
}
const bytes = new TextEncoder().encode('export function View() { return null }')

async function document(statuses: readonly string[]): Promise<PluginRegistryResponse> {
  const entries: Record<string, RegistryContribution> = {}
  for (const status of statuses) {
    entries[`notes/${status}`] = {
      owner_id: 'notes', owner_generation: '1', local_key: status, kind: PANEL_KIND,
      schema_version: 1, required: false, status, representation: 'component', metadata: {},
      component: { export: 'View', region: 'rail' },
    }
  }
  return {
    registry_version: 2, host_instance: 'test-host', revision: 1,
    plugins: { notes: { owner_generation: '1', bundle_url: '/notes.js', bundle_version: await bundleDigest(bytes), runtime: [{ name: 'react', min: '19.0.0', max: '19.9.9' }] } },
    kinds, regions, contributions: { [PANEL_KIND]: entries },
    refusals: statuses.includes('refused') ? [{ owner_id: 'notes', owner_generation: '1', local_key: 'refused', kind: PANEL_KIND, required: false, reason: 'host-refused' }] : [],
  }
}

describe('published registry v2 compatibility', () => {
  it('satisfies the structural contract, projects statuses and fences unload before disposal completes', async () => {
    const View = () => null
    const fetchBundle = vi.fn(async () => bytes)
    const importModule = vi.fn(async () => ({ View }))
    const onDiagnostic = vi.fn()
    let finishDisposal!: () => void
    const disposing = new Promise<void>(resolve => { finishDisposal = resolve })
    const dispose = vi.fn(async () => { await disposing })
    const real = createPluginRegistry({ kinds, regions, runtimes: { react: '19.2.4' }, stylesheets: false, fetchBundle, importModule, onDiagnostic, dispose })
    // Deliberately no cast: this assignment is checked by the package's normal tsc gate.
    const registry: PluginRegistryInstance<PluginRegistryResponse> = real
    const panels = { reconcile: vi.fn(), releaseScope: vi.fn() }
    const runtime = createPluginHostRuntime({
      registry, scope: { appId: 'app', environmentId: 'test', clientId: 'browser' },
      isolation: store<AppIsolationSnapshot>({ appId: 'app', effectiveMode: 'main-origin', revision: '1' }),
      renderContext: store<Readonly<Record<string, unknown>>>({}), panels,
      diagnostics: vi.fn(), catalog: createSlotCatalog({ kinds: [{ kind: PANEL_KIND, schemaVersion: 1, role: 'contribution', representations: ['component'], regions: ['rail'], validate: () => true, project: entry => ({ label: entry.local_key, region: entry.component!.region }) }], regions: [{ name: 'rail', representation: 'component', kinds: [PANEL_KIND], widgetKinds: [], ordering: 'manifest' }], reserved: () => false }),
    })
    const release = runtime.retain()
    try {
      const input = await document(['accepted', 'declared_not_selected', 'unavailable', 'future-status', 'refused'])
      expect(await runtime.sync(input)).toMatchObject({ registryResult: { accepted: true, resolved: 1 }, planning: { accepted: true } })
      expect(real.snapshot()).toMatchObject({ registryVersion: 2, hostInstance: input.host_instance, revision: 1 })
      expect(real.snapshot().contributions.find(entry => entry.local_key === 'future-status')).toMatchObject({ status: 'unavailable', resolved: false })
      expect(onDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ type: 'status-diagnostic', diagnostic: expect.objectContaining({ reason: 'unknown-status' }) }))
      const snapshot = runtime.getSnapshot()
      expect(snapshot.views).toHaveLength(5)
      const active = snapshot.views.find(view => view.ref.key === 'accepted')!
      expect(active).toMatchObject({ status: 'accepted', availability: 'available', value: View })
      expect(runtime.isCurrent(active)).toBe(true)
      for (const view of snapshot.views.filter(view => view !== active)) {
        expect(view.availability).toBe('inactive')
        expect(view.value).toBeUndefined()
        expect(runtime.isCurrent(view)).toBe(false)
        expect(real.get(PANEL_KIND, `notes/${view.ref.key}`)).toBeUndefined()
      }
      expect(snapshot.views.find(view => view.ref.key === 'future-status')?.status).toBe('unavailable')
      expect(registry.list(PANEL_KIND)).toHaveLength(1)
      expect(fetchBundle).toHaveBeenCalledTimes(1)
      expect(importModule).toHaveBeenCalledTimes(1)
      expect(importModule).toHaveBeenCalledWith(expect.objectContaining({ bytes, digest: input.plugins.notes!.bundle_version }))
      expect(panels.reconcile).toHaveBeenLastCalledWith(runtime.scope, [active])

      const unloading = real.unload('notes', '1')
      expect(runtime.isCurrent(active)).toBe(false)
      expect(runtime.getSnapshot().views).toEqual([])
      expect(panels.reconcile).toHaveBeenLastCalledWith(runtime.scope, [])
      finishDisposal()
      await unloading
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(registry.list(PANEL_KIND)).toEqual([])
      expect(real.snapshot().refusals).toEqual([])
    } finally {
      finishDisposal()
      release()
      runtime.dispose()
      await real.clear()
    }
  })

  it('never fetches or imports a bundle containing only inactive declarations', async () => {
    const fetchBundle = vi.fn(async () => bytes), importModule = vi.fn(async () => ({ View: () => null }))
    const registry = createPluginRegistry({ kinds, regions, runtimes: { react: '19.2.4' }, stylesheets: false, fetchBundle, importModule })
    try {
      expect(await registry.sync(await document(['declared_not_selected', 'unavailable', 'future-status']))).toMatchObject({ accepted: true, declared: 3, resolved: 0 })
      expect(registry.snapshot().contributions.map(entry => entry.status)).toEqual(['declared_not_selected', 'unavailable', 'unavailable'])
      expect(registry.list(PANEL_KIND)).toEqual([])
      expect(fetchBundle).not.toHaveBeenCalled()
      expect(importModule).not.toHaveBeenCalled()
    } finally { await registry.clear() }
  })
})

it('keeps the published registry revision while withholding required unsupported host presentation', async () => {
  const real = createPluginRegistry({ kinds, regions, runtimes: { react: '19.2.4' }, stylesheets: false })
  const panels = { reconcile: vi.fn(), releaseScope: vi.fn() }
  const runtime = createPluginHostRuntime({
    registry: real, scope: { appId: 'app', environmentId: 'test', clientId: 'browser' },
    catalog: createSlotCatalog({ kinds: [], regions: [], reserved: () => false }),
    isolation: store<AppIsolationSnapshot>({ appId: 'app', effectiveMode: 'main-origin', revision: '1' }),
    renderContext: store<Readonly<Record<string, unknown>>>({}), panels, diagnostics: vi.fn(),
  })
  const release = runtime.retain(), snapshot = runtime.getSnapshot(), calls = panels.reconcile.mock.calls.length
  try {
    const input = await document(['declared_not_selected'])
    input.contributions[PANEL_KIND]!['notes/declared_not_selected']!.required = true
    const result = await runtime.sync(input)
    expect(result.registryResult).toMatchObject({ accepted: true, resolved: 0 })
    expect(real.snapshot().revision).toBe(1)
    expect(result.planning).toMatchObject({ accepted: false, refusals: [{ reason: 'unsupported-kind', required: true, ref: { kind: PANEL_KIND } }] })
    expect(runtime.getSnapshot()).toBe(snapshot)
    expect(panels.reconcile).toHaveBeenCalledTimes(calls)
  } finally { release(); runtime.dispose(); await real.clear() }
})
