// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createSlotCatalog } from '../src/catalog.js'
import { PluginDeclarativeBody, PluginHostProvider, WidgetRenderer, usePluginSlots } from '../src/react.js'
import { harness } from './helpers.js'
afterEach(cleanup)
function catalog() {
  return createSlotCatalog({
    kinds: [{ kind: 'host.example.notice', schemaVersion: 1, role: 'contribution', representations: ['declarative'], regions: ['inline'],
      validate: entry => typeof (entry.declarative as { message?: unknown } | undefined)?.message === 'string',
      project: entry => ({ label: 'Notice', region: 'inline', data: { message: (entry.declarative as { message: string }).message }, props: { session_id: 'spoof' } }) }],
    regions: [{ name: 'inline', representation: 'declarative', kinds: ['host.example.notice'], widgetKinds: [], ordering: 'manifest' }], reserved: () => false,
  })
}
it('renders host-validated declarative data in frame mode without executing a plugin component and fences unload', async () => {
  const execute = vi.fn(() => <p>Executable export</p>), binding = vi.fn((data: unknown, _view: unknown, props: Readonly<Record<string, unknown>>) => <p>{(data as { message: string }).message}:{String(props.session_id)}</p>)
  const h = harness(execute, catalog())
  const entry = { ...h.entry() }; delete entry.component
  await h.runtime.sync([{ ...entry, kind: 'host.example.notice', representation: 'declarative', declarative: { message: 'Validated', private_extra: 'discarded' } }])
  h.isolation.set({ appId: 'app', effectiveMode: 'sandboxed-frame', revision: '2' })
  function Inline() { const entries = usePluginSlots('inline'); return <>{entries.map(view => <PluginDeclarativeBody key={view.id} view={view} render={binding} />)}</> }
  render(<PluginHostProvider runtime={h.runtime}><Inline /></PluginHostProvider>)
  expect(screen.getByText('Validated:host-session')).toBeTruthy()
  expect(JSON.stringify(h.runtime.getSnapshot().views[0]?.data)).not.toContain('discarded')
  expect(execute).not.toHaveBeenCalled()
  const old = h.runtime.getSnapshot().views[0]!
  await act(() => h.runtime.sync([]))
  expect(screen.queryByText('Validated:host-session')).toBeNull()
  expect(h.runtime.isCurrent(old)).toBe(false)
})
it('keeps invalid declarative metadata out of the renderer', async () => {
  const h = harness(() => null, catalog()), binding = vi.fn(() => <p>Unexpected</p>)
  const entry = { ...h.entry() }; delete entry.component
  await h.runtime.sync([{ ...entry, kind: 'host.example.notice', representation: 'declarative', declarative: { message: 42 }, metadata: { private: 'not shown' } }])
  h.runtime.retain()
  const fallback = h.runtime.getSnapshot().views[0]!
  render(<PluginHostProvider runtime={h.runtime}><PluginDeclarativeBody view={fallback} render={binding} /></PluginHostProvider>)
  expect(screen.getByText('Plugin contribution unavailable.')).toBeTruthy()
  expect(binding).not.toHaveBeenCalled()
  expect(fallback.refusal?.reason).toBe('invalid-metadata')
})
it('isolates a failing host binding without exposing error internals', async () => {
  const noise = vi.spyOn(console, 'error').mockImplementation(() => {})
  const h = harness(() => null, catalog())
  const entry = { ...h.entry() }; delete entry.component
  await h.runtime.sync([{ ...entry, kind: 'host.example.notice', representation: 'declarative', declarative: { message: 'Valid' } }]); h.runtime.retain()
  render(<PluginHostProvider runtime={h.runtime}><PluginDeclarativeBody view={h.runtime.getSnapshot().views[0]!} render={() => { throw new Error('private internals') }} /><p>Healthy sibling</p></PluginHostProvider>)
  expect(screen.getByText('Plugin view failed.')).toBeTruthy()
  expect(screen.getByText('Healthy sibling')).toBeTruthy()
  expect(screen.queryByText('private internals')).toBeNull()
  noise.mockRestore()
})
it('never treats a regular component panel as a widget', () => {
  const execute = vi.fn(() => <p>Panel export</p>), h = harness(execute); h.runtime.retain()
  render(<PluginHostProvider runtime={h.runtime}><WidgetRenderer widget={h.runtime.getSnapshot().views[0]} /></PluginHostProvider>)
  expect(screen.getByText('Widget unavailable.')).toBeTruthy()
  expect(execute).not.toHaveBeenCalled()
})
