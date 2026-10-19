import type { HostScope, Observable, HostDiagnostic } from './host.js'
export interface LayoutStorage { read(key: string): string | null; write(key: string, value: string): void; remove(key: string): void }
export interface LayoutPreferences { order: readonly string[]; visibility: Readonly<Record<string, boolean>>; selected?: string }
export interface LayoutSnapshot extends LayoutPreferences { schemaVersion: number }
export interface PluginLayoutStore extends Observable<LayoutSnapshot> {
  key: string
  save(preferences: LayoutPreferences): void
  reconcile(available: readonly string[], retainMissing?: boolean): void
  reset(): void
}
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
function projection(value: unknown, schemaVersion: number): LayoutSnapshot | undefined {
  if (!record(value) || value.schemaVersion !== schemaVersion || !Array.isArray(value.order) || value.order.some(id => typeof id !== 'string' || !id) ||
    !record(value.visibility) || Object.values(value.visibility).some(v => typeof v !== 'boolean') ||
    value.selected !== undefined && (typeof value.selected !== 'string' || !value.selected)) return
  const visibility: Record<string, boolean> = Object.create(null)
  for (const [key, visible] of Object.entries(value.visibility)) visibility[key] = visible as boolean
  return Object.freeze({ schemaVersion, order: Object.freeze([...new Set(value.order as string[])]), visibility: Object.freeze(visibility),
    ...(value.selected !== undefined ? { selected: value.selected as string } : {}) })
}
/** Explicit host storage only; preferences never include props, sessions, settings or secrets. */
export function createPluginLayoutStore(storage: LayoutStorage, scope: HostScope, region: string, schemaVersion = 1,
  diagnostic: (event: HostDiagnostic) => void = () => {}): PluginLayoutStore {
  if (!region || !Number.isSafeInteger(schemaVersion) || schemaVersion < 1) throw new Error('Invalid plugin layout scope/version')
  const key = JSON.stringify(['plugin-host-ui', 'layout', schemaVersion, scope.appId, scope.environmentId, scope.projectId ?? null, scope.clientId, region])
  const empty = projection({ schemaVersion, order: [], visibility: {} }, schemaVersion)!
  let snapshot = empty
  const listeners = new Set<() => void>()
  const report = (reason: string) => { try { diagnostic({ stage: 'persistence', reason }) } catch { /* reporting cannot break fallback */ } }
  try { const raw = storage.read(key); if (raw !== null) { snapshot = projection(JSON.parse(raw), schemaVersion) ?? empty; if (snapshot === empty) report('invalid-layout') } }
  catch { report('layout-read-failed') }
  function update(next: LayoutSnapshot, persist: boolean) {
    snapshot = next
    if (persist) { try { storage.write(key, JSON.stringify(next)) } catch { report('layout-write-failed') } }
    for (const listener of [...listeners]) { try { listener() } catch { report('layout-subscriber-failed') } }
  }
  return {
    key, getSnapshot: () => snapshot, getServerSnapshot: () => empty,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    save(preferences) {
      const next = projection({ schemaVersion, order: preferences.order, visibility: preferences.visibility, selected: preferences.selected }, schemaVersion)
      if (!next) throw new Error('Invalid layout preferences')
      update(next, true)
    },
    reconcile(available, retainMissing = true) {
      const known = new Set(available)
      const order = [...new Set([...snapshot.order.filter(id => retainMissing || known.has(id)), ...available])]
      const visibility = Object.fromEntries(Object.entries(snapshot.visibility).filter(([id]) => retainMissing || known.has(id)))
      const selected = snapshot.selected && known.has(snapshot.selected) && visibility[snapshot.selected] !== false
        ? snapshot.selected : order.find(id => known.has(id) && visibility[id] !== false)
      update(projection({ schemaVersion, order, visibility, selected }, schemaVersion)!, true)
    },
    reset() { try { storage.remove(key) } catch { report('layout-remove-failed') }; update(empty, false) },
  }
}
