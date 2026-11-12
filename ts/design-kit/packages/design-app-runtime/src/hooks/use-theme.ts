import { useSyncExternalStore } from 'react'
import type { ThemeStore } from '../lib/theme-store'

/** Mount once near the app root; pass state/actions to the controlled UI. */
export function useTheme(store: ThemeStore) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  return { ...state, setTheme: store.setTheme, setMode: store.setMode }
}
