/**
 * Docked-region behaviour from the SF-2 vocabulary (v0.3, "Docked regions"): `openState`,
 * `exclusive`, `sizes`, `dismissKey` and `mobile`. `anchor` comes from the manifest's region
 * catalog; the rest are not in that catalog yet, so the host supplies them per region and the
 * shell applies them. A region the host says nothing about gets the vocabulary defaults.
 */
import { useCallback, useMemo, useState } from 'react'
import type { LayoutStorage } from '@hollis-labs/plugin-host-ui'
import { nextOrder, restoreFocus } from './overlays'
import type { ShellDiagnostic } from './manifest'

export const DOCK_SIZES = ['sm', 'md', 'lg'] as const
export type DockSize = (typeof DOCK_SIZES)[number]

/** The attributes a host publishes for a docked region. */
export interface DockAttributes {
  /** `hidden` (default) or `open`: whether the region starts with its first tab showing. */
  openState?: 'hidden' | 'open'
  /** True: one tab open at a time in this region. */
  exclusive?: boolean
  /** The size tokens the user may pick from, and the one used until they pick. Remembered per user. */
  sizes?: { options: readonly DockSize[]; default: DockSize }
  /** The key that closes the region; `Esc` (default). */
  dismissKey?: 'Esc'
  /** How the region presents on a narrow screen. */
  mobile?: 'bottom-sheet'
  /** `side` (default) is a right-hand panel; `bottom` is a resizable bottom dock (a bottom sheet on a narrow screen). */
  anchor?: 'side' | 'bottom'
  /** Bottom dock height in px: the least a drag may leave open, the starting height and the most. Defaults 120 / 240 / 640. */
  heightPx?: DockHeight
}

export interface DockHeight { min: number; default: number; max?: number }

export interface ResolvedDockAttributes {
  openState: 'hidden' | 'open'
  exclusive: boolean
  sizes: { options: readonly DockSize[]; default: DockSize }
  dismissKey: 'Esc'
  mobile: 'bottom-sheet'
  anchor: 'side' | 'bottom'
  heightPx: Required<DockHeight>
}

export const DEFAULT_DOCK_HEIGHT: Required<DockHeight> = { min: 120, default: 240, max: 640 }

export const DEFAULT_DOCK_ATTRIBUTES: ResolvedDockAttributes = {
  openState: 'hidden', exclusive: false, sizes: { options: ['md'], default: 'md' }, dismissKey: 'Esc', mobile: 'bottom-sheet', anchor: 'side', heightPx: DEFAULT_DOCK_HEIGHT,
}

const sizeOk = (v: unknown): v is DockSize => (DOCK_SIZES as readonly unknown[]).includes(v)

/** Check one region's attributes; returns the problems (empty when valid). */
export function dockAttributeProblems(a: DockAttributes): string[] {
  const out: string[] = []
  if (a.openState !== undefined && a.openState !== 'hidden' && a.openState !== 'open') out.push(`openState "${String(a.openState)}"`)
  if (a.exclusive !== undefined && typeof a.exclusive !== 'boolean') out.push('exclusive is not a boolean')
  if (a.dismissKey !== undefined && a.dismissKey !== 'Esc') out.push(`dismissKey "${String(a.dismissKey)}"`)
  if (a.mobile !== undefined && a.mobile !== 'bottom-sheet') out.push(`mobile "${String(a.mobile)}"`)
  if (a.anchor !== undefined && a.anchor !== 'side' && a.anchor !== 'bottom') out.push(`anchor "${String(a.anchor)}"`)
  if (a.heightPx !== undefined) {
    const { min, default: def, max = DEFAULT_DOCK_HEIGHT.max } = a.heightPx
    if (![min, def, max].every(n => Number.isFinite(n) && n > 0)) out.push('heightPx values must be positive numbers')
    else if (!(min <= def && def <= max)) out.push('heightPx must satisfy min <= default <= max')
    if (a.anchor !== 'bottom') out.push('heightPx applies only to anchor "bottom"')
  }
  if (a.sizes !== undefined) {
    const { options, default: def } = a.sizes
    if (!Array.isArray(options) || !options.length || !options.every(sizeOk) || new Set(options).size !== options.length) out.push('sizes.options must be a non-empty list of distinct size tokens')
    else if (!options.includes(def)) out.push(`sizes.default "${String(def)}" is not one of the options`)
  }
  return out
}

/** Merge host-supplied attributes over the defaults. Invalid sets are refused whole, with a diagnostic. */
export function resolveDockAttributes(region: string, given: DockAttributes | undefined, diagnostics: ShellDiagnostic[]): ResolvedDockAttributes {
  if (!given) return DEFAULT_DOCK_ATTRIBUTES
  const problems = dockAttributeProblems(given)
  if (problems.length) {
    diagnostics.push({ code: 'invalid-dock-attributes', message: `Dock attributes for region "${region}" were not applied: ${problems.join('; ')}.` })
    return DEFAULT_DOCK_ATTRIBUTES
  }
  const anchor = given.anchor ?? DEFAULT_DOCK_ATTRIBUTES.anchor
  return {
    openState: given.openState ?? DEFAULT_DOCK_ATTRIBUTES.openState,
    // A bottom dock shows one tab at a time, switched from its tab strip.
    exclusive: given.exclusive ?? anchor === 'bottom',
    anchor,
    heightPx: { ...DEFAULT_DOCK_HEIGHT, ...given.heightPx },
    sizes: given.sizes ?? DEFAULT_DOCK_ATTRIBUTES.sizes,
    dismissKey: given.dismissKey ?? DEFAULT_DOCK_ATTRIBUTES.dismissKey,
    mobile: given.mobile ?? DEFAULT_DOCK_ATTRIBUTES.mobile,
  }
}

/** `Esc` is the vocabulary's name for the Escape key. */
export const dismissMatches = (dismissKey: string, key: string): boolean => (dismissKey === 'Esc' ? key === 'Escape' : dismissKey === key)

export interface DockOpen { region: string; tab: string; trigger: HTMLElement | null; seq: number }
export interface DockRegionState { region: string; attributes: ResolvedDockAttributes; tabs: readonly string[] }

export interface DockState {
  open: readonly DockOpen[]
  isOpen(tab: string): boolean
  /** Open the tab, or close it when already open. An exclusive region closes its other tabs. */
  toggle(region: string, tab: string, trigger: HTMLElement | null): void
  close(tab: string): void
  size(region: string): DockSize
  setSize(region: string, size: DockSize): void
  /** A bottom dock's height in px: the user's last drag, else the region's default. */
  height(region: string): number
  setHeight(region: string, px: number): void
}

const sizeKey = (app: string, region: string) => `app-shell:dock-size:${app}:${region}`
const heightKey = (app: string, region: string) => `app-shell:dock-height:${app}:${region}`

export const clampHeight = (h: Required<DockHeight>, px: number): number => Math.min(h.max, Math.max(h.min, Math.round(px)))

export function useDockState(app: string, regions: readonly DockRegionState[], storage?: LayoutStorage): DockState {
  const [raw, setRaw] = useState<readonly DockOpen[]>(() =>
    regions.filter(r => r.attributes.openState === 'open' && r.tabs.length).map(r => ({ region: r.region, tab: r.tabs[0]!, trigger: null, seq: nextOrder() })))
  const [picked, setPicked] = useState<Readonly<Record<string, DockSize>>>({})
  const byRegion = useMemo(() => new Map(regions.map(r => [r.region, r])), [regions])
  // A tab the manifest no longer carries cannot stay open.
  const open = useMemo(() => raw.filter(o => byRegion.get(o.region)?.tabs.includes(o.tab)), [raw, byRegion])
  const toggle = useCallback<DockState['toggle']>((region, tab, trigger) => {
    const hit = open.find(o => o.tab === tab)
    const exclusive = byRegion.get(region)?.attributes.exclusive === true
    const dropped = hit ? [hit] : exclusive ? open.filter(o => o.region === region) : []
    setRaw(prev => {
      const kept = prev.filter(o => !dropped.includes(o) && !(hit && o.tab === tab))
      return hit ? kept : [...kept, { region, tab, trigger, seq: nextOrder() }]
    })
    if (hit) queueMicrotask(() => restoreFocus(hit.trigger))
  }, [open, byRegion])
  const close = useCallback((tab: string) => {
    const hit = open.find(o => o.tab === tab)
    if (!hit) return
    setRaw(prev => prev.filter(o => o !== hit))
    queueMicrotask(() => restoreFocus(hit.trigger))
  }, [open])
  const size = useCallback((region: string): DockSize => {
    const attrs = byRegion.get(region)?.attributes ?? DEFAULT_DOCK_ATTRIBUTES
    const usable = (v: unknown): v is DockSize => sizeOk(v) && attrs.sizes.options.includes(v)
    if (usable(picked[region])) return picked[region]
    let stored: string | null = null
    try { stored = storage?.read(sizeKey(app, region)) ?? null } catch { stored = null }
    return usable(stored) ? stored : attrs.sizes.default
  }, [byRegion, picked, storage, app])
  const setSize = useCallback((region: string, next: DockSize) => {
    if (!byRegion.get(region)?.attributes.sizes.options.includes(next)) return
    setPicked(p => ({ ...p, [region]: next }))
    try { storage?.write(sizeKey(app, region), next) } catch { /* a full or blocked store only loses the memory */ }
  }, [byRegion, storage, app])
  const [heights, setHeights] = useState<Readonly<Record<string, number>>>({})
  const height = useCallback((region: string): number => {
    const range = (byRegion.get(region)?.attributes ?? DEFAULT_DOCK_ATTRIBUTES).heightPx
    if (heights[region] !== undefined) return clampHeight(range, heights[region])
    let stored: number | null = null
    try { const raw = storage?.read(heightKey(app, region)); stored = raw ? Number(raw) : null } catch { stored = null }
    return stored !== null && Number.isFinite(stored) ? clampHeight(range, stored) : range.default
  }, [byRegion, heights, storage, app])
  const setHeight = useCallback((region: string, px: number) => {
    const range = byRegion.get(region)?.attributes.heightPx
    if (!range || !Number.isFinite(px)) return
    const next = clampHeight(range, px)
    setHeights(h => ({ ...h, [region]: next }))
    try { storage?.write(heightKey(app, region), String(next)) } catch { /* a full or blocked store only loses the memory */ }
  }, [byRegion, storage, app])
  return useMemo(() => ({ open, isOpen: tab => open.some(o => o.tab === tab), toggle, close, size, setSize, height, setHeight }), [open, toggle, close, size, setSize, height, setHeight])
}
