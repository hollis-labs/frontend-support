/**
 * The generated frontend manifest, as the shell reads it.
 *
 * Mirrors `frontend.Manifest` and `ui.Item` on hollis-labs/substrate (manifest_version 0,
 * v0.4 vocabulary, substrate 76666fd). The shell takes it as an already-loaded JSON value — the Substrate
 * build writes `frontend.manifest.json` and the app build imports it; nothing is fetched.
 */

import type { BindingDemand } from '@hollis-labs/design-bindings'

export const SUPPORTED_MANIFEST_VERSION = 0

export const KNOWN_KINDS = ['nav.item', 'nav.group', 'settings.region', 'surface', 'panel', 'dock.tab', 'widget', 'slot'] as const
export type ContributionKind = (typeof KNOWN_KINDS)[number]

export const REGION_NAV_PRIMARY = 'nav.primary'
export const REGION_NAV_FOOTER = 'nav.footer'
export const REGION_NAV_GROUP_PREFIX = 'nav.group:'
export const REGION_SETTINGS_SECTIONS = 'settings.sections'
export const REGION_SURFACE_PAGE = 'surface.page'
export const REGION_ASIDE_PANELS = 'aside.panels'
export const REGION_WIDGETS_GRID = 'widgets.grid'

export type SurfaceLayout = 'list' | 'detail' | 'form' | 'settings' | 'dashboard'

export interface GroupRef { id: string; scope_kind: string }

/** `ui.Item` plus the producing module. `kind` is a string: an unknown one is a diagnostic, not a type error. */
export interface ManifestItem {
  module: string
  kind: string
  key: string
  label?: string
  icon?: string
  priority?: number
  region?: string
  view?: string
  route?: string
  badge?: string
  requires?: string
  collapsible?: boolean
  default_open?: boolean
  section_id?: string
  groups?: GroupRef[]
  layout?: string
  title?: string
  shortcut?: string
  placements?: string[]
  opens?: string
  /** menu.item / command: exactly one of navigate, openRegion (+ tab) or call (+ input). */
  action?: ManifestAction
  risk?: 'low' | 'medium' | 'high'
  /** menu.item: sort order within its region, lower first (the generator defaults it to 100). */
  order?: number
  /** menu.item: the subject kind the item applies to (only in a `menu:<kind>` region). */
  when?: string
  keywords?: string[]
  /** command: the palette group. */
  group?: string
}

/** What a menu.item or command does. Keys are camelCase, as in the spec; the rest of an item is snake_case. */
export interface ManifestAction {
  /** A surface route path, e.g. `/plugins` (not a route id). */
  navigate?: string
  openRegion?: string
  tab?: string
  call?: string
  input?: Record<string, unknown>
}

/**
 * A region of the catalog. `anchor` is the inline region a docked region is tucked under; the dock
 * attributes below are native on docked regions, snake_case as the generator writes them
 * (`edge` is the side/bottom choice, since `anchor` is taken). All optional: absent means shell defaults.
 */
export interface ManifestRegion {
  name: string
  docked: boolean
  anchor?: string
  open_state?: 'hidden' | 'open'
  exclusive?: boolean
  sizes?: { options: readonly string[]; default: string }
  dismiss_key?: 'Esc'
  mobile?: 'bottom-sheet'
  edge?: 'side' | 'bottom'
  height_px?: { min: number; default: number; max?: number }
}
/** One binding demand; the generator's `BindingDemand`, whose origin the manifest leaves out. */
export type ManifestBinding = BindingDemand

export interface ManifestKit { name: string; version: string }

export interface FrontendManifest {
  manifest_version: number
  app: string
  variant?: string
  profiles?: string[]
  modules?: string[]
  items: ManifestItem[]
  regions: ManifestRegion[]
  kits?: ManifestKit[]
  routes?: unknown[]
  contributions?: unknown[]
  /** Binding-table input: the `kind@version` pairs the app's modules emit, sorted and unique, always present (maybe empty). Origin is never written. */
  bindings: ManifestBinding[]
}

export type DiagnosticCode =
  | 'malformed-manifest'
  | 'unsupported-manifest-version'
  | 'unknown-kind'
  | 'unknown-region'
  | 'unknown-nav-group'
  | 'unknown-dock-tab'
  | 'unknown-view'
  | 'unknown-settings-group'
  | 'unsupported-scope-kind'
  | 'invalid-route'
  | 'duplicate-route'
  | 'overlay-depth'
  | 'invalid-dock-attributes'
  | 'invalid-action'
  | 'unknown-field'
  | 'host-refused'
  | 'unresolved-binding'
  | 'malformed-binding-table'

export interface ShellDiagnostic {
  code: DiagnosticCode
  message: string
  module?: string
  kind?: string
  key?: string
}

export type ParseResult =
  | { ok: true; manifest: FrontendManifest }
  | { ok: false; diagnostics: readonly ShellDiagnostic[] }

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Accept a loaded manifest or refuse it. An unknown manifest_version is refused outright:
 * the shell never guesses at a shape it was not built for.
 */
export function parseFrontendManifest(value: unknown): ParseResult {
  const bad = (code: DiagnosticCode, message: string): ParseResult => ({ ok: false, diagnostics: [{ code, message }] })
  if (!isRecord(value)) return bad('malformed-manifest', 'The frontend manifest is not an object.')
  if (value.manifest_version !== SUPPORTED_MANIFEST_VERSION) {
    return bad('unsupported-manifest-version', `The frontend manifest has manifest_version ${JSON.stringify(value.manifest_version)}; this shell reads version ${SUPPORTED_MANIFEST_VERSION}.`)
  }
  if (typeof value.app !== 'string' || !value.app) return bad('malformed-manifest', 'The frontend manifest names no app.')
  if (!Array.isArray(value.items) || !Array.isArray(value.regions)) return bad('malformed-manifest', 'The frontend manifest needs items and regions arrays.')
  if (!Array.isArray(value.bindings)) return bad('malformed-manifest', 'The frontend manifest needs a bindings array (it may be empty).')
  const badBinding = value.bindings.findIndex(b => !isRecord(b) || typeof b.kind !== 'string' || typeof b.version !== 'string')
  if (badBinding >= 0) return bad('malformed-manifest', `The frontend manifest's bindings[${badBinding}] needs a string kind and version.`)
  return { ok: true, manifest: value as unknown as FrontendManifest }
}

const MANIFEST_FIELDS = new Set(['manifest_version', 'app', 'variant', 'profiles', 'modules', 'items', 'regions', 'kits', 'routes', 'contributions', 'bindings'])
const REGION_FIELDS = new Set(['name', 'docked', 'anchor', 'open_state', 'exclusive', 'sizes', 'dismiss_key', 'mobile', 'edge', 'height_px'])
const ITEM_FIELDS = new Set([
  'module', 'kind', 'key', 'label', 'icon', 'priority', 'region', 'view', 'route', 'badge', 'requires', 'collapsible', 'default_open', 'section_id',
  'groups', 'layout', 'title', 'shortcut', 'placements', 'opens', 'action', 'risk', 'order', 'when', 'keywords', 'group',
])
const ACTION_FIELDS = new Set(['navigate', 'openRegion', 'tab', 'call', 'input'])

const extra = (rec: Record<string, unknown>, known: ReadonlySet<string>) => Object.keys(rec).filter(k => !known.has(k))

/** Problems with a menu.item / command `action`; empty when it is exactly one valid action. */
export function actionProblems(action: unknown): string[] {
  if (!isRecord(action)) return ['action is not an object']
  const out: string[] = []
  const str = (k: string) => action[k] !== undefined && (typeof action[k] !== 'string' || !action[k])
  for (const k of ['navigate', 'openRegion', 'tab', 'call']) if (str(k)) out.push(`${k} is not a non-empty string`)
  if (action.input !== undefined && !isRecord(action.input)) out.push('input is not an object')
  const verbs = ['navigate', 'openRegion', 'call'].filter(k => action[k] !== undefined)
  if (verbs.length !== 1) out.push(`needs exactly one of navigate, openRegion or call (has ${verbs.length})`)
  if (action.tab !== undefined && action.openRegion === undefined) out.push('tab applies only to openRegion')
  if (action.input !== undefined && action.call === undefined) out.push('input applies only to call')
  return out
}

/**
 * Non-fatal findings on a parsed manifest: fields this shell does not know (a newer generator) and
 * malformed item fields from the v0.4 vocabulary. Nothing is dropped or thrown; the caller lists them.
 */
export function manifestFieldDiagnostics(manifest: FrontendManifest): ShellDiagnostic[] {
  const out: ShellDiagnostic[] = []
  const unknown = (what: string, names: string[], item?: ManifestItem) => {
    if (names.length) out.push({ code: 'unknown-field', message: `${what} has fields this shell does not know: ${names.join(', ')}.`, ...(item && { module: item.module, kind: item.kind, key: item.key }) })
  }
  unknown('The frontend manifest', extra(manifest as unknown as Record<string, unknown>, MANIFEST_FIELDS))
  for (const r of manifest.regions) if (isRecord(r)) unknown(`Region "${r.name}"`, extra(r, REGION_FIELDS))
  for (const it of manifest.items) {
    if (!isRecord(it)) continue
    const rec = it as unknown as Record<string, unknown>
    const label = `${it.kind} ${it.key}`
    unknown(`Item ${label}`, extra(rec, ITEM_FIELDS), it)
    const problems: string[] = []
    if (it.action !== undefined) {
      problems.push(...actionProblems(it.action))
      if (isRecord(it.action)) unknown(`Item ${label} action`, extra(it.action, ACTION_FIELDS), it)
    }
    if (it.risk !== undefined && !['low', 'medium', 'high'].includes(it.risk)) problems.push(`risk "${String(it.risk)}"`)
    if (it.order !== undefined && !Number.isInteger(it.order)) problems.push('order is not an integer')
    if (it.keywords !== undefined && !(Array.isArray(it.keywords) && it.keywords.every(k => typeof k === 'string'))) problems.push('keywords is not a list of strings')
    for (const k of ['when', 'group'] as const) if (it[k] !== undefined && typeof it[k] !== 'string') problems.push(`${k} is not a string`)
    if (problems.length) out.push({ code: 'invalid-action', message: `Item ${label} has invalid fields: ${problems.join('; ')}.`, module: it.module, kind: it.kind, key: it.key })
  }
  return out
}
