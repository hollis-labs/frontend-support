import { afterEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { ManifestShell, planNarrowNav, type FrontendManifest, type ManifestItem } from '../src'
import { buildShellModel } from '../src/model'
import { admin } from './fixtures'

const it_ = (i: Partial<ManifestItem> & Pick<ManifestItem, 'kind' | 'key'>): ManifestItem => ({ module: 'console', ...i })
const nav = (key: string, label: string, over: Partial<ManifestItem> = {}) => [
  it_({ kind: 'nav.item', key, label, route: `/${key}`, ...over }),
  it_({ kind: 'surface', key, route: `/${key}`, layout: 'list', title: label }),
]
const make = (items: ManifestItem[]): FrontendManifest => ({ manifest_version: 0, app: 'hadron', bindings: [], regions: [], items })

/** Five primary items, a plugin group and a footer item: more than four destinations, so More exists. */
const big = make([
  ...nav('home', 'Home'), ...nav('items', 'Items'), ...nav('runs', 'Runs'), ...nav('logs', 'Logs'), ...nav('keys', 'Keys'),
  it_({ kind: 'nav.group', key: 'plug', label: 'Billing' }),
  ...nav('invoices', 'Invoices', { region: 'nav.group:plug' }),
  ...nav('help', 'Help', { region: 'nav.footer' }),
])
const small = make([...nav('home', 'Home'), ...nav('items', 'Items'), ...nav('help', 'Help', { region: 'nav.footer' })])

const widthQuery = (width: number) => {
  window.matchMedia = ((q: string) => ({
    matches: q === '(max-width: 1023px)' && width <= 1023, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
const mount = (m: FrontendManifest, path = '/home', onNavigate: (p: string) => void = () => {}) =>
  render(<ManifestShell manifest={m} admin={admin} apiBase="/api" path={path} onNavigate={onNavigate} />)
const tabs = () => [...screen.getByRole('navigation', { name: 'Primary' }).querySelectorAll('[data-nav-tab]')].map(e => e.textContent)

afterEach(() => { widthQuery(1440) })

describe('narrow navigation', () => {
  it.each([[390, 'tabs'], [320, 'tabs'], [768, 'tabs'], [1023, 'tabs'], [1024, 'rail'], [1440, 'rail']])('at %ipx the nav is in %s mode', (width, mode) => {
    widthQuery(width)
    mount(big)
    const navEl = screen.getByRole('navigation', { name: 'Primary' })
    expect(navEl.getAttribute('data-nav-mode') === 'tabs' ? 'tabs' : 'rail').toBe(mode)
    if (mode === 'tabs') expect(tabs()).toEqual(['Home', 'Items', 'Runs', 'More'])
    else {
      expect(['Home', 'Items', 'Runs', 'Logs', 'Keys', 'Billing', 'Invoices', 'Help'].every(l => within(navEl).queryByText(l))).toBe(true)
      expect(navEl.className).toContain('w-60')
    }
  })

  it('shows every destination and no More at four or fewer', () => {
    widthQuery(390)
    mount(small)
    expect(tabs()).toEqual(['Home', 'Items', 'Help'])
  })

  it('More lists the remaining primary items, then groups, then the footer, then diagnostics', () => {
    widthQuery(390)
    mount(big)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const sheet = screen.getByRole('dialog', { name: 'More' })
    const order = [...sheet.querySelectorAll('a, h2, button')].map(e => e.textContent)
    expect(order).toEqual(['Logs', 'Keys', 'Billing', 'Invoices', 'Help', 'Diagnostics'])
  })

  it('marks the More tab and the sheet item when the active page lives in More', () => {
    widthQuery(390)
    mount(big, '/keys')
    const more = screen.getByRole('button', { name: 'More' })
    expect(more.getAttribute('aria-current')).toBe('page')
    fireEvent.click(more)
    expect(within(screen.getByRole('dialog', { name: 'More' })).getByText('Keys').closest('a')!.getAttribute('aria-current')).toBe('page')
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).getByText('Home').closest('a')!.getAttribute('aria-current')).toBeNull()
  })

  it('marks the active tab', () => {
    widthQuery(390)
    mount(big, '/items')
    expect(within(screen.getByRole('navigation', { name: 'Primary' })).getByText('Items').closest('a')!.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'More' }).getAttribute('aria-current')).toBeNull()
  })

  it('Esc closes the sheet and focus returns to the More tab', async () => {
    widthQuery(390)
    mount(big)
    const more = screen.getByRole('button', { name: 'More' })
    fireEvent.click(more)
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'More' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => {})
    expect(document.activeElement).toBe(more)
  })

  it('scrim closes the sheet; navigating from it closes it too', () => {
    widthQuery(390)
    const go: string[] = []
    const { rerender } = mount(big, '/home', p => go.push(p))
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.click(document.querySelector('[data-nav-scrim]')!)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'More' })).getByText('Logs'))
    expect(go).toEqual(['/logs'])
    rerender(<ManifestShell manifest={big} admin={admin} apiBase="/api" path="/logs" onNavigate={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('traps Tab inside the sheet', () => {
    widthQuery(390)
    mount(big)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const sheet = screen.getByRole('dialog', { name: 'More' })
    const last = sheet.querySelectorAll<HTMLElement>('a, button')
    last[last.length - 1]!.focus()
    fireEvent.keyDown(last[last.length - 1]!, { key: 'Tab' })
    expect(document.activeElement).toBe(last[0])
  })

  it('hides the tab bar while a text field has focus and restores it on blur', async () => {
    widthQuery(390)
    render(<><input aria-label="field" /><ManifestShell manifest={big} admin={admin} apiBase="/api" path="/home" onNavigate={() => {}} /></>)
    const bar = screen.getByRole('navigation', { name: 'Primary', hidden: true })
    expect(bar.hidden).toBe(false)
    await act(async () => { screen.getByLabelText('field').focus() })
    expect(bar.hidden).toBe(true)
    await act(async () => { screen.getByLabelText('field').blur(); await new Promise(r => setTimeout(r, 5)) })
    expect(bar.hidden).toBe(false)
  })

  it('renders no nav at all when the app has none', () => {
    widthQuery(390)
    mount(make([...nav('home', 'Home').slice(1)]), '/home')
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull()
  })

  it('planNarrowNav keeps the order: first three primary items, then the rest', () => {
    const m = buildShellModel(big, { admin, viewNames: new Set() })
    const plan = planNarrowNav(m.navPrimary, m.navFooter)
    expect(plan.tabs.map(l => l.item.key)).toEqual(['home', 'items', 'runs'])
    expect(plan.more!.primary.map(l => l.item.key)).toEqual(['logs', 'keys'])
  })
})
