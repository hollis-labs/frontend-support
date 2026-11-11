import { useSyncExternalStore } from 'react'
import type { VersionedStore } from '../lib/versioned-store'

/** Re-renders when the store's value changes; the snapshot is stable between changes. */
export function useVersionedStore<T>(store: VersionedStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
