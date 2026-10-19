import { createScopedStorage, type ScopedStorage } from './storage'

export type AsideWidth = 'compact' | 'regular' | 'wide'

export interface AppShellAsidePreference {
  width: AsideWidth
  collapsed: boolean
}

export const VALID_ASIDE_WIDTHS: readonly AsideWidth[] = ['compact', 'regular', 'wide']

/**
 * Validates / normalizes raw stored data into a clean AppShellAsidePreference.
 * Returns null if the stored value is completely unparseable or not an object.
 */
export function parseAsidePreference(
  raw: unknown,
  defaults: AppShellAsidePreference = { width: 'regular', collapsed: true },
): AppShellAsidePreference | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>
  const width =
    typeof candidate.width === 'string' && VALID_ASIDE_WIDTHS.includes(candidate.width as AsideWidth)
      ? (candidate.width as AsideWidth)
      : defaults.width
  const collapsed =
    typeof candidate.collapsed === 'boolean' ? candidate.collapsed : defaults.collapsed
  return { width, collapsed }
}

/**
 * Creates an in-memory ScopedStorage instance for testing and isolated Storybook stories.
 */
export function createMemoryStorage<T>(initialValue: T | null = null): ScopedStorage<T> {
  let current: T | null = initialValue
  return {
    read() {
      return current
    },
    write(value: T) {
      current = value
    },
    clear() {
      current = null
    },
  }
}

export interface AppShellAsideStoreOptions {
  /**
   * App namespace used to scope the storage key:
   * `${appNamespace}:ops-shell:aside:v1`.
   */
  appNamespace?: string
  /**
   * Explicit storage key. Defaults to `${appNamespace ? `${appNamespace}:` : ''}ops-shell:aside:v1`.
   */
  storageKey?: string
  /**
   * Default width preset when absent from storage or malformed.
   * Defaults to 'regular'.
   */
  defaultWidth?: AsideWidth
  /**
   * Default collapsed state when absent from storage or malformed.
   * Defaults to true (per Tangent empty adoption default).
   */
  defaultCollapsed?: boolean
  /**
   * Custom scoped storage (e.g. injected memory store for Storybook stories or tests).
   */
  storage?: ScopedStorage<AppShellAsidePreference>
  /**
   * Narrow screen breakpoint threshold in pixels. Defaults to 1024 ('lg').
   */
  narrowBreakpoint?: number
}

export interface AppShellAsideStore {
  getSnapshot: () => AppShellAsidePreference
  getServerSnapshot: () => AppShellAsidePreference
  subscribe: (listener: () => void) => () => void
  setWidth: (width: AsideWidth) => void
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  reset: () => void
  storageKey: string
  narrowBreakpoint: number
}

/**
 * Creates a headless store for persisting AppShell aside preferences
 * (width preset and collapsed state) using createScopedStorage.
 *
 * Never persists temporary overlay open state, conversation drafts, or active IDs.
 */
export function createAppShellAsideStore(options: AppShellAsideStoreOptions = {}): AppShellAsideStore {
  const {
    appNamespace,
    defaultWidth = 'regular',
    defaultCollapsed = true,
    narrowBreakpoint = 1024,
  } = options

  const resolvedKey =
    options.storageKey ??
    (appNamespace ? `${appNamespace}:ops-shell:aside:v1` : 'ops-shell:aside:v1')

  const defaultState: AppShellAsidePreference = {
    width: defaultWidth,
    collapsed: defaultCollapsed,
  }

  const storage =
    options.storage ??
    createScopedStorage<AppShellAsidePreference>(resolvedKey, {
      area: 'local',
      parse: (raw) => parseAsidePreference(raw, defaultState),
    })

  const serverState: AppShellAsidePreference = { ...defaultState }

  function readStored(): AppShellAsidePreference {
    const stored = storage.read()
    if (!stored) {
      storage.write(defaultState)
      return defaultState
    }
    return {
      width: VALID_ASIDE_WIDTHS.includes(stored.width) ? stored.width : defaultWidth,
      collapsed: typeof stored.collapsed === 'boolean' ? stored.collapsed : defaultCollapsed,
    }
  }

  let currentState: AppShellAsidePreference = readStored()
  const listeners = new Set<() => void>()

  function notify() {
    listeners.forEach((listener) => listener())
  }

  return {
    getSnapshot: () => currentState,
    getServerSnapshot: () => serverState,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setWidth(width: AsideWidth) {
      if (!VALID_ASIDE_WIDTHS.includes(width)) return
      if (currentState.width === width) return
      currentState = { ...currentState, width }
      storage.write(currentState)
      notify()
    },
    setCollapsed(collapsed: boolean) {
      if (currentState.collapsed === collapsed) return
      currentState = { ...currentState, collapsed }
      storage.write(currentState)
      notify()
    },
    toggleCollapsed() {
      currentState = { ...currentState, collapsed: !currentState.collapsed }
      storage.write(currentState)
      notify()
    },
    reset() {
      currentState = { ...defaultState }
      storage.write(currentState)
      notify()
    },
    storageKey: resolvedKey,
    narrowBreakpoint,
  }
}
