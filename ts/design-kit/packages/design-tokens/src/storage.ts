import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './themes/index.js'

/** Theme-only string preference. Theme+mode stores use their own JSON key. */
export const THEME_STORAGE_KEY = 'hollis.theme'

export interface ThemeStorageOptions {
  storageKey?: string
  defaultTheme?: string
  /** Accepted ids, including an app's custom themes or compatibility aliases. */
  themes?: readonly string[]
}

/** Read a theme id, falling back on absent, unknown or inaccessible storage.
 * Access storage inside the guard: even the localStorage getter can throw.
 * Pass null to disable storage, or inject a getItem implementation for SSR.
 */
export function readStoredTheme(
  storage?: Pick<Storage, 'getItem'> | null,
  { storageKey = THEME_STORAGE_KEY, defaultTheme = DEFAULT_THEME_ID,
    themes = BUILTIN_THEMES.map((theme) => theme.id) }: ThemeStorageOptions = {},
): string {
  try {
    const backing = storage === undefined ? globalThis.localStorage : storage
    const value = backing?.getItem(storageKey)
    return typeof value === 'string' && themes.includes(value) ? value : defaultTheme
  } catch {
    return defaultTheme
  }
}

/** Write just the id; blocked storage must not prevent a live theme switch. */
export function persistTheme(
  theme: string,
  storage?: Pick<Storage, 'setItem'> | null,
  { storageKey = THEME_STORAGE_KEY }: Pick<ThemeStorageOptions, 'storageKey'> = {},
): void {
  try {
    const backing = storage === undefined ? globalThis.localStorage : storage
    backing?.setItem(storageKey, theme)
  } catch {
    // The caller can still apply the theme when persistence is unavailable.
  }
}
