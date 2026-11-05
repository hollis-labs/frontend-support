import { describe, expect, it } from 'vitest'
import { buildShellModel, parseFrontendManifest, type FrontendManifest } from '../src'
import { admin, manifest } from './fixtures'

const without = (m: FrontendManifest, module: string): FrontendManifest => ({ ...m, items: m.items.filter(i => i.module !== module) })
const codes = (m: FrontendManifest, opts = {}) => buildShellModel(m, { admin, ...opts }).diagnostics.map(d => d.code)

describe('parseFrontendManifest', () => {
  it('accepts version 0', () => expect(parseFrontendManifest(manifest).ok).toBe(true))
  it('refuses an unknown manifest version with a diagnostic', () => {
    const r = parseFrontendManifest({ ...manifest, manifest_version: 1 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.diagnostics[0].code).toBe('unsupported-manifest-version')
  })
  it('refuses a non-object', () => expect(parseFrontendManifest('x').ok).toBe(false))
})

describe('buildShellModel', () => {
  const m = buildShellModel(manifest, { admin })
  it('places each of the 8 kinds in its region without diagnostics', () => {
    expect(m.diagnostics).toEqual([])
    expect(m.navPrimary.map(n => n.type === 'group' ? n.item.key : n.link.item.key)).toEqual(['ops', 'home'])
    const ops = m.navPrimary[0]
    expect(ops.type === 'group' && ops.children.map(c => c.item.key)).toEqual(['items'])
    expect(m.navFooter.map(l => l.item.key)).toEqual(['help'])
    expect(m.surfaces.map(s => s.path)).toEqual(['/', '/items', '/items/detail', '/settings'])
    expect(m.settingsSections[0].groups.map(g => g.id)).toEqual(['app.general'])
    expect(m.panels.map(p => p.key)).toEqual(['activity'])
    expect(m.widgets.map(p => p.key)).toEqual(['health'])
    expect(m.docks[0].tabs.map(t => t.key)).toEqual(['inspector'])
    expect(m.slots.map(s => s.key)).toEqual(['inspector-toggle'])
  })
  it('removes everything a module contributed when the module leaves the manifest', () => {
    const gone = buildShellModel(without(manifest, 'core'), { admin })
    expect(gone.navPrimary).toEqual([])
    expect(gone.panels).toEqual([])
    expect(gone.settingsSections).toEqual([])
    expect(gone.diagnostics).toEqual([])
  })
  it('skips an unknown kind and says so', () => {
    const bad = { ...manifest, items: [...manifest.items, { module: 'x', kind: 'hologram', key: 'h' }] }
    const r = buildShellModel(bad, { admin })
    expect(r.diagnostics).toMatchObject([{ code: 'unknown-kind', key: 'h' }])
  })
  it('diagnoses a settings.region naming an unknown group', () => {
    const bad = { ...manifest, items: [...manifest.items, { module: 'x', kind: 'settings.region', key: 's', label: 'S', section_id: 's', groups: [{ id: 'nope', scope_kind: 'app' }] }] }
    expect(codes(bad)).toEqual(['unknown-settings-group'])
  })
  it('supports only scope kind app', () => {
    const bad = { ...manifest, items: [...manifest.items, { module: 'x', kind: 'settings.region', key: 's', label: 'S', section_id: 's', groups: [{ id: 'app.general', scope_kind: 'user' }] }] }
    expect(codes(bad)).toEqual(['unsupported-scope-kind'])
  })
  it('keeps settings pending until the admin manifest loads', () => {
    const r = buildShellModel(manifest)
    expect(r.settingsSections[0].pending).toBe(true)
    expect(r.diagnostics).toEqual([])
  })
  it('refuses routes that are backend paths or claimed twice', () => {
    const extra = (route: string, key: string) => ({ module: 'x', kind: 'surface', key, route, layout: 'list', title: 'T' })
    expect(codes({ ...manifest, items: [...manifest.items, extra('/api/items', 'a')] })).toEqual(['invalid-route'])
    expect(codes({ ...manifest, items: [...manifest.items, extra('/items', 'b')] })).toEqual(['duplicate-route'])
  })
  it('diagnoses dock tabs and slots the region catalog does not support', () => {
    const tab = { module: 'x', kind: 'dock.tab', key: 't', view: 'inspector', region: 'shell.header' }
    expect(codes({ ...manifest, items: [...manifest.items, tab] })).toEqual(['unknown-region'])
    const slot = { module: 'x', kind: 'slot', key: 's', region: 'shell.header', opens: 'ghost' }
    expect(codes({ ...manifest, items: [...manifest.items, slot] })).toEqual(['unknown-dock-tab'])
  })
  it('diagnoses a nav.item in an undeclared group', () => {
    const bad = { ...manifest, items: [...manifest.items, { module: 'x', kind: 'nav.item', key: 'n', label: 'N', route: '/n', region: 'nav.group:ghost' }] }
    expect(codes(bad)).toEqual(['unknown-nav-group'])
  })
  it('diagnoses a view the host cannot render', () => {
    // health and inspector are skipped; the slot that opened inspector is then skipped too.
    expect(codes(manifest, { viewNames: new Set(['activity']) })).toEqual(['unknown-view', 'unknown-view', 'unknown-dock-tab'])
  })
})
