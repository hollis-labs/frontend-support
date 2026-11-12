/**
 * The binding-table generator: renderer catalog + host profile (+ the demand the Substrate
 * frontend manifest carries) in, a versioned table out, in the format `loadBindingTable`
 * (app-shell) feeds to `defineBindingTable`.
 *
 * Pure and deterministic: the same catalog, profile and demand always yield the same table,
 * and `serializeBindingTable` the same bytes, whatever order the inputs arrived in. The
 * generator decides kind to renderer and admission only. Density, surfaces, priority and the
 * action schema are host data keyed by `rendererId` and never enter a table (ADR
 * renderer_selection_design_bindings_owner).
 *
 * A demand the catalog or the profile cannot serve becomes an explicit `unresolved` entry with
 * its reason. It never becomes a default renderer.
 */
import type { BindingRequest } from './binding.ts'
import type { HostDecision, ResolverConfig } from './table.ts'
import { bindingKey } from './table.ts'
import { trustProfileFor, type Isolation, type Origin, type RendererClass } from './trust.ts'

export const BINDING_TABLE_FORMAT = 'hollis.binding-table/1'

/** One renderer's claim on one `kind@version`. The catalog is a flat list of these. */
export type CatalogRow = BindingRequest

export interface RendererCatalog {
  readonly contractDigest: string
  readonly rows: readonly CatalogRow[]
}

export interface HostProfile {
  readonly id: string
  /** Origins this host serves at all. */
  readonly origins: readonly Origin[]
  /** The isolation granted per renderer class. A class absent here is unavailable on this host. */
  readonly isolation: { readonly [C in RendererClass]?: Isolation }
  /** Renderers the host refuses, by id, with the reason shown to the user. */
  readonly quarantine?: { readonly [rendererId: string]: string }
  readonly resolverConfig: ResolverConfig
}

/** What the manifest asks to be drawn: a kind at a version, optionally from one origin. */
export interface BindingDemand {
  readonly kind: string
  readonly version: string
  readonly origin?: Origin
}

export interface GeneratedRow {
  readonly key: string
  readonly request: BindingRequest
  readonly decision: HostDecision
  /** Origins this row may serve under this profile. */
  readonly origins: readonly Origin[]
}

export type UnresolvedCode = 'unknown-kind' | 'unknown-version' | 'origin-not-permitted'

export interface UnresolvedEntry {
  readonly key: string
  readonly kind: string
  readonly version: string
  readonly origin?: Origin
  readonly code: UnresolvedCode
  readonly reason: string
}

export interface GeneratedBindingTable {
  readonly format: typeof BINDING_TABLE_FORMAT
  /** Content version: changes exactly when anything below it changes. */
  readonly version: string
  readonly profile: string
  readonly contractDigest: string
  readonly resolverConfig: ResolverConfig
  readonly rows: readonly GeneratedRow[]
  readonly unresolved: readonly UnresolvedEntry[]
}

export interface GenerateInput {
  readonly catalog: RendererCatalog
  readonly profile: HostProfile
  /** Absent: every catalog row is tabled. Present: only what is demanded, and misses are listed. */
  readonly demand?: readonly BindingDemand[]
}

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

function decide(request: BindingRequest, profile: HostProfile): HostDecision {
  const quarantined = profile.quarantine?.[request.rendererId]
  if (quarantined !== undefined) return { quarantine: quarantined }
  const admit = profile.isolation[request.rendererClass]
  if (admit === undefined) {
    return { unavailable: `profile "${profile.id}" grants no isolation to "${request.rendererClass}" renderers` }
  }
  return { admit }
}

function originsFor(decision: HostDecision, profile: HostProfile): readonly Origin[] {
  const ambient = 'admit' in decision && trustProfileFor(decision.admit).ambientHostAuthority
  return [...profile.origins].filter((o) => !(o === 'agent' && ambient)).sort(byString)
}

export function generateBindingTable(input: GenerateInput): GeneratedBindingTable {
  const { catalog, profile, demand } = input
  const catalogKeys = new Map<string, CatalogRow[]>()
  for (const row of catalog.rows) {
    const key = bindingKey(row.kind, row.version)
    const list = catalogKeys.get(key)
    if (list) list.push(row)
    else catalogKeys.set(key, [row])
  }
  const kinds = new Set(catalog.rows.map((r) => r.kind))

  const wanted = new Set<string>()
  const unresolved = new Map<string, UnresolvedEntry>()
  for (const d of demand ?? []) {
    const key = bindingKey(d.kind, d.version)
    const rows = catalogKeys.get(key)
    if (!rows) {
      const code: UnresolvedCode = kinds.has(d.kind) ? 'unknown-version' : 'unknown-kind'
      unresolved.set(`${key}|${d.origin ?? ''}`, {
        key, kind: d.kind, version: d.version, ...(d.origin ? { origin: d.origin } : {}), code,
        reason: code === 'unknown-kind'
          ? `the renderer catalog has no renderer for "${d.kind}"`
          : `the renderer catalog has "${d.kind}" but not at version ${d.version}`,
      })
      continue
    }
    if (d.origin) {
      const served = rows.some((r) => originsFor(decide(r, profile), profile).includes(d.origin as Origin))
      if (!served) {
        unresolved.set(`${key}|${d.origin}`, {
          key, kind: d.kind, version: d.version, origin: d.origin, code: 'origin-not-permitted',
          reason: `profile "${profile.id}" does not permit ${d.origin}-origin content for "${d.kind}" at version ${d.version}`,
        })
        continue
      }
    }
    wanted.add(key)
  }

  const rows: GeneratedRow[] = catalog.rows
    .filter((r) => demand === undefined || wanted.has(bindingKey(r.kind, r.version)))
    .map((request) => {
      const decision = decide(request, profile)
      return { key: bindingKey(request.kind, request.version), request, decision, origins: originsFor(decision, profile) }
    })
    .sort((a, b) => byString(a.key, b.key) || byString(a.request.rendererId, b.request.rendererId))

  const sortedUnresolved = [...unresolved.values()].sort(
    (a, b) => byString(a.key, b.key) || byString(a.origin ?? '', b.origin ?? ''),
  )
  const body: Omit<GeneratedBindingTable, 'version'> = {
    format: BINDING_TABLE_FORMAT,
    profile: profile.id,
    contractDigest: catalog.contractDigest,
    resolverConfig: profile.resolverConfig,
    rows,
    unresolved: sortedUnresolved,
  }
  return normalize({ ...body, version: tableVersionOf(body) }) as unknown as GeneratedBindingTable
}

/** Canonical JSON: keys sorted at every depth, two-space indent, trailing newline. */
export function serializeBindingTable(table: GeneratedBindingTable): string {
  return `${JSON.stringify(normalize(table), null, 2)}\n`
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value).sort(byString)) {
      const v = (value as Record<string, unknown>)[k]
      if (v !== undefined) out[k] = normalize(v)
    }
    return out
  }
  return value
}

/** The content version of a table body: FNV-1a (64-bit) over its canonical JSON. Identity, not security. */
export function tableVersionOf(body: Omit<GeneratedBindingTable, 'version'>): string {
  const { version: _ignored, ...rest } = body as Record<string, unknown>
  void _ignored
  const text = JSON.stringify(normalize(rest))
  let h = 0xcbf29ce484222325n
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i))
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return `bt1-${h.toString(16).padStart(16, '0')}`
}
