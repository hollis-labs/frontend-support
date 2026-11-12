import {
  BINDING_TABLE_FORMAT, bindingKey, defineBindingTable, resolve, tableVersionOf,
  type BindingDemand, type BindingTable, type GeneratedBindingTable, type GeneratedRow, type Origin, type Resolution,
  type UnresolvedEntry,
} from '@hollis-labs/design-bindings'
import { createVersionedStore, type VersionedStore } from '@hollis-labs/design-app-runtime'
import type { ShellDiagnostic } from './manifest'

/**
 * The consumer half of SF-4. The generator (design-bindings `generateBindingTable`) writes a
 * versioned table as plain data; this loads it into design-bindings and into the versioned store
 * the shell reads, so a new table swaps in live. Nothing here chooses a renderer: kind to
 * renderer stays with design-bindings, and a kind or origin the table does not serve is a miss
 * with a shell diagnostic, never a default renderer.
 */

/** What the Substrate frontend manifest carries as binding-table input: the kinds the app draws. */
export type ManifestBindingInput = BindingDemand

export interface LoadedBindings {
  /** The generated table's content version; a store swap happens only when it changes. */
  readonly version: string
  readonly profile: string
  readonly table: BindingTable
  /** Origins each `kind@version` may serve under the profile. */
  readonly origins: ReadonlyMap<string, readonly Origin[]>
  readonly unresolved: readonly UnresolvedEntry[]
}

export type BindingStore = VersionedStore<LoadedBindings | undefined>

export type RendererSelector = (kind: string, version: string, origin: Origin) => Resolution

export type LoadResult =
  | { ok: true; bindings: LoadedBindings }
  | { ok: false; diagnostics: readonly ShellDiagnostic[] }

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const malformed = (message: string): LoadResult => ({ ok: false, diagnostics: [{ code: 'malformed-binding-table', message }] })

/** Accept a generated table or refuse it. The version is recomputed: an edited table is not loaded. */
export function loadBindingTable(value: unknown): LoadResult {
  if (!isRecord(value)) return malformed('The binding table is not an object.')
  if (value.format !== BINDING_TABLE_FORMAT) {
    return malformed(`The binding table has format ${JSON.stringify(value.format)}; this shell reads ${BINDING_TABLE_FORMAT}.`)
  }
  if (!Array.isArray(value.rows) || !Array.isArray(value.unresolved) || !isRecord(value.resolverConfig)
    || typeof value.contractDigest !== 'string' || typeof value.profile !== 'string' || typeof value.version !== 'string') {
    return malformed('The binding table is missing rows, unresolved, resolverConfig, contractDigest, profile or version.')
  }
  const generated = value as unknown as GeneratedBindingTable
  if (tableVersionOf(generated) !== generated.version) {
    return malformed(`The binding table's version ${generated.version} does not match its content; regenerate it.`)
  }
  const decisions = new Map<string, GeneratedRow['decision']>()
  const origins = new Map<string, readonly Origin[]>()
  for (const row of generated.rows) {
    decisions.set(`${row.key}|${row.request.rendererId}`, row.decision)
    origins.set(row.key, [...(origins.get(row.key) ?? []), ...row.origins])
  }
  const table = defineBindingTable({
    contractDigest: generated.contractDigest,
    resolverConfig: generated.resolverConfig,
    trust: request => decisions.get(`${bindingKey(request.kind, request.version)}|${request.rendererId}`)
      ?? { unavailable: `the binding table carries no decision for "${request.kind}"` },
    rows: generated.rows.map(r => r.request),
  })
  return { ok: true, bindings: { version: generated.version, profile: generated.profile, table, origins, unresolved: generated.unresolved } }
}

export function createBindingStore(): BindingStore {
  return createVersionedStore<LoadedBindings | undefined>(undefined)
}

/**
 * Feed a generated table to the store. The same version again is a no-op; a different one swaps in
 * and the store's subscribers (the shell) re-render. A table that fails to load leaves the current
 * one in place and is reported.
 */
export function applyBindingTable(store: BindingStore, value: unknown): readonly ShellDiagnostic[] {
  const loaded = loadBindingTable(value)
  if (!loaded.ok) return loaded.diagnostics
  if (store.get()?.version !== loaded.bindings.version) store.set(loaded.bindings)
  return []
}

/** One diagnostic per demand the generator could not serve. */
export function bindingDiagnostics(bindings: LoadedBindings | undefined): readonly ShellDiagnostic[] {
  return (bindings?.unresolved ?? []).map(u => ({
    code: 'unresolved-binding' as const,
    message: `${u.code}: ${u.reason}`,
    kind: u.kind,
    key: u.key,
  }))
}

export function createRendererSelector(bindings: LoadedBindings | undefined): RendererSelector {
  return (kind, version, origin) => {
    const miss = (code: 'unclassified' | 'quarantined', reason: string): Resolution => ({ ok: false, code, kind, reason, fallbackRendererId: null })
    if (!bindings) return miss('unclassified', 'No binding table was provided to the shell.')
    const key = bindingKey(kind, version)
    const unresolved = bindings.unresolved.find(u => u.key === key && (u.origin === undefined || u.origin === origin))
    if (unresolved) return miss(unresolved.code === 'origin-not-permitted' ? 'quarantined' : 'unclassified', unresolved.reason)
    const permitted = bindings.origins.get(key)
    if (permitted && !permitted.includes(origin)) {
      return miss('quarantined', `profile "${bindings.profile}" does not permit ${origin}-origin content for "${kind}" at version ${version}`)
    }
    return resolve(bindings.table, kind, { version, origin })
  }
}
