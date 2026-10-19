export type ColorMode = 'light' | 'dark'
export type ModePreference = ColorMode | 'system'

export interface ThemeState {
  theme: string
  mode: ModePreference
  resolvedMode: ColorMode
}

export interface ThemeStoreOptions {
  defaultTheme: string
  /** Accepted ids; unknown persisted ids fall back to defaultTheme. */
  themes: readonly string[]
  /** Use a separate key for each app. */
  storageKey?: string
}

export interface ThemeStore {
  /** Call before createRoot to apply preferences before React paints. SSR-safe. */
  initialize: () => void
  getSnapshot: () => ThemeState
  getServerSnapshot: () => ThemeState
  subscribe: (listener: () => void) => () => void
  setTheme: (theme: string) => void
  setMode: (mode: ModePreference) => void
}

const isMode = (value: unknown): value is ModePreference =>
  value === 'light' || value === 'dark' || value === 'system'

/** Headless preferences only: no theme values or component dependencies. */
export function createThemeStore({ defaultTheme, themes, storageKey = 'hollis.appearance' }: ThemeStoreOptions): ThemeStore {
  if (!themes.includes(defaultTheme)) throw new Error('defaultTheme must be in themes')
  const serverState: ThemeState = { theme: defaultTheme, mode: 'system', resolvedMode: 'light' }
  let state = serverState
  let initialized = false
  const listeners = new Set<() => void>()
  let stopListening: (() => void) | undefined

  const systemMode = (): ColorMode =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

  function read(): { theme: string; mode: ModePreference } {
    try {
      const raw: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
      if (raw && typeof raw === 'object') {
        const value = raw as Record<string, unknown>
        return {
          theme: typeof value.theme === 'string' && themes.includes(value.theme) ? value.theme : defaultTheme,
          mode: isMode(value.mode) ? value.mode : 'system',
        }
      }
    } catch { /* Storage may be unavailable or malformed. */ }
    return { theme: defaultTheme, mode: 'system' }
  }

  function update(theme: string, mode: ModePreference, persist = false) {
    const resolvedMode = mode === 'system' ? systemMode() : mode
    const changed = state.theme !== theme || state.mode !== mode || state.resolvedMode !== resolvedMode
    if (changed) state = { theme, mode, resolvedMode }
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      root.setAttribute('data-theme', theme)
      root.setAttribute('data-mode', resolvedMode)
      root.classList.toggle('light', resolvedMode === 'light')
      root.classList.toggle('dark', resolvedMode === 'dark')
      root.style.colorScheme = resolvedMode
    }
    if (persist) {
      try { window.localStorage.setItem(storageKey, JSON.stringify({ theme, mode })) }
      catch { /* Live switching still works when storage is blocked. */ }
    }
    if (changed) listeners.forEach((listener) => listener())
  }

  function initialize() {
    if (typeof window === 'undefined') return
    const value = read()
    update(value.theme, value.mode)
    initialized = true
  }

  function listen() {
    if (typeof window === 'undefined') return
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onMedia = () => { if (state.mode === 'system') update(state.theme, state.mode) }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return
      // Ignore sessionStorage events; access to localStorage itself may throw.
      try { if (event.storageArea && event.storageArea !== window.localStorage) return }
      catch { return }
      initialize()
    }
    media?.addEventListener('change', onMedia)
    window.addEventListener('storage', onStorage)
    stopListening = () => {
      media?.removeEventListener('change', onMedia)
      window.removeEventListener('storage', onStorage)
    }
    // Re-read on remount after the last subscriber stopped listening.
    initialize()
  }

  return {
    initialize,
    getSnapshot: () => state,
    getServerSnapshot: () => serverState,
    subscribe(listener) {
      listeners.add(listener)
      if (listeners.size === 1) listen()
      return () => {
        listeners.delete(listener)
        if (!listeners.size) { stopListening?.(); stopListening = undefined }
      }
    },
    setTheme(theme) {
      if (!themes.includes(theme)) return
      if (!initialized) initialize()
      update(theme, state.mode, true)
    },
    setMode(mode) {
      if (!isMode(mode)) return
      if (!initialized) initialize()
      update(state.theme, mode, true)
    },
  }
}
