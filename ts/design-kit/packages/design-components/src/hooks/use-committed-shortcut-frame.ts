import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Each exposed handle owns a committed render and a non-revivable subscription lease. */
export function useCommittedShortcutFrame() {
  const [store] = useState(() => {
    let active: object | null = null
    return {
      snapshot: () => active,
      subscribe: (changed: () => void) => {
        const activation = {}
        active = activation
        changed()
        return () => { if (active === activation) active = null }
      },
    }
  })
  const lease = useSyncExternalStore(store.subscribe, store.snapshot, () => null)
  const frame = {}
  const currentFrame = useRef<object | null>(null)
  useLayoutEffect(() => { currentFrame.current = frame })
  return () => lease !== null && store.snapshot() === lease && currentFrame.current === frame
}
