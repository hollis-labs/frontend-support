/**
 * The generated frontend manifest, as the shell reads it.
 *
 * Mirrors `frontend.Manifest` and `ui.Item` on hollis-labs/substrate (manifest_version 0,
 * v0.3 vocabulary). The shell takes it as an already-loaded JSON value — the Substrate
 * build writes `frontend.manifest.json` and the app build imports it; nothing is fetched.
 */

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
}

export interface ManifestRegion { name: string; docked: boolean; anchor?: string }
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
  | 'host-refused'

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
  return { ok: true, manifest: value as unknown as FrontendManifest }
}
