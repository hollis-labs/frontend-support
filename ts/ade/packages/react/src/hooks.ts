import type {
  Attention,
  GuideState,
  Hub,
  Mark,
  SurfaceAdapter,
  SurfaceHandle,
} from "@hollis-labs/ade-core"
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react"

export const HubContext = createContext<Hub | null>(null)

/** The hub given by AdeProvider. */
export function useHub(): Hub {
  const hub = useContext(HubContext)
  if (!hub) throw new Error("useHub needs an <AdeProvider>.")
  return hub
}

/** Re-render when anything in the hub changes. Returns a number that changes with it. */
export function useHubVersion(hub: Hub): number {
  return useSyncExternalStore(
    (fn) => hub.subscribe(fn),
    () => hub.getVersion(),
    () => 0,
  )
}

/**
 * Put a surface in front of the person and the agent for as long as the component is
 * mounted. `make` is called on every render and may close over fresh state: the surface
 * always answers with the latest. Call the returned handle's changed() after the content
 * changes by itself (not through an action), and moved() when the layout does.
 */
export function useSurface(make: () => SurfaceAdapter): SurfaceHandle {
  const hub = useHub()
  const latest = useRef(make)
  latest.current = make
  const first = useMemo(() => make().info, []) // biome-ignore lint/correctness/useExhaustiveDependencies: a surface's identity is fixed when it mounts
  const handle = useRef<SurfaceHandle | null>(null)
  const stable = useMemo<SurfaceHandle>(
    () => ({
      changed: () => handle.current?.changed(),
      moved: () => handle.current?.moved(),
      remove: () => handle.current?.remove(),
    }),
    [],
  )
  useEffect(() => {
    const adapter: SurfaceAdapter = {
      info: first,
      observe: () => latest.current().observe(),
      act: (action, input, ctx) => latest.current().act(action, input, ctx),
      resolve: (anchor) => latest.current().resolve?.(anchor) ?? null,
      check: (name, args) => latest.current().check?.(name, args) ?? false,
      describe: (anchor) => latest.current().describe?.(anchor) ?? "",
      bounds: () => latest.current().bounds?.() ?? null,
      has: (target) => {
        const now = latest.current()
        if (now.has) return now.has(target)
        const listed = now.observe().targets
        return listed ? listed.some((t) => t.kind === target.kind && t.id === target.id) : true
      },
    }
    handle.current = hub.register(adapter)
    return () => {
      handle.current?.remove()
      handle.current = null
    }
  }, [hub, first])
  return stable
}

/** Everything pointed at now. */
export function useAttention(): Attention[] {
  const hub = useHub()
  const v = useHubVersion(hub)
  return useMemo(() => hub.attentionNow(), [hub, v]) // biome-ignore lint/correctness/useExhaustiveDependencies: v is the hub's change counter
}

/** The guide, or null. */
export function useGuide(): GuideState | null {
  const hub = useHub()
  useHubVersion(hub)
  return hub.guideState()
}

/** The marks kept on a surface. */
export function useMarks(surface: string): Mark[] {
  const hub = useHub()
  const v = useHubVersion(hub)
  return useMemo(() => hub.marks(surface), [hub, surface, v]) // biome-ignore lint/correctness/useExhaustiveDependencies: v is the hub's change counter
}
