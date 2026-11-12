import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { defineBindingTable } from '@hollis-labs/design-bindings'
import { ManifestShell, createRendererSelector, type ManifestShellProps } from '../src'
import { admin, manifest, pages, pluginActions, views } from './fixtures'

const mount = (over: Partial<ManifestShellProps> = {}) =>
  render(<ManifestShell manifest={manifest} admin={admin} apiBase="/api" path="/" onNavigate={() => {}} views={views} pages={pages} isNarrow={false} actions={pluginActions()} {...over} />)

describe('ManifestShell', () => {
  it('renders each contribution in its region at 1440', () => {
    mount()
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).getByText('Operations')).toBeTruthy()
    expect(screen.getByText('Help')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(screen.getByText('health body')).toBeTruthy()
    expect(screen.getByText('activity body')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Inspector' })).toBeTruthy()
  })
  it('opens a docked tab as a side panel at 1440 and a bottom sheet at 390', () => {
    const { unmount } = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Inspector' }))
    expect(screen.getByRole('dialog', { name: 'Inspector' }).getAttribute('data-presentation')).toBe('side')
    unmount()
    mount({ isNarrow: true })
    fireEvent.click(screen.getByRole('button', { name: 'Inspector' }))
    expect(screen.getByRole('dialog', { name: 'Inspector' }).getAttribute('data-presentation')).toBe('bottom-sheet')
  })
  it('Esc closes the topmost overlay and returns focus to its trigger', async () => {
    mount()
    const trigger = screen.getByRole('button', { name: 'Inspector' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await Promise.resolve()
    expect(document.activeElement).toBe(trigger)
  })
  it('stacks a dock over the diagnostics drawer (depth 2)', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Inspector' }))
    fireEvent.click(screen.getByRole('button', { name: /Diagnostics/ }))
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
  })
  it('renders list and detail page fixtures', () => {
    const { unmount } = mount({ path: '/items' })
    expect(screen.getByText('hollis · 0.9.0 · per-thread notes')).toBeTruthy()
    unmount()
    mount({ path: '/items/detail' })
    expect(screen.getByLabelText('Name')).toBeTruthy()
  })
  it('renders settings sections from the admin manifest', () => {
    mount({ path: '/settings' })
    expect(screen.getByText('General settings')).toBeTruthy()
  })
  it('shows an unknown schema version as a visible error, not a shell', () => {
    mount({ manifest: { ...manifest, manifest_version: 7 } })
    expect(screen.getByRole('alert').textContent).toContain('manifest_version 7')
    expect(screen.queryByRole('navigation')).toBeNull()
  })
  it('lists skipped contributions in the diagnostics panel and still starts', () => {
    mount({ manifest: { ...manifest, items: [...manifest.items, { module: 'x', kind: 'hologram', key: 'h' }] } })
    fireEvent.click(screen.getByRole('button', { name: /Diagnostics \(1\)/ }))
    expect(within(screen.getByTestId('diagnostics')).getByText(/unknown-kind/)).toBeTruthy()
  })
  it('drops nav, panels and settings when the module leaves the manifest', () => {
    mount({ manifest: { ...manifest, items: [] }, path: '/settings' })
    expect(screen.queryByText('Operations')).toBeNull()
    expect(screen.queryByText('activity body')).toBeNull()
    expect(screen.getByText('Page not found')).toBeTruthy()
  })
})

describe('renderer selection', () => {
  const table = defineBindingTable({
    contractDigest: 'test', resolverConfig: { inlinePayloadLimitBytes: 1024 }, trust: () => ({ admit: 'host-primitive' }),
    rows: [{ kind: 'card.info', version: '1', rendererId: 'info', rendererClass: 'declarative', entry: 'kit#Info', payload: { from: 'data' }, requestedIsolation: 'host-primitive', fallback: { kind: 'none' } }],
  })
  it('resolves kind@version through design-bindings and reports misses', () => {
    const select = createRendererSelector(table)
    expect(select('card.info', '1', 'host').ok).toBe(true)
    expect(select('card.info', '2', 'host')).toMatchObject({ ok: false, code: 'unavailable' })
    expect(select('card.other', '1', 'host')).toMatchObject({ ok: false, code: 'unclassified' })
    expect(createRendererSelector(undefined)('card.info', '1', 'host')).toMatchObject({ ok: false })
  })
})
