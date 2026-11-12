/**
 * Panel preferences and the agent/user dismiss machine (SF-3 PR1). Framework-agnostic: state lives in a
 * small observable store, persistence goes through an injected `LayoutStorage`. Lifted in shape from
 * Nanite's panel registry and `PanelPrefs`; nothing is imported from Nanite.
 *
 * Four states per panel: `closed`, `user_opened`, `agent_opened`, `user_dismissed`. An agent open is
 * ignored while the user has dismissed the panel; a user open always wins and clears the dismissal.
 */
import type { HostDiagnostic, LayoutStorage } from '@hollis-labs/plugin-host-ui'

export const PANEL_PREFS_SCHEMA_VERSION = 1

export type PanelOpenSource = 'agent' | 'user'
export type PanelState = 'closed' | 'user_opened' | 'agent_opened' | 'user_dismissed'

export interface PanelDef {
  /** Stable id, unique across built-ins and plugins. */
  id: string
  source: 'builtin' | 'plugin'
  /** Required for plugin panels: the id that owns this panel. */
  pluginId?: string
  /** Sort hint, lower first. Defaults: built-in 0, plugin 100. */
  order?: number
  /** Shown before the user chooses. Defaults: built-in true, plugin false. */
  defaultVisible?: boolean
}

export interface PanelPrefsState {
  schemaVersion: number
  defaultPanel?: string
  enabled: Readonly<Record<string, boolean>>
  order: readonly string[]
  dismissed: Readonly<Record<string, true>>
  openSource: Readonly<Record<string, PanelOpenSource>>
}

export interface PanelPrefsOptions {
  storage: LayoutStorage
  panels: readonly PanelDef[]
  /** Storage key; the schema version is appended. Default `app-shell:panel-prefs`. */
  key?: string
  diagnostic?: (event: HostDiagnostic) => void
}

export interface PanelPrefs {
  readonly state: PanelPrefsState
  getSnapshot(): PanelPrefsState
  getServerSnapshot(): PanelPrefsState
  subscribe(listener: () => void): () => void
  /** Add a panel after creation. A plugin panel never displaces a built-in or another plugin's id; returns false then. */
  register(def: PanelDef): boolean
  unregister(id: string): void
  setOrder(order: readonly string[]): void
  setEnabled(id: string, enabled: boolean): void
  setDefault(id: string | undefined): void
  /** Returns whether the panel is now open; an agent open on a dismissed panel returns false and changes nothing. */
  open(id: string, source: PanelOpenSource): boolean
  /** Close without dismissing (no effect on agent permission). */
  close(id: string): void
  /** The user dismissed the panel: the agent may not reopen it until `clearDismissed`. */
  dismiss(id: string): void
  /** Forget dismissals (one panel, or all), e.g. on a new conversational trigger. */
  clearDismissed(id?: string): void
  stateOf(id: string): PanelState
  isEnabled(id: string): boolean
  /** Registered ids in display order: the user's order first, then by each panel's sort hint. */
  orderedIds(): string[]
}

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const EMPTY: PanelPrefsState = Object.freeze({ schemaVersion: PANEL_PREFS_SCHEMA_VERSION, enabled: Object.freeze({}), order: Object.freeze([]), dismissed: Object.freeze({}), openSource: Object.freeze({}) })

function parse(value: unknown): PanelPrefsState | undefined {
  if (!record(value) || value.schemaVersion !== PANEL_PREFS_SCHEMA_VERSION) return
  const { order, enabled, dismissed, openSource, defaultPanel } = value
  if (!Array.isArray(order) || !order.every(nonEmpty) || !record(enabled) || !record(dismissed) || !record(openSource)) return
  if (defaultPanel !== undefined && !nonEmpty(defaultPanel)) return
  if (!Object.values(enabled).every(v => typeof v === 'boolean') || !Object.values(dismissed).every(v => v === true)) return
  if (!Object.values(openSource).every(v => v === 'agent' || v === 'user')) return
  return Object.freeze({
    schemaVersion: PANEL_PREFS_SCHEMA_VERSION,
    ...(defaultPanel !== undefined ? { defaultPanel } : {}),
    order: Object.freeze([...new Set(order)]),
    enabled: Object.freeze({ ...enabled } as Record<string, boolean>),
    dismissed: Object.freeze({ ...dismissed } as Record<string, true>),
    openSource: Object.freeze({ ...openSource } as Record<string, PanelOpenSource>),
  })
}

const without = <T,>(map: Readonly<Record<string, T>>, id: string): Record<string, T> => {
  return Object.fromEntries(Object.entries(map).filter(([k]) => k !== id))
}

export function createPanelPrefs(options: PanelPrefsOptions): PanelPrefs {
  const { storage, diagnostic = () => {} } = options
  const key = `${options.key ?? 'app-shell:panel-prefs'}:${PANEL_PREFS_SCHEMA_VERSION}`
  const report = (reason: string) => { try { diagnostic({ stage: 'panels', reason }) } catch { /* reporting cannot break the store */ } }
  const panels = new Map<string, PanelDef>()
  const listeners = new Set<() => void>()

  function accept(def: PanelDef): boolean {
    if (!nonEmpty(def.id) || (def.source === 'plugin' && !nonEmpty(def.pluginId))) { report(`invalid-panel:${String(def.id)}`); return false }
    const existing = panels.get(def.id)
    // A plugin may only (re)register its own id: never a built-in's or another plugin's.
    if (def.source === 'plugin' && existing && (existing.source === 'builtin' || existing.pluginId !== def.pluginId)) { report(`panel-id-conflict:${def.id}`); return false }
    panels.set(def.id, def)
    return true
  }
  for (const def of options.panels) accept(def)

  let state = EMPTY
  try {
    const raw = storage.read(key)
    if (raw !== null) { state = parse(JSON.parse(raw)) ?? EMPTY; if (state === EMPTY) report('invalid-panel-prefs') }
  } catch { report('panel-prefs-read-failed') }

  function commit(next: Omit<PanelPrefsState, 'schemaVersion'>) {
    state = Object.freeze({ ...next, schemaVersion: PANEL_PREFS_SCHEMA_VERSION })
    try { storage.write(key, JSON.stringify(state)) } catch { report('panel-prefs-write-failed') }
    for (const l of [...listeners]) { try { l() } catch { report('panel-prefs-subscriber-failed') } }
  }
  const known = (id: string) => panels.has(id)
  const stateOf = (id: string): PanelState =>
    state.dismissed[id] ? 'user_dismissed' : state.openSource[id] === 'user' ? 'user_opened' : state.openSource[id] === 'agent' ? 'agent_opened' : 'closed'
  const isEnabled = (id: string) => state.enabled[id] ?? panels.get(id)?.defaultVisible ?? panels.get(id)?.source === 'builtin'

  return {
    get state() { return state },
    getSnapshot: () => state,
    getServerSnapshot: () => EMPTY,
    subscribe(l) { listeners.add(l); return () => { listeners.delete(l) } },
    register(def) { return accept(def) },
    unregister(id) { panels.delete(id) },
    setOrder(order) {
      if (!order.every(nonEmpty)) throw new Error('Invalid panel order')
      commit({ ...state, order: Object.freeze([...new Set(order)]) })
    },
    setEnabled(id, enabled) { if (known(id)) commit({ ...state, enabled: { ...state.enabled, [id]: enabled } }) },
    setDefault(id) {
      if (id !== undefined && !known(id)) return
      commit({ enabled: state.enabled, order: state.order, dismissed: state.dismissed, openSource: state.openSource, ...(id !== undefined ? { defaultPanel: id } : {}) })
    },
    open(id, source) {
      if (!known(id)) return false
      if (source === 'agent' && state.dismissed[id]) return false
      commit({ ...state, dismissed: source === 'user' ? without(state.dismissed, id) as Record<string, true> : state.dismissed, openSource: { ...state.openSource, [id]: source } })
      return true
    },
    close(id) { if (state.openSource[id]) commit({ ...state, openSource: without(state.openSource, id) }) },
    dismiss(id) {
      if (!known(id)) return
      commit({ ...state, dismissed: { ...state.dismissed, [id]: true }, openSource: without(state.openSource, id) })
    },
    clearDismissed(id) {
      if (id === undefined) { if (Object.keys(state.dismissed).length) commit({ ...state, dismissed: {} }) }
      else if (state.dismissed[id]) commit({ ...state, dismissed: without(state.dismissed, id) as Record<string, true> })
    },
    stateOf,
    isEnabled,
    orderedIds() {
      const rank = (id: string) => panels.get(id)?.order ?? (panels.get(id)?.source === 'builtin' ? 0 : 100)
      const user = state.order.filter(known)
      const rest = [...panels.keys()].filter(id => !user.includes(id)).sort((a, b) => rank(a) - rank(b))
      return [...user, ...rest]
    },
  }
}
