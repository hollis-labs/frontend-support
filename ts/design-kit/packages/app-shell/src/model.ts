/**
 * The shell model: the manifest's items sorted into the host's regions.
 *
 * Pure data in, pure data out. Nothing here renders, so every degradation rule is testable
 * without a DOM. A contribution the shell cannot place is skipped AND listed in
 * `diagnostics`; it is never dropped silently and never throws.
 */
import { dockAttributesOfRegion, resolveDockAttributes, type ResolvedDockAttributes } from './docks'
import {
  KNOWN_KINDS, REGION_ASIDE_PANELS, REGION_COMMAND_PALETTE, REGION_MENU_PREFIX, REGION_ROW_ACTIONS, REGION_TOOLBAR_PRIMARY, REGION_NAV_FOOTER, REGION_NAV_GROUP_PREFIX, REGION_NAV_PRIMARY, REGION_SETTINGS_SECTIONS,
  REGION_SURFACE_PAGE, REGION_WIDGETS_GRID,
  actionProblems, manifestFieldDiagnostics, type FrontendManifest, type ManifestAction, type ManifestItem, type ManifestRegion, type ShellDiagnostic, type SurfaceLayout,
} from './manifest'

/** The slice of the runtime admin manifest the shell reads: settings group identity only. */
export interface AdminSettingsGroup { id: string; label: string; description?: string; scope: { kind: string; id?: string } }
export interface AdminManifestInput { settings: readonly AdminSettingsGroup[] }

export interface NavLink { item: ManifestItem; path: string | null }
export type NavNode =
  | { type: 'item'; link: NavLink }
  | { type: 'group'; item: ManifestItem; children: NavLink[] }

export interface SurfaceRoute { item: ManifestItem; path: string; layout: SurfaceLayout; title: string }
export interface DockRegion { region: ManifestRegion; tabs: ManifestItem[]; attributes: ResolvedDockAttributes }
export interface SettingsSection { item: ManifestItem; groups: AdminSettingsGroup[]; pending: boolean }

/** One validated `menu.item` or `command`, ready to render. Its action is exactly one of navigate, openRegion or call. */
export interface MenuEntry { item: ManifestItem; action: ManifestAction; label: string; risk: 'low' | 'medium' | 'high'; danger: boolean; keywords: readonly string[]; group?: string }
export interface MenuModel {
  /** `command.palette`: every `command`, plus any `menu.item` placed there. */
  palette: MenuEntry[]
  rowActions: MenuEntry[]
  toolbar: MenuEntry[]
  /** `menu:<subject-kind>` by subject kind. */
  context: Readonly<Record<string, MenuEntry[]>>
}

export interface ShellModel {
  app: string
  navPrimary: NavNode[]
  navFooter: NavLink[]
  surfaces: SurfaceRoute[]
  panels: ManifestItem[]
  widgets: ManifestItem[]
  docks: DockRegion[]
  slots: ManifestItem[]
  menus: MenuModel
  settingsSections: SettingsSection[]
  diagnostics: ShellDiagnostic[]
}

export interface BuildOptions {
  /** The runtime admin manifest, once loaded. Until then settings sections are `pending`. */
  admin?: AdminManifestInput
  /** View names the host can render for panel / dock.tab / widget. Omit to skip the check. */
  viewNames?: ReadonlySet<string>
}

const FIXED_REGIONS: Record<string, readonly string[]> = {
  'nav.item': [REGION_NAV_PRIMARY, REGION_NAV_FOOTER],
  'nav.group': [REGION_NAV_PRIMARY],
  'settings.region': [REGION_SETTINGS_SECTIONS],
  surface: [REGION_SURFACE_PAGE],
  panel: [REGION_ASIDE_PANELS],
  widget: [REGION_WIDGETS_GRID],
}
const DEFAULT_REGION: Record<string, string> = {
  'nav.item': REGION_NAV_PRIMARY, 'nav.group': REGION_NAV_PRIMARY, 'settings.region': REGION_SETTINGS_SECTIONS,
  surface: REGION_SURFACE_PAGE, panel: REGION_ASIDE_PANELS, widget: REGION_WIDGETS_GRID,
  'menu.item': '', command: REGION_COMMAND_PALETTE,
}
const LAYOUTS = new Set<string>(['list', 'detail', 'form', 'settings', 'dashboard'])
const RESERVED_ROUTE = /^\/(api|admin)(\/|$)/

const MENU_REGIONS = new Set([REGION_COMMAND_PALETTE, REGION_ROW_ACTIONS, REGION_TOOLBAR_PRIMARY])
const isMenuRegion = (r: string) => MENU_REGIONS.has(r) || (r.startsWith(REGION_MENU_PREFIX) && r.length > REGION_MENU_PREFIX.length)

export const effectiveRegion = (item: ManifestItem): string => item.region || DEFAULT_REGION[item.kind] || ''

export function buildShellModel(manifest: FrontendManifest, options: BuildOptions = {}): ShellModel {
  const diagnostics: ShellDiagnostic[] = []
  const diag = (code: ShellDiagnostic['code'], it: ManifestItem, message: string) =>
    diagnostics.push({ code, message, module: it.module, kind: it.kind, key: it.key })
  const catalog = new Map(manifest.regions.map(r => [r.name, r]))
  const known = new Set<string>(KNOWN_KINDS)
  diagnostics.push(...manifestFieldDiagnostics(manifest))

  // 1. Keep only items whose kind and region the shell understands.
  const accepted: ManifestItem[] = []
  for (const it of manifest.items) {
    if (!known.has(it.kind)) { diag('unknown-kind', it, `Skipped ${it.kind} ${it.key}: this shell does not know the kind.`); continue }
    const region = effectiveRegion(it)
    let ok: boolean
    if (it.kind === 'dock.tab') ok = catalog.get(region)?.docked === true
    else if (it.kind === 'slot') ok = catalog.has(region) && catalog.get(region)?.docked !== true
    else if (it.kind === 'menu.item') ok = isMenuRegion(region)
    else if (it.kind === 'command') ok = region === REGION_COMMAND_PALETTE
    else if (it.kind === 'nav.item') ok = FIXED_REGIONS[it.kind].includes(region) || region.startsWith(REGION_NAV_GROUP_PREFIX)
    else ok = FIXED_REGIONS[it.kind].includes(region)
    if (!ok) { diag('unknown-region', it, `Skipped ${it.kind} ${it.key}: region "${region}" is not one this shell can place it in.`); continue }
    if ((it.kind === 'panel' || it.kind === 'dock.tab' || it.kind === 'widget') && options.viewNames && !options.viewNames.has(it.view ?? '')) {
      diag('unknown-view', it, `Skipped ${it.kind} ${it.key}: the host has no view "${it.view ?? ''}".`); continue
    }
    accepted.push(it)
  }

  // 2. Surfaces become routes. A route may never be a backend path or claimed twice.
  const surfaces: SurfaceRoute[] = []
  const claimed = new Set<string>()
  const validRoute = (it: ManifestItem): string | null => {
    const r = it.route ?? ''
    if (!r.startsWith('/') || RESERVED_ROUTE.test(r) || /\.\.|[?#]/.test(r)) {
      diag('invalid-route', it, `${it.kind} ${it.key}: route "${r}" is not an absolute frontend path (backend paths are never frontend routes).`)
      return null
    }
    return r.length > 1 ? r.replace(/\/$/, '') : r
  }
  for (const it of accepted.filter(i => i.kind === 'surface')) {
    const path = validRoute(it)
    if (!path) continue
    if (claimed.has(path)) { diag('duplicate-route', it, `surface ${it.key}: route "${path}" is already claimed.`); continue }
    if (!LAYOUTS.has(it.layout ?? '')) { diag('invalid-route', it, `surface ${it.key}: layout "${it.layout ?? ''}" is unknown.`); continue }
    claimed.add(path)
    surfaces.push({ item: it, path, layout: it.layout as SurfaceLayout, title: it.title || it.label || it.key })
  }

  // 3. Navigation.
  const link = (it: ManifestItem): NavLink => ({ item: it, path: it.route ? validRoute(it) : null })
  const groups = new Map(accepted.filter(i => i.kind === 'nav.group').map(g => [g.key, g]))
  const children = new Map<string, NavLink[]>()
  const navFooter: NavLink[] = []
  const navPrimary: NavNode[] = []
  for (const it of accepted) {
    if (it.kind === 'nav.group') navPrimary.push({ type: 'group', item: it, children: children.get(it.key) ?? (children.set(it.key, []), children.get(it.key)!) })
    else if (it.kind === 'nav.item') {
      const region = effectiveRegion(it)
      if (region === REGION_NAV_FOOTER) navFooter.push(link(it))
      else if (region.startsWith(REGION_NAV_GROUP_PREFIX)) {
        const g = region.slice(REGION_NAV_GROUP_PREFIX.length)
        if (!groups.has(g)) { diag('unknown-nav-group', it, `Skipped nav.item ${it.key}: group "${g}" is not declared.`); continue }
        if (!children.has(g)) children.set(g, [])
        children.get(g)!.push(link(it))
      } else navPrimary.push({ type: 'item', link: link(it) })
    }
  }

  // 4. Docks and slots.
  for (const r of manifest.regions) {
    if (!r.docked && dockAttributesOfRegion(r)) diagnostics.push({ code: 'unknown-region', message: `Dock attributes were given for "${r.name}", which is not a docked region in the manifest.` })
  }
  const docks: DockRegion[] = manifest.regions.filter(r => r.docked).map(region => ({
    region, tabs: accepted.filter(i => i.kind === 'dock.tab' && effectiveRegion(i) === region.name),
    attributes: resolveDockAttributes(region.name, dockAttributesOfRegion(region), diagnostics),
  }))
  const slots: ManifestItem[] = []
  for (const it of accepted.filter(i => i.kind === 'slot')) {
    if (it.opens) {
      const tab = accepted.find(t => t.kind === 'dock.tab' && t.key === it.opens)
      if (!tab) { diag('unknown-dock-tab', it, `Skipped slot ${it.key}: it opens dock.tab "${it.opens}", which is not available.`); continue }
      if (catalog.get(effectiveRegion(tab))?.anchor !== effectiveRegion(it)) {
        diag('unknown-dock-tab', it, `Skipped slot ${it.key}: dock.tab "${it.opens}" is not anchored under region "${effectiveRegion(it)}".`); continue
      }
    }
    slots.push(it)
  }

  // 5. Menus and commands. An item whose fields are invalid already has an `invalid-action` diagnostic; it is skipped here.
  const menus = buildMenus(accepted.filter(i => i.kind === 'menu.item' || i.kind === 'command'), surfaces, docks, diag)

  // 6. Settings: sections reference admin-manifest groups; only scope kind app is supported.
  const admin = options.admin
  const settingsSections: SettingsSection[] = accepted.filter(i => i.kind === 'settings.region').map(item => {
    const resolved: AdminSettingsGroup[] = []
    for (const ref of item.groups ?? []) {
      if (ref.scope_kind !== 'app') { diag('unsupported-scope-kind', item, `settings.region ${item.key}: group "${ref.id}" has scope kind "${ref.scope_kind}"; only app is supported.`); continue }
      if (!admin) continue
      const g = admin.settings.find(s => s.id === ref.id)
      if (!g) { diag('unknown-settings-group', item, `settings.region ${item.key}: the admin manifest has no group "${ref.id}".`); continue }
      if (g.scope.kind !== 'app') { diag('unsupported-scope-kind', item, `settings.region ${item.key}: admin group "${ref.id}" has scope kind "${g.scope.kind}"; only app is supported.`); continue }
      resolved.push(g)
    }
    return { item, groups: resolved, pending: !admin }
  })

  return {
    app: manifest.app, navPrimary, navFooter, surfaces,
    panels: accepted.filter(i => i.kind === 'panel'), widgets: accepted.filter(i => i.kind === 'widget'),
    docks, slots, menus, settingsSections, diagnostics,
  }
}

const RISKS = new Set(['low', 'medium', 'high'])
const byOrder = (a: MenuEntry, b: MenuEntry) =>
  Number(a.danger) - Number(b.danger) || (a.item.order ?? 100) - (b.item.order ?? 100) || a.item.module.localeCompare(b.item.module) || a.item.key.localeCompare(b.item.key)

/**
 * Orders by `order` (default 100, lower first), then module, then key, with high-risk entries last so a
 * renderer can put a divider before them. An entry that cannot work (bad action, a route no surface owns,
 * a region or tab that is not docked, `when` outside a `menu:<kind>` region) is skipped and listed.
 */
function buildMenus(
  items: ManifestItem[], surfaces: SurfaceRoute[], docks: DockRegion[],
  diag: (code: ShellDiagnostic['code'], it: ManifestItem, message: string) => void,
): MenuModel {
  const palette: MenuEntry[] = []
  const rowActions: MenuEntry[] = []
  const toolbar: MenuEntry[] = []
  const context: Record<string, MenuEntry[]> = {}
  for (const it of items) {
    const region = effectiveRegion(it)
    const skip = (why: string) => diag('invalid-action', it, `Skipped ${it.kind} ${it.key}: ${why}.`)
    if (!it.label) { skip('it has no label'); continue }
    if (actionProblems(it.action).length) continue
    if (it.risk !== undefined && !RISKS.has(it.risk)) continue
    if (it.order !== undefined && !Number.isInteger(it.order)) continue
    if (it.keywords !== undefined && !(Array.isArray(it.keywords) && it.keywords.every(k => typeof k === 'string'))) continue
    if ((it.when !== undefined && typeof it.when !== 'string') || (it.group !== undefined && typeof it.group !== 'string')) continue
    const action = it.action!
    const kindOfMenu = region.startsWith(REGION_MENU_PREFIX) ? region.slice(REGION_MENU_PREFIX.length) : undefined
    if (it.when !== undefined && (kindOfMenu === undefined || it.when !== kindOfMenu)) { skip(`"when" applies only in a menu:<kind> region of that kind`); continue }
    if (action.navigate !== undefined && !surfaces.some(s => s.path === action.navigate)) { skip(`no surface owns the route "${action.navigate}" (an action navigates to a surface path, never a URL)`); continue }
    if (action.openRegion !== undefined) {
      const dock = docks.find(d => d.region.name === action.openRegion)
      if (!dock) { skip(`"${action.openRegion}" is not a docked region`); continue }
      if (action.tab !== undefined && !dock.tabs.some(t => t.key === action.tab)) { skip(`region "${action.openRegion}" has no dock.tab "${action.tab}"`); continue }
    }
    const risk = it.risk ?? 'low'
    const entry: MenuEntry = { item: it, action, label: it.label, risk, danger: risk === 'high', keywords: it.keywords ?? [], ...(it.group ? { group: it.group } : {}) }
    if (region === REGION_COMMAND_PALETTE) palette.push(entry)
    else if (region === REGION_ROW_ACTIONS) rowActions.push(entry)
    else if (region === REGION_TOOLBAR_PRIMARY) toolbar.push(entry)
    else (context[kindOfMenu!] ??= []).push(entry)
  }
  palette.sort(byOrder); rowActions.sort(byOrder); toolbar.sort(byOrder)
  for (const k of Object.keys(context)) context[k].sort(byOrder)
  return { palette, rowActions, toolbar, context }
}
