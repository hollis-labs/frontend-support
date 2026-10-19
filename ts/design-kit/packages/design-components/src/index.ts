/**
 * @hollis-labs/design-components — layer 4 of the Hollis Labs frontend layering,
 * the idiom-free base.
 *
 * THE ONE RULE: a component may name a token, never a value. It covers scale as
 * much as colour — `text-[13px]` names a value exactly as much as `#1a1b26` does.
 * Every token named here comes from `@hollis-labs/design-tokens`; this package
 * restates none of the contract locally.
 *
 * THE TEST EVERY EXPORT PASSED: "would kit-chat take this unchanged?" An app
 * wanting only a Button had to take the whole dense-dashboard idiom — confirmed
 * at the barrel level, not inferred — and removing that is the point of the
 * split. Dashboard idiom lives in `@hollis-labs/kit-dashboard`; chat-specific
 * composition lives in `@hollis-labs/kit-chat`.
 *
 * Built on Base UI (`@base-ui/react`), a peer. See CW-20260910-0140.
 */

/*
 * The primitives. `ui/table.tsx` and `ui/tabs.tsx` are exported here despite
 * being unused inside sysop-ui — `DataTable` hand-rolls its markup and
 * `layout/tab-strip.tsx` re-implements a tab bar, both of which are the dashboard's
 * page-chrome variants and stay in kit-dashboard. Base keeps the primitives.
 */
export * from './components/ui'

/* The utility every component needs, and the other half of sysop-ui's lib/utils. */
export { cn } from './lib/utils'

/* Toast — ships with `ui/sonner.tsx`'s <Toaster/>, which it requires. */
export { notifyError, notifySuccess } from './lib/toast'

/*
 * Components. Tone-carrying primitives share one scale; see lib/tone.
 */
export { Pill } from './components/pill'
export { LiveDot } from './components/live-dot'
export { Callout } from './components/callout'
export { CopyableId } from './components/copyable-id'
export { ConfirmDialog } from './components/confirm-dialog'
export { DetailDialog, DetailSection } from './components/detail-dialog'
export { InspectionDialog } from './components/inspection-dialog'
export type { InspectionDialogProps } from './components/inspection-dialog'
export { FormDialog } from './components/form-dialog'
export { JsonViewer } from './components/json-viewer'
export { MetaList } from './components/meta-list'
export type { MetaItem } from './components/meta-list'
export { Metric } from './components/metric'
export { ProgressBar } from './components/progress-bar'
export { AppShell } from './components/layout/app-shell'
export type { AppShellProps, AsideWidth, AppShellAsideProps } from './components/layout/app-shell'
export { OverlaySidebar } from './components/overlay-sidebar'
export type { OverlaySidebarProps } from './components/overlay-sidebar'
export { DetailPageLayout } from './components/layout/detail-page-layout'
export { OverflowMenu } from './components/overflow-menu'
export type { OverflowAction } from './components/overflow-menu'
export { CollapsibleSection } from './components/collapsible-section'
export { Combobox } from './components/combobox'
export type { ComboboxItem } from './components/combobox'
export { CopyButton } from './components/copy-button'
export { EmptyState } from './components/empty-state'
export type { EmptyStateVariant } from './components/empty-state'
export { JsonModal, PayloadActions, PayloadSummary } from './components/json-payload'
export type { JsonModalProps, PayloadActionsProps, PayloadSummaryProps } from './components/json-payload'
export { SearchInput } from './components/search-input'
export { TransferList } from './components/transfer-list'
export type { TransferListItem } from './components/transfer-list'

/*
 * Payload parsers, split out of `json-payload.tsx` rather than exempted from the
 * react-refresh rule. They were the last two lint errors in the repo.
 */
export { safeParseObject, scalarStr } from './lib/payload'

/*
 * The icon prop shape. `lucide-react` is a PEER dependency — the consumer picks
 * the icon library and its major version — so this package ships a shape, not a
 * set. See lib/icon for which of the two shapes a slot should take.
 */
export type { IconComponent } from './lib/icon'

/*
 * The row-activation protocol, moved DOWN from kit-dashboard so base stops
 * emitting markup whose meaning lived one layer up. A kit imports the selector.
 */
export {
  ROW_INTERACTIVE_ATTR,
  ROW_INTERACTIVE_SELECTOR,
  rowInteractiveProps,
} from './lib/row-activation'

/* The one tone scale, typed from the contract's own Tone. */
export { TONES, TONE_CLASSES, TONE_FILL_CLASSES } from './lib/tone'
export { ACCENT_TEXT_CLASSES, ACCENT_BORDER_L_CLASSES } from './lib/tone'
export type { Tone, Accent } from './lib/tone'

/* The column contract. The table that renders it is kit; the contract is not. */
export { alignClass, compareBy } from './lib/column'
export type { ColumnDef, SortDir, SortState } from './lib/column'

/* UI affordances. Transport hooks live in @hollis-labs/design-app-runtime. */
export { useCopy } from './hooks/use-copy'
export type { UseCopyResult } from './hooks/use-copy'
export { useArrowNav } from './hooks/use-arrow-nav'

export { ModeToggle } from './components/mode-toggle'
export type { ModeToggleProps } from './components/mode-toggle'
export { ThemePicker } from './components/theme-picker'
export type { ThemePickerProps } from './components/theme-picker'

export { useControllableState } from './hooks/use-controllable-state'
export type { UseControllableStateParams, SetControllableState } from './hooks/use-controllable-state'

export { useControlledRecordNavigation } from './hooks/use-controlled-record-navigation'
export type { ControlledRecordNavigationOptions, ControlledRecordNavigation } from './hooks/use-controlled-record-navigation'

/* Keyboard architecture, admission guards, layered Escape stack, and shortcuts (CW-20261010-0090). */
export {
  EDITABLE_TARGET_SELECTOR,
  NATIVE_INTERACTIVE_SELECTOR,
  OVERLAY_SELECTOR,
  isEditableTarget,
  isInteractiveTarget,
  isComposingEvent,
  isMacPlatform,
  matchExactModifiers,
  hasActiveModalOverlay,
  type ExactModifierConfig,
} from './lib/keyboard-guards'

export {
  resolveAdmittedFocusTarget,
  restoreAdmittedFocus,
  type FocusReturnOptions,
} from './lib/focus-return'

export {
  EscapeStack,
  defaultEscapeStack,
  type EscapeHandlingAction,
  type LayeredEscapeRegistration,
} from './lib/escape-stack'

export {
  useLayeredEscape,
  type UseLayeredEscapeOptions,
  type UseLayeredEscapeResult,
} from './hooks/use-layered-escape'

export {
  useShiftShift,
  type UseShiftShiftOptions,
  type UseShiftShiftResult,
} from './hooks/use-shift-shift'

export {
  useShortcut,
  type UseShortcutOptions,
  type UseShortcutResult,
} from './hooks/use-shortcut'

export {
  useQuickSearchShortcut,
  type UseQuickSearchShortcutOptions,
  type UseQuickSearchShortcutResult,
} from './hooks/use-quick-search-shortcut'


// Nil dialog and palette compositions (CW-20261010-0092).
export type { DialogOptions } from './hooks/use-dialog-options'
export type { DetailDialogProps } from './components/detail-dialog'
export type { FormDialogProps } from './components/form-dialog'
export type { ConfirmDialogProps } from './components/confirm-dialog'
export { SearchPalette } from './components/search-palette'
export type { SearchPaletteProps, SearchPaletteOption, SearchPaletteFilter } from './components/search-palette'
export { CycleModeToggle, SearchAddToggle } from './components/cycle-mode-toggle'
export type { CycleModeToggleProps, SearchAddToggleProps } from './components/cycle-mode-toggle'

/* Deliberate pointer holds and radial actions (CW-20261010-0091). */
export { useLongPress } from './hooks/use-long-press'
export type { LongPressGesture, UseLongPressOptions, UseLongPressResult } from './hooks/use-long-press'
export { RadialMenu } from './components/radial-menu'
export type { RadialMenuItem, RadialMenuProps } from './components/radial-menu'
