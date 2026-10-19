/**
 * @hollis-labs/design-app-runtime — the app plumbing, with no opinion about
 * appearance.
 *
 * This package exists because about a third of sysop-ui was neither tokens nor
 * components nor kit, and the original three-package model had nowhere to put it.
 *
 * It is also the lever. Nanite and Tangent both measure zero kit imports today, and
 * this is the one piece either could adopt **without taking any appearance at all** —
 * an API client and an SSE hook have no view on how anything looks. So the surface
 * is designed for that consumer: `react` is the only peer dependency, there are no
 * other dependencies of any kind, and nothing here imports a component.
 *
 * What is deliberately NOT here, per the CW-0116 triage:
 *   use-copy, use-arrow-nav   UI affordances, not transport -> design-components
 *   lib/toast                 needs <Toaster/> mounted      -> design-components
 *   cn()                      every component needs it      -> design-components
 *   lib/status                130 lines of Tailwind classes -> kit-dashboard
 *   palette values            theme colors                  -> design-tokens / kit
 */

// ---- wire types -----------------------------------------------------------
export type { ISODateString, JsonPrimitive, JsonValue, JsonObject } from './lib/json'

// ---- api ------------------------------------------------------------------
export {
  ApiError,
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
  type QueryValue,
} from './api/client'
export {
  toSnakeCase,
  normalizeKeys,
  parseMetadataJson,
  normalizeDateString,
  normalizeOptionalDateString,
  normalizeStringArray,
  normalizeNumber,
  normalizeBoolean,
} from './api/normalize'
export { createApiContext, type ApiContextHandle } from './contexts/api-context'

// ---- hooks ----------------------------------------------------------------
export {
  usePoll,
  refreshPolledData,
  createRefreshRegistry,
  defaultRefreshRegistry,
  type UsePollResult,
  type UsePollOptions,
  type PollFetcher,
  type RefreshRegistry,
} from './hooks/use-poll'
export { useSSE, type SSEMessage, type UseSSEOptions, type UseSSEResult } from './hooks/use-sse'
export { useElapsed } from './hooks/use-elapsed'

// ---- state / navigation ---------------------------------------------------
export { createRouter, type RouterConfig } from './lib/router'
export {
  createScopedStorage,
  type StorageArea,
  type ScopedStorage,
  type ScopedStorageOptions,
} from './lib/storage'
export {
  createListCursor,
  listCursorNeighbors,
  type ListCursor,
  type ListCursorNeighbors,
  type ListCursorHandle,
} from './lib/list-cursor'

// ---- display helpers ------------------------------------------------------
export {
  formatRelativeTime,
  formatShortDate,
  formatCount,
  formatDuration,
} from './lib/format'

// Headless appearance preferences; palette values remain in design-tokens.
export { createThemeStore } from './lib/theme-store'
export type { ColorMode, ModePreference, ThemeState, ThemeStore, ThemeStoreOptions } from './lib/theme-store'
export { useTheme } from './hooks/use-theme'

// Headless AppShell aside preferences and layout hooks
export {
  createAppShellAsideStore,
  parseAsidePreference,
  createMemoryStorage,
  VALID_ASIDE_WIDTHS,
  type AsideWidth,
  type AppShellAsidePreference,
  type AppShellAsideStoreOptions,
  type AppShellAsideStore,
} from './lib/app-shell-aside-store'
export {
  useAppShellAside,
  resolveAdmittedFocusTarget,
  type FocusReturnTargetOptions,
  type UseAppShellAsideOptions,
  type AppShellAsideHandle,
} from './hooks/use-app-shell-aside'
