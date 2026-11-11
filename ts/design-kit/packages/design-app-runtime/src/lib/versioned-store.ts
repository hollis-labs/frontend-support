/**
 * A generic versioned value store. Holds one immutable value, bumps a version when the
 * reference changes, and notifies subscribers. Not typed to any domain — an app can hold
 * a design-bindings table here, but this package never imports it.
 */
export interface VersionedStore<T> {
  get(): T
  /** Starts at 0; incremented once per effective `set`. */
  version(): number
  /** Same reference as the current value is a no-op: no version bump, no notify. */
  set(next: T): void
  /** Returns an unsubscribe function. Listeners run in subscription order. */
  subscribe(listener: () => void): () => void
}

export function createVersionedStore<T>(initial: T): VersionedStore<T> {
  let value = initial
  let version = 0
  const listeners: Array<() => void> = []

  return {
    get: () => value,
    version: () => version,
    set(next) {
      if (Object.is(next, value)) return
      value = next
      version += 1
      // Snapshot so a listener that (un)subscribes mid-notify does not disturb this round.
      for (const listener of listeners.slice()) {
        try {
          listener()
        } catch (error) {
          // A throwing listener must not stop the others; surface it without unwinding set().
          queueMicrotask(() => { throw error })
        }
      }
    },
    subscribe(listener) {
      const entry = () => listener()
      listeners.push(entry)
      return () => {
        const i = listeners.indexOf(entry)
        if (i >= 0) listeners.splice(i, 1)
      }
    },
  }
}
