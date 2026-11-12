import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  ManifestShell, RowActions, buildShellModel, type BackendRequest, type FrontendManifest, type ManifestItem, type PageComponent, type ShellActions,
} from '../src'
import { admin, manifest, pluginActions, views } from './fixtures'

const mi = (i: Partial<ManifestItem> & Pick<ManifestItem, 'kind' | 'key'>): ManifestItem => ({ module: 'console', ...i })

const withItems = (...items: ManifestItem[]): FrontendManifest => ({ ...manifest, items: [...manifest.items, ...items] })

const menuItems = [
  mi({ kind: 'command', key: 'go-items', label: 'Go to items', keywords: ['list'], group: 'Navigate', action: { navigate: '/items' } }),
  mi({ kind: 'command', key: 'wipe', label: 'Wipe cache', risk: 'high', action: { call: 'items.remove', input: { all: true } } }),
  mi({ kind: 'command', key: 'open-inspector', label: 'Open inspector', order: 5, action: { openRegion: 'shell.right', tab: 'inspector' } }),
  mi({ kind: 'menu.item', key: 'stop', label: 'Stop', region: 'row.actions', order: 20, action: { call: 'items.stop' } }),
  mi({ kind: 'menu.item', key: 'remove', label: 'Remove', region: 'row.actions', order: 1, risk: 'high', action: { call: 'items.remove' } }),
  mi({ kind: 'menu.item', key: 'restart', label: 'Restart', region: 'row.actions', order: 10, action: { call: 'items.restart' } }),
  mi({ kind: 'menu.item', key: 'copy-id', label: 'Copy id', region: 'menu:item', when: 'item', action: { call: 'items.restart' } }),
  mi({ kind: 'menu.item', key: 'refresh', label: 'Refresh', region: 'toolbar.primary', action: { call: 'items.restart' } }),
  mi({ kind: 'menu.item', key: 'purge', label: 'Purge', region: 'toolbar.primary', risk: 'high', action: { call: 'items.remove' } }),
]

describe('menu model', () => {
  it('orders by order, module, key with high risk last; invalid items degrade to diagnostics', () => {
    const m = buildShellModel(withItems(
      ...menuItems,
      mi({ kind: 'menu.item', key: 'a-first', label: 'A', region: 'row.actions', order: 10, action: { call: 'x' } }),
      mi({ module: 'aaa', kind: 'menu.item', key: 'z-same', label: 'Z', region: 'row.actions', order: 10, action: { call: 'x' } }),
      mi({ kind: 'menu.item', key: 'bad-url', label: 'Bad', region: 'row.actions', action: { navigate: 'https://evil.example/' } }),
      mi({ kind: 'menu.item', key: 'bad-two', label: 'Two', region: 'row.actions', action: { navigate: '/items', call: 'x' } }),
      mi({ kind: 'menu.item', key: 'bad-region', label: 'Region', region: 'nowhere', action: { call: 'x' } }),
      mi({ kind: 'menu.item', key: 'bad-when', label: 'When', region: 'row.actions', when: 'item', action: { call: 'x' } }),
      mi({ kind: 'menu.item', key: 'bad-tab', label: 'Tab', region: 'row.actions', action: { openRegion: 'shell.right', tab: 'nope' } }),
      mi({ kind: 'menu.item', key: 'no-label', region: 'row.actions', action: { call: 'x' } }),
    ), { })
    expect(m.menus.rowActions.map(e => `${e.item.module}/${e.item.key}`)).toEqual(['aaa/z-same', 'console/a-first', 'console/restart', 'console/stop', 'console/remove'])
    expect(m.menus.palette.map(e => e.item.key)).toEqual(['open-inspector', 'go-items', 'wipe'])
    expect(m.menus.context.item.map(e => e.item.key)).toEqual(['copy-id'])
    expect(m.menus.toolbar.map(e => e.item.key)).toEqual(['refresh', 'purge'])
    const bad = m.diagnostics.filter(d => ['bad-url', 'bad-two', 'bad-region', 'bad-when', 'bad-tab', 'no-label'].includes(d.key ?? ''))
    expect(bad.map(d => d.key).sort()).toEqual(['bad-region', 'bad-tab', 'bad-two', 'bad-url', 'bad-when', 'no-label'])
  })
})

function mount(over: Partial<ShellActions> = {}, pages: Record<string, PageComponent> = {}, m = withItems(...menuItems)) {
  const requests: BackendRequest[] = []
  const navigate = vi.fn()
  const actions = pluginActions({
    backend: { execute: async req => { requests.push(req); return { status: 'ok' } } },
    ...over,
  })
  render(<ManifestShell manifest={m} admin={admin} apiBase="/api" path="/items" onNavigate={navigate} views={views} pages={pages} isNarrow={false} actions={actions} />)
  return { requests, navigate }
}

describe('command palette', () => {
  it('opens with Ctrl+K, filters by keyword, navigates through the gateway', async () => {
    const { navigate } = mount()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    const dialog = await screen.findByRole('dialog')
    const input = within(dialog).getByRole('combobox')
    fireEvent.change(input, { target: { value: 'list' } })
    expect(within(dialog).getAllByRole('option')).toHaveLength(1)
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/items'))
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).toBeNull()
  })
  it('lists high-risk commands last, and a high-risk command asks for confirmation before anything runs', async () => {
    const { requests } = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Command palette' }))
    const dialog = await screen.findByRole('dialog')
    const options = within(dialog).getAllByRole('option')
    expect(options.map(o => o.textContent)).toEqual([expect.stringContaining('Open inspector'), expect.stringContaining('Go to items'), expect.stringContaining('Wipe cache')])
    fireEvent.click(options[2])
    const confirm = await screen.findByRole('alertdialog')
    expect(requests).toHaveLength(0)
    fireEvent.click(within(confirm).getByRole('button', { name: 'Confirm' }))
    await screen.findByText('Done')
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({ function: 'items.remove', input: { all: true }, action: { risk: 'high', confirmation: 'grant-xyz' } })
  })
  it('openRegion opens the dock tab', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Command palette' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByText('Open inspector'))
    await screen.findByText('inspector body')
  })
  it('a backend needs_confirmation reply is exercised for a medium call', async () => {
    let n = 0
    const { requests } = mount({ backend: { execute: async () => (++n === 1 ? { status: 'needs_confirmation', confirm: { what: 'Restart everything', scope: ['all'], ttlMs: 60000 } } : { status: 'ok' }) } },
      {}, withItems(mi({ kind: 'command', key: 'restart-all', label: 'Restart all', action: { call: 'items.restart' } })))
    void requests
    fireEvent.click(screen.getByRole('button', { name: 'Command palette' }))
    fireEvent.click(await screen.findByText('Restart all'))
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText('Restart everything')).toBeTruthy()
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    await screen.findByText('Canceled')
  })
  it('an unknown call function is refused by the gateway, not crashed', async () => {
    mount({}, {}, withItems(mi({ kind: 'command', key: 'ghost', label: 'Ghost', action: { call: 'nope.fn' } })))
    fireEvent.click(screen.getByRole('button', { name: 'Command palette' }))
    fireEvent.click(await screen.findByText('Ghost'))
    await screen.findByText('Refused')
  })
})

const openRow = () => {
  const t = screen.getByRole('button', { name: 'Row actions', hidden: true })
  fireEvent.pointerDown(t, { button: 0, pointerType: 'mouse' })
  fireEvent.mouseDown(t, { button: 0 })
  fireEvent.pointerUp(t, { button: 0, pointerType: 'mouse' })
  fireEvent.mouseUp(t, { button: 0 })
  fireEvent.click(t, { button: 0 })
}

describe('row actions, context menus and toolbar', { timeout: 120_000 }, () => {
  const Rows: PageComponent = () => <div><RowActions subject={{ kind: 'item', id: 'notes' }} /></div>
  it('row actions overflow lists row.actions then the subject menu, high risk last behind a separator', async () => {
    const { requests } = mount({}, { items: Rows })
    openRow()
    const items = await screen.findAllByRole('menuitem', { hidden: true })
    expect(items.map(i => i.textContent)).toEqual(['Restart', 'Stop', 'Copy id', 'Remove'])
    expect(screen.getAllByRole('separator', { hidden: true }).length).toBeGreaterThan(0)
    fireEvent.click(items[1])
    await screen.findByText('Done')
    expect(requests[0]).toMatchObject({ function: 'items.stop', action: { risk: 'low', subject: { kind: 'item', id: 'notes' } } })
  })
  it('a destructive row action goes through the confirmation overlay', async () => {
    const { requests } = mount({}, { items: Rows })
    openRow()
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove', hidden: true }))
    const confirm = await screen.findByRole('alertdialog')
    expect(requests).toHaveLength(0)
    fireEvent.click(within(confirm).getByRole('button', { name: 'Confirm' }))
    await screen.findByText('Done')
    expect(requests[0].action.subject).toEqual({ kind: 'item', id: 'notes' })
  })
  it('the toolbar renders toolbar.primary with the high-risk entry after a separator', async () => {
    const { requests } = mount()
    const bar = screen.getByRole('toolbar', { name: 'Primary actions' })
    expect(within(bar).getAllByRole('button').map(b => b.textContent)).toEqual(['Refresh', 'Purge'])
    expect(within(bar).getByRole('separator')).toBeTruthy()
    fireEvent.click(within(bar).getByRole('button', { name: 'Refresh' }))
    await screen.findByText('Done')
    expect(requests[0].function).toBe('items.restart')
  })
  it('without actions, nothing renders and Diagnostics says why', () => {
    render(<ManifestShell manifest={withItems(...menuItems)} admin={admin} apiBase="/api" path="/items" onNavigate={() => {}} views={views} isNarrow={false} />)
    expect(screen.queryByRole('toolbar')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Command palette' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Diagnostics/ }))
    expect(screen.getByText(/pass `actions`/)).toBeTruthy()
  })
})
