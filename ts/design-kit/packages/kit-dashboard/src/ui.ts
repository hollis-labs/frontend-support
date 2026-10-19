/**
 * The dashboard idiom. Kit components only.
 *
 * THIS BARREL USED TO BE THE PROBLEM. It exported the 23 shadcn primitives, the
 * idiom-free root components, `lib/status`, `lib/theme` and the hooks — and
 * `index.ts` was `export * from './ui'`. So an app that wanted a Button took the
 * whole dense-operations idiom, which is the epic's founding diagnosis, confirmed
 * at the barrel level rather than inferred from adoption.
 *
 * It no longer re-exports the base set, deliberately. A consumer takes
 * `@hollis-labs/design-components` for a Button and this package for the idiom.
 * Re-exporting them here would rebuild the bundle boundary the split exists to
 * remove, and it would make the two packages' surfaces silently diverge the first
 * time one of them changed.
 */
export { PageHeader } from './components/page-header'
export { NavRail, type NavRailItem } from './components/nav-rail'
export { StatusBadge } from './components/status-badge'
export { PriorityBadge } from './components/priority-badge'
export { DashboardTypographyProvider } from './components/dashboard-typography'
export { useDashboardTypography, type DashboardTypographyProfile } from './lib/dashboard-typography'
export { SummaryCards, type SummaryCard } from './components/summary-cards'
export {
  SettingsField,
  SettingsGrid,
  SettingsNotice,
  SettingsPanel,
  SettingsStatusPill,
  type SettingsFieldProps,
  type SettingsGridProps,
  type SettingsNoticeProps,
  type SettingsPanelProps,
  type SettingsStatusPillProps,
} from './components/settings-panel'
export { ThemeSwitcher } from './components/theme-switcher'

/* The operations status vocabulary — 12 Torque lifecycle states. Kit by definition. */
export {
  STATUS_KEYS,
  STATUS_TONES,
  DEFAULT_STATUS_TONE,
  statusTone,
  type StatusKey,
  type StatusTone,
} from './lib/status'

/* The sysop palettes and their storage key. See lib/theme for what is NOT here. */
export {
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  THEME_OPTIONS,
  isThemeName,
  resolveTheme,
  readStoredTheme,
  persistTheme,
  applyTheme,
  getInitialTheme,
  type ThemeName,
} from './lib/theme'

/* Dashboard token migration metadata; these are not base contract tokens. */
export { DASHBOARD_DEPRECATED_TOKENS } from './lib/tokens'

export { useDashboardDocumentScale, type DashboardDocumentScale } from './hooks/use-dashboard-document-scale'
