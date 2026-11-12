import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { ManifestShell, buildShellModel, createShellPluginHost, type FrontendManifest, type ManifestShellProps } from '../src'
import { admin, manifest, pages, views } from './fixtures'

const tab = (key: string, label: string) => ({ module: 'console', kind: 'dock.tab', key, label, view: 'inspector', region: 'shell.right' })
const twoTabs: FrontendManifest = {
  ...manifest,
  items: [...manifest.items,
    tab('logs', 'Logs'),
    { module: 'console', kind: 'slot', key: 'logs-toggle', label: 'Logs', region: 'shell.header', opens: 'logs' }],
}
const mount = (over: Partial<ManifestShellProps> = {}) =>
  render(<ManifestShell manifest={twoTabs} admin={admin} apiBase="/api" path="/" onNavigate={() => {}} views={views} pages={pages} isNarrow={false} {...over} />)
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const dialogs = () => screen.queryAllByRole('dialog').map(d => d.getAttribute('aria-label'))

describe('dock attributes', () => {
  it('defaults: hidden, not exclusive, one size, Esc, bottom sheet on mobile', () => {
    const model = buildShellModel(twoTabs, { admin })
    expect(model.docks[0]!.attributes).toEqual({ openState: 'hidden', exclusive: false, sizes: { options: ['md'], default: 'md' }, dismissKey: 'Esc', mobile: 'bottom-sheet' })
    mount()
    expect(dialogs()).toEqual([])
    click('Inspector'); click('Logs')
    expect(dialogs()).toEqual(['Inspector', 'Logs'])
  })
  it('exclusive: opening a tab closes the region\'s other tab', () => {
    mount({ dockAttributes: { 'shell.right': { exclusive: true } } })
    click('Inspector'); click('Logs')
    expect(dialogs()).toEqual(['Logs'])
  })
  it('a slot toggles its tab closed again', () => {
    mount()
    click('Inspector')
    expect(dialogs()).toEqual(['Inspector'])
    click('Inspector')
    expect(dialogs()).toEqual([])
  })
  it('openState open starts the region with its first tab showing', () => {
    mount({ dockAttributes: { 'shell.right': { openState: 'open' } } })
    expect(dialogs()).toEqual(['Inspector'])
    expect(screen.getAllByText('inspector body').length).toBeGreaterThan(0)
  })
  it('sizes: default token class, user choice applied and remembered', () => {
    const mem = new Map<string, string>()
    const storage = { read: (k: string) => mem.get(k) ?? null, write: (k: string, v: string) => { mem.set(k, v) }, remove: (k: string) => { mem.delete(k) } }
    const attrs = { 'shell.right': { sizes: { options: ['sm', 'md', 'lg'] as const, default: 'sm' as const } } }
    const first = mount({ dockAttributes: attrs, dockStorage: storage })
    click('Inspector')
    const dlg = () => screen.getByRole('dialog', { name: 'Inspector' })
    expect(dlg().getAttribute('data-size')).toBe('sm')
    fireEvent.click(within(dlg()).getByRole('button', { name: 'Size lg' }))
    expect(dlg().getAttribute('data-size')).toBe('lg')
    expect([...mem.values()]).toEqual(['lg'])
    first.unmount()
    mount({ dockAttributes: attrs, dockStorage: storage })
    click('Inspector')
    expect(dlg().getAttribute('data-size')).toBe('lg')
  })
  it('a remembered size outside the region\'s options is ignored', () => {
    const storage = { read: () => 'lg', write: () => {}, remove: () => {} }
    mount({ dockAttributes: { 'shell.right': { sizes: { options: ['sm', 'md'], default: 'md' } } }, dockStorage: storage })
    click('Inspector')
    expect(screen.getByRole('dialog', { name: 'Inspector' }).getAttribute('data-size')).toBe('md')
  })
  it('mobile: a bottom sheet at 390, with no size controls', () => {
    mount({ isNarrow: true, dockAttributes: { 'shell.right': { sizes: { options: ['sm', 'md'], default: 'md' } } } })
    click('Inspector')
    const dlg = screen.getByRole('dialog', { name: 'Inspector' })
    expect(dlg.getAttribute('data-presentation')).toBe('bottom-sheet')
    expect(within(dlg).queryByRole('button', { name: /^Size/ })).toBeNull()
  })
  it('Esc closes the most recently opened of overlays and docks, and focus returns to each trigger', async () => {
    mount()
    const inspector = screen.getByRole('button', { name: 'Inspector' })
    inspector.focus(); fireEvent.click(inspector)
    const diag = screen.getByRole('button', { name: /Diagnostics/ })
    diag.focus(); fireEvent.click(diag)
    expect(dialogs()).toEqual(['Inspector', 'Diagnostics'])
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dialogs()).toEqual(['Inspector'])
    await act(async () => { await Promise.resolve() })
    expect(document.activeElement).toBe(diag)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dialogs()).toEqual([])
    await act(async () => { await Promise.resolve() })
    expect(document.activeElement).toBe(inspector)
  })
  it('docked regions are outside the overlay stack: two docks plus two overlays are all allowed', () => {
    mount()
    click('Inspector'); click('Logs')
    click('Diagnostics')
    expect(dialogs()).toHaveLength(3)
  })
  it('refuses invalid attributes and attributes for a region that is not docked, with diagnostics', () => {
    const model = buildShellModel(twoTabs, { admin, dockAttributes: {
      'shell.right': { sizes: { options: ['sm'], default: 'lg' } },
      'shell.header': { exclusive: true },
    } })
    expect(model.diagnostics.map(d => d.code).sort()).toEqual(['invalid-dock-attributes', 'unknown-region'])
    expect(model.docks[0]!.attributes.sizes.default).toBe('md')
  })
})

describe('plugin-host-ui registration', () => {
  it('registers every placed contribution by kind and the host publishes them', () => {
    const model = buildShellModel(manifest, { admin })
    const { runtime } = createShellPluginHost('hadron', model, { views, apiBase: '/api' })
    const release = runtime.retain()
    const snap = runtime.getSnapshot()
    expect(snap.refusals).toEqual([])
    expect([...new Set(snap.views.map(v => v.ref.kind))].sort()).toEqual(['dock.tab', 'nav.group', 'nav.item', 'panel', 'settings.region', 'slot', 'surface', 'widget'])
    expect(snap.views.every(v => v.availability === 'available')).toBe(true)
    expect(snap.views.find(v => v.ref.kind === 'dock.tab')!.region).toBe('shell.right')
    release()
  })
  it('a removed contribution is gone from the host with no code change', () => {
    const slim: FrontendManifest = { ...manifest, items: manifest.items.filter(i => i.key !== 'activity') }
    const { runtime } = createShellPluginHost('hadron', buildShellModel(slim, { admin }), { views, apiBase: '/api' })
    runtime.retain()
    expect(runtime.getSnapshot().views.some(v => v.ref.kind === 'panel')).toBe(false)
  })
  it('lists a contribution the host refuses as a diagnostic (owner "core" is reserved by plugin-host-ui)', () => {
    const core: FrontendManifest = { ...manifest, items: [...manifest.items, { module: 'core', kind: 'panel', key: 'reserved', label: 'Reserved', view: 'activity' }] }
    mount({ manifest: core })
    click('Diagnostics (1)')
    expect(within(screen.getByTestId('diagnostics')).getByText(/plugin-host-ui refused panel reserved: reserved/)).toBeTruthy()
  })
  it('reports host diagnostics to the app', () => {
    const events: unknown[] = []
    const core: FrontendManifest = { ...manifest, items: [...manifest.items, { module: 'core', kind: 'panel', key: 'reserved', label: 'Reserved', view: 'activity' }] }
    mount({ manifest: core, onHostDiagnostic: e => events.push(e) })
    expect(events.length).toBeGreaterThan(0)
  })
})
