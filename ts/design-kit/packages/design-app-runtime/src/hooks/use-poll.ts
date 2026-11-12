import { useCallback, useEffect, useRef, useState } from 'react'

export interface UsePollResult<TData> {
  data: TData | null
  error: unknown
  isLoading: boolean
  /** Force an immediate re-fetch. */
  refetch: () => Promise<void>
}

export type PollFetcher<TData> = (signal: AbortSignal) => Promise<TData>

type RefreshListener = () => void

const DEFAULT_INTERVAL_MS = 15_000

/**
 * A set of `usePoll` instances that refresh together.
 *
 * This used to be a bare module-level `Set`. That is the defect flagged in
 * Nanite's command history and again by the CW-0116 triage, and it has two real
 * costs: two independent parts of an app cannot refresh separately, and a test
 * cannot isolate its subscribers from another test's. Making the registry an
 * object does not change the default behaviour — `refreshPolledData()` still
 * refreshes everything — it just stops "everything" from being the only option.
 */
export interface RefreshRegistry {
  /** Register a listener. Returns an unsubscribe function. */
  subscribe(listener: RefreshListener): () => void
  /** Fire every registered listener. */
  refresh(): void
  /** Live subscriber count. Exposed for tests and leak checks. */
  readonly size: number
}

export function createRefreshRegistry(): RefreshRegistry {
  const listeners = new Set<RefreshListener>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    refresh() {
      // Iterate a copy: a listener that unsubscribes during refresh would
      // otherwise mutate the set mid-iteration.
      for (const listener of [...listeners]) listener()
    },
    get size() {
      return listeners.size
    },
  }
}

/**
 * The process-wide registry every `usePoll` joins unless told otherwise. Keeping
 * a default is what makes this change additive rather than a breaking one.
 */
export const defaultRefreshRegistry = createRefreshRegistry()

/** Trigger a re-fetch on every mounted `usePoll` instance on the default registry. */
export function refreshPolledData() {
  defaultRefreshRegistry.refresh()
}

export interface UsePollOptions {
  /** Refresh alongside this registry instead of the process-wide default. */
  registry?: RefreshRegistry
}

/**
 * Poll an async fetcher on an interval, pausing while the tab is hidden and
 * aborting in-flight requests on unmount / re-fetch. `intervalMs <= 0`
 * disables the interval (fetch-once). `enabled = false` pauses polling
 * entirely — no fetch-on-mount, no interval — and resumes (with an immediate
 * fetch) when it flips back to true.
 *
 * NOTE ON THE IMPLEMENTATION, so nobody "fixes" it back: this hook deliberately
 * does NOT use React's experimental `useEffectEvent`. The original Sysop version
 * did, and `eslint-plugin-react-hooks` v7 rejects it (rules-of-hooks +
 * use-before-define + unsafe-finally). The `useCallback` + ref-mirror pattern
 * below is the intentional replacement and preserves the behaviour exactly —
 * interval polling, visibility pause, abort-on-unmount, refresh listeners.
 * Captured as [[sysop_ui_build_quirks]].
 */
export function usePoll<TData>(
  fetcher: PollFetcher<TData>,
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
  options: UsePollOptions = {},
): UsePollResult<TData> {
  const registry = options.registry ?? defaultRefreshRegistry
  const [data, setData] = useState<TData | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [isLoading, setIsLoading] = useState(enabled)

  const isMountedRef = useRef(true)
  const intervalRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const dataRef = useRef<TData | null>(null)

  // Latest props are mirrored into refs (in an effect, never during render) so
  // the polling callbacks below stay referentially stable.
  const fetcherRef = useRef(fetcher)
  const intervalMsRef = useRef(intervalMs)
  const enabledRef = useRef(enabled)
  const runFetchRef = useRef<((showLoading: boolean) => Promise<void>) | null>(null)

  const clearScheduledPoll = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const scheduleNextPoll = useCallback(() => {
    clearScheduledPoll()
    if (document.hidden || intervalMsRef.current <= 0 || !enabledRef.current) {
      return
    }
    intervalRef.current = window.setTimeout(() => {
      void runFetchRef.current?.(false)
    }, intervalMsRef.current)
  }, [clearScheduledPoll])

  const runFetch = useCallback(
    async (showLoading: boolean) => {
      if (!enabledRef.current) {
        return
      }
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      if (showLoading) {
        setIsLoading(true)
      }

      try {
        const nextData = await fetcherRef.current(controller.signal)
        if (!isMountedRef.current || controller.signal.aborted) {
          return
        }
        setData(nextData)
        dataRef.current = nextData
        setError(null)
      } catch (cause) {
        if (!isMountedRef.current || controller.signal.aborted) {
          return
        }
        setError(cause)
      } finally {
        if (isMountedRef.current && !controller.signal.aborted) {
          setIsLoading(false)
          scheduleNextPoll()
        }
      }
    },
    [scheduleNextPoll],
  )

  // Sync the latest fetcher / interval / runFetch into their refs.
  useEffect(() => {
    fetcherRef.current = fetcher
    intervalMsRef.current = intervalMs
    enabledRef.current = enabled
    runFetchRef.current = runFetch
  })

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearScheduledPoll()
      abortControllerRef.current?.abort()
    }
  }, [clearScheduledPoll])

  // Fetch-on-mount and react to `enabled`: an immediate fetch when enabled
  // (or re-enabled), a clean stop when disabled. `enabledRef` is synced in a
  // separate effect, so set it eagerly here too — this effect can run first.
  useEffect(() => {
    enabledRef.current = enabled
    if (enabled) {
      // `runFetch` performs no synchronous setState — its setData/setError/
      // setIsLoading calls all happen after an `await`.
      void runFetch(dataRef.current === null)
    } else {
      clearScheduledPoll()
      abortControllerRef.current?.abort()
      setIsLoading(false)
    }
  }, [enabled, runFetch, clearScheduledPoll])

  useEffect(() => {
    return registry.subscribe(() => {
      void runFetch(dataRef.current === null)
    })
  }, [registry, runFetch])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearScheduledPoll()
        abortControllerRef.current?.abort()
        return
      }
      void runFetch(dataRef.current === null)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [runFetch, clearScheduledPoll])

  const refetch = useCallback(async () => {
    await runFetch(dataRef.current === null)
  }, [runFetch])

  return { data, error, isLoading, refetch }
}

// TODO: Phase 2 — migrate to SSE once backends emit events.
