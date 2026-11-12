import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { generateBindingTable, serializeBindingTable } from '@hollis-labs/design-bindings'
import {
  ManifestShell, applyBindingTable, bindingDiagnostics, createBindingStore, createRendererSelector, loadBindingTable,
  type ManifestShellProps,
} from '../src'
import { catalog, GOLDEN_KINDS, hadron } from './binding-fixtures'
import { admin, manifest, pages, pluginActions, views } from './fixtures'

const demand = GOLDEN_KINDS.map(kind => ({ kind, version: '1', origin: 'host' as const }))
const table = () => JSON.parse(serializeBindingTable(generateBindingTable({ catalog, profile: hadron, demand })))

describe('generated binding table, consumed', () => {
  it('resolves every kind in the SF-6 goldens through a Hadron-shaped table', () => {
    const loaded = loadBindingTable(table())
    if (!loaded.ok) throw new Error('table did not load')
    const select = createRendererSelector(loaded.bindings)
    for (const kind of GOLDEN_KINDS) {
      const r = select(kind, '1', 'host')
      expect(r.ok, kind).toBe(true)
      if (r.ok) expect(r.binding.rendererId).toBe(`kit.${kind}`)
    }
    expect(loaded.bindings.unresolved).toEqual([])
  })

  it('misses explicitly for an unknown kind, an unknown version and an origin the profile does not permit', () => {
    const t = generateBindingTable({
      catalog, profile: hadron,
      demand: [...demand, { kind: 'hologram', version: '1' }, { kind: 'page.form', version: '1', origin: 'agent' }],
    })
    const loaded = loadBindingTable(JSON.parse(serializeBindingTable(t)))
    if (!loaded.ok) throw new Error('table did not load')
    const select = createRendererSelector(loaded.bindings)
    expect(select('hologram', '1', 'host')).toMatchObject({ ok: false, code: 'unclassified' })
    expect(select('page.form', '1', 'agent')).toMatchObject({ ok: false, code: 'quarantined', fallbackRendererId: null })
    expect(select('page.form', '2', 'host')).toMatchObject({ ok: false, code: 'unavailable' })
    expect(select('page.form', '1', 'host').ok).toBe(true)
    expect(bindingDiagnostics(loaded.bindings).map(d => [d.code, d.key])).toEqual([
      ['unresolved-binding', 'hologram@1'], ['unresolved-binding', 'page.form@1'],
    ])
  })

  it('refuses a table whose content no longer matches its version, or that is not the format', () => {
    expect(loadBindingTable({ ...table(), profile: 'edited' })).toMatchObject({ ok: false })
    expect(loadBindingTable({ ...table(), format: 'other' })).toMatchObject({ ok: false })
    expect(loadBindingTable(null)).toMatchObject({ ok: false })
  })

  it('swaps live through the versioned store, and the same version is a no-op', () => {
    const store = createBindingStore()
    expect(createRendererSelector(store.get())('page.form', '1', 'host')).toMatchObject({ ok: false, code: 'unclassified' })
    let notified = 0
    store.subscribe(() => { notified += 1 })
    expect(applyBindingTable(store, table())).toEqual([])
    expect(applyBindingTable(store, table())).toEqual([])
    expect(store.version()).toBe(1)
    expect(notified).toBe(1)
    expect(applyBindingTable(store, { nope: true })[0]?.code).toBe('malformed-binding-table')
    expect(store.version()).toBe(1)
  })
})

describe('shell with a binding store', () => {
  const mount = (over: Partial<ManifestShellProps>) =>
    render(<ManifestShell manifest={manifest} admin={admin} apiBase="/api" path="/" onNavigate={() => {}} views={views} pages={pages} isNarrow={false} actions={pluginActions()} {...over} />)

  it('shows unresolved bindings as shell diagnostics, and a swapped table updates them', () => {
    const store = createBindingStore()
    applyBindingTable(store, JSON.parse(serializeBindingTable(generateBindingTable({ catalog, profile: hadron, demand: [{ kind: 'hologram', version: '1' }] }))))
    mount({ bindings: store })
    fireEvent.click(screen.getByRole('button', { name: /Diagnostics \(1\)/ }))
    expect(within(screen.getByTestId('diagnostics')).getByText(/unknown-kind/)).toBeTruthy()
    act(() => { applyBindingTable(store, table()) })
    expect(screen.getByRole('button', { name: /^Diagnostics$/ })).toBeTruthy()
  })
})
