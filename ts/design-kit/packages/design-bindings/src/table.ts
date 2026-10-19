/**
 * Composition — the one place a resolvable binding comes from.
 *
 * THE TABLE IS HOST-LOCAL BY CONSTRUCTION, AND THAT IS THE WHOLE ARCHITECTURE.
 * This package ships the shape and the resolver. It does NOT ship a table, and it
 * never will: a binding names components in one host's module tree, so a shared
 * table would be this epic's own failure mode — precisely why `component:` was wrong
 * in go-envelopes.
 *
 * That single fact is what lets the design refuse override while still allowing
 * customisation, which is settled answer #5. A plugin DECLARES and a host GRANTS, so
 * a declaration is a request. A host composing its own table is not overriding,
 * because there is no shared table to override. Both hosts in the portfolio already
 * refuse plugin presentation-override of core types independently — Nanite in
 * `cardrules.go` ("card_type %q is owned by a built-in rule"), Tangent in ADR 0007 —
 * and this design works within that convergence rather than around it.
 *
 * THERE IS NO REGISTRY HERE. No module-level mutable state, no `register()`, nothing
 * to install into. A table is a value a host builds and passes to `resolve`. That is
 * not an aesthetic choice: a hand-populated registry is a second source of truth, and
 * it is why Tangent needs two drift suites today to keep its table and its boot path
 * from diverging. Generated data resolved by shared code has one place a row is
 * declared.
 */
import type { HostComposed } from './internal/brand.ts'
import type { Binding, BindingRequest, BindingState } from './binding.ts'
import { isolationFor, trustClassPermits, type TrustClass } from './trust.ts'

/**
 * What a host decides about one declared row.
 *
 * Three outcomes, one per non-`available` state, because a host that can only say
 * yes or no ends up encoding "I will not serve this" as a missing row — and a
 * missing row is `unclassified`, which tells an operator to go write a manifest that
 * already exists.
 */
export type HostDecision =
  /**
   * Grant this trust class. Isolation is derived from it; the row does not choose.
   *
   * `inlinePayloadLimitBytes` is the per-row override, and this is the ONLY place one
   * can be set. It is optional and absent by default: the ceiling normally comes from
   * `ResolverConfig`, stated once, because a value identical on every row is host
   * policy denormalised rather than a per-row fact. Set it only for a kind that
   * genuinely differs.
   *
   * That it lives on the host's DECISION rather than on the declared row is the point.
   * A payload ceiling is a fact only a host can know, so putting the override here
   * keeps it out of `BindingRequest` — a kit cannot express one, for the same reason
   * it cannot declare its own trust.
   */
  | { readonly admit: TrustClass; readonly inlinePayloadLimitBytes?: number }
  /**
   * Refuse the trust claim. NEVER a downgrade — see `trust.ts` rule 3. The reason is
   * shown to an operator, so write it as a sentence.
   */
  | { readonly quarantine: string }
  /** Classified, but this build will not serve it. */
  | { readonly unavailable: string }

/**
 * A host's policy over declared rows: the one place host authority is exercised.
 *
 * A function rather than a table because the interesting hosts decide from evidence
 * the row does not carry — who published a plugin, what a review said, which build
 * this is.
 */
export type HostPolicy<K extends string = string> = (request: BindingRequest<K>) => HostDecision

/**
 * The policy for a host that has one answer for everything.
 *
 * Settled answer #2 kept trust and isolation in the shape knowing six of the seven
 * portfolio apps need neither today, on the grounds that adding the dimension later
 * is a v2 migration of every table in the portfolio at the exact moment someone is
 * first doing something security-sensitive. This is what makes carrying it actually
 * cheap rather than cheap in principle: a simple host writes
 * `trust: constantTrust('core-trusted')` and never thinks about it again.
 */
export function constantTrust<K extends string = string>(trustClass: TrustClass): HostPolicy<K> {
  return () => ({ admit: trustClass })
}

/**
 * Host policy that applies to every resolution rather than to one row.
 *
 * THIS IS WHERE A VALUE GOES WHEN IT IS THE SAME FOR EVERY ROW. The test that put
 * `inlinePayloadLimitBytes` here is worth keeping for whatever lands next: all 19 of
 * Tangent's rows carry the identical ceiling, so it carries no per-row information
 * and belongs to the host, not to the table. Trust is per-row because a binding
 * requests it; isolation is off the row because the host derives it; a ceiling
 * behaves like isolation.
 *
 * Before adding a field to `Binding`, ask whether every row would carry the same
 * value. If so it belongs here.
 */
export interface ResolverConfig {
  /**
   * The browser-side ceiling on inline payload bytes — the bound on untrusted
   * display content.
   *
   * Applies to every resolution. A host that genuinely varies it by kind returns an
   * override from its `HostPolicy`; `resolve` reports the effective value, so a
   * caller never has to know which of the two applied.
   */
  readonly inlinePayloadLimitBytes: number
}

/** What a host must supply to compose a table. */
export interface BindingTableSpec<K extends string = string> {
  /**
   * The catalog these rows were generated against, stamped onto every row.
   *
   * Self-identification, the same job go-envelopes' catalog digest does: a table can
   * say which contract it is an answer to, so a host can notice it is answering an
   * older one.
   */
  readonly contractDigest: string
  /** Host policy that applies to every resolution. See `ResolverConfig`. */
  readonly resolverConfig: ResolverConfig
  /** This host's authority, exercised over every row. */
  readonly trust: HostPolicy<K>
  /**
   * Rows offered by kits, as INERT DEFAULTS. Lowest precedence.
   *
   * This is settled answer #3's whole surface area. A kit ships `BindingRequest`s
   * for the kinds it implements, and they do nothing until a host passes them here
   * and grants them — which is why they are `BindingRequest`s and not `Binding`s,
   * and why they arrive as an argument rather than through a registry a kit could
   * write to on its own.
   */
  readonly defaults?: readonly BindingRequest<K>[]
  /**
   * The rows this host declares itself, typically generated from its own manifests.
   * Beats a default for the same kind.
   *
   * A SEPARATE ARGUMENT RATHER THAN A SORT ORDER, deliberately. Precedence between
   * "what a kit offered" and "what this host says" is a rule, and a rule expressed
   * as array position is a rule someone gets wrong on a Friday. Two slots make it
   * unstateable wrongly.
   */
  readonly rows: readonly BindingRequest<K>[]
}

/**
 * A composed, host-local table. The only thing `resolve` accepts.
 *
 * Branded — see `internal/brand.ts`. A consumer cannot write this type down, so a
 * kit cannot export one, so the design layer cannot hand a host something that
 * already claims authority over wire kinds.
 */
export interface BindingTable<K extends string = string> extends HostComposed {
  readonly contractDigest: string
  /**
   * The host policy every resolution is answered against.
   *
   * Carried on the table so it is reachable for a MISS too — a fallback renderer
   * drawing untrusted content needs the same ceiling, and it has no row to read.
   */
  readonly resolverConfig: ResolverConfig
  /** Every composed row, including the ones that will not draw, in input order. */
  readonly rows: readonly Binding<K>[]
  /** Lookup index. Present so `resolve` is O(1) and hosts do not each build one. */
  readonly byKind: ReadonlyMap<K, Binding<K>>
}

/**
 * Compose a host's binding table.
 *
 * NEVER THROWS, and that is deliberate at composition as well as at resolution. A
 * bad row becomes a classified row with a reason, because a host whose boot fails on
 * one malformed generated row loses every other kind it could have drawn. A miss is
 * a classification everywhere in this package, not only in `resolve`.
 */
export function defineBindingTable<K extends string = string>(
  spec: BindingTableSpec<K>,
): BindingTable<K> {
  const declared = [
    ...(spec.defaults ?? []).map((request) => ({ request, fromHost: false })),
    ...spec.rows.map((request) => ({ request, fromHost: true })),
  ]

  // A host row beats a kit default for the same kind — composition, not override.
  // Two rows in the SAME tier have no answer, and taking the first would be a
  // binding chosen by array order, so every row of that kind in that tier is refused.
  //
  // PER TIER, AND THE FIRST VERSION OF THIS WAS NOT. A single shared duplicate set
  // let two kits claiming one kind poison the HOST's row for that kind — the host
  // declaring its own row is exactly how a host settles a collision between kits, so
  // that made the remedy unreachable. A kit-tier collision is moot the moment the
  // host declares the kind itself, because those defaults are not composed at all.
  const seen = { host: new Set<K>(), kit: new Set<K>() }
  const duplicated = { host: new Set<K>(), kit: new Set<K>() }
  for (const { request, fromHost } of declared) {
    const tier = fromHost ? 'host' : 'kit'
    if (seen[tier].has(request.kind)) duplicated[tier].add(request.kind)
    seen[tier].add(request.kind)
  }
  const hostKinds = seen.host

  const rows: Binding<K>[] = []
  for (const { request, fromHost } of declared) {
    // A kit default for a kind this host declares itself is not composed at all. It
    // is not a conflict and not an error; it is the default having done its job.
    if (!fromHost && hostKinds.has(request.kind)) continue

    if (duplicated[fromHost ? 'host' : 'kit'].has(request.kind)) {
      rows.push(
        compose(request, spec, 'ambiguous', 'core-trusted',
          `more than one ${fromHost ? 'host row' : 'kit default'} declares "${request.kind}"; ` +
          'declare a single host row for it to settle which one draws'),
      )
      continue
    }

    const decision = spec.trust(request)

    if ('quarantine' in decision) {
      rows.push(compose(request, spec, 'quarantined', request.requestedTrust, decision.quarantine))
      continue
    }
    if ('unavailable' in decision) {
      rows.push(compose(request, spec, 'unavailable', request.requestedTrust, decision.unavailable))
      continue
    }

    // An incoherent grant is a category error rather than a policy choice a host is
    // entitled to make: `declarative` trust cannot contain a `sandboxed-frame`
    // renderer, whatever anyone decided. Refused as a QUARANTINE and not as a
    // downgrade to a class that does fit, because a renderer running at less
    // privilege than it needs looks like success and is not.
    if (!trustClassPermits(decision.admit, request.rendererClass)) {
      rows.push(
        compose(request, spec, 'quarantined', decision.admit,
          `trust class "${decision.admit}" cannot serve a "${request.rendererClass}" renderer; ` +
          'the grant was refused rather than downgraded'),
      )
      continue
    }

    rows.push(
      compose(request, spec, 'available', decision.admit, '', decision.inlinePayloadLimitBytes),
    )
  }

  const byKind = new Map<K, Binding<K>>()
  for (const row of rows) byKind.set(row.kind, row)

  // THE MINT. The `as unknown as` is the loud form on purpose — the brand exists so
  // that producing a resolvable table is an act a reviewer can see, and this is the
  // one place in the package entitled to perform it. See `internal/brand.ts`.
  return {
    contractDigest: spec.contractDigest,
    resolverConfig: spec.resolverConfig,
    rows,
    byKind,
  } as unknown as BindingTable<K>
}

/** Build one composed row. The single place a `Binding` is minted. */
function compose<K extends string>(
  request: BindingRequest<K>,
  spec: BindingTableSpec<K>,
  state: BindingState,
  trustClass: TrustClass,
  stateReason: string,
  /**
   * The per-row ceiling override, or undefined for the overwhelmingly common case of
   * "the host's configured ceiling applies". Only ever set from a host's own
   * `HostPolicy`; a refused row never carries one, because a row that will not draw
   * has no payload to bound.
   */
  inlinePayloadLimitBytes?: number,
): Binding<K> {
  return {
    kind: request.kind,
    version: request.version,
    rendererId: request.rendererId,
    rendererClass: request.rendererClass,
    entry: request.entry,
    payload: request.payload,
    trustClass,
    isolation: isolationFor(trustClass),
    // Spread so the key is ABSENT rather than present-and-undefined when there is no
    // override. `'inlinePayloadLimitBytes' in binding` then means what it says, and a
    // serialised table does not carry a column of nulls for a field nobody set.
    ...(inlinePayloadLimitBytes === undefined ? {} : { inlinePayloadLimitBytes }),
    fallback: request.fallback,
    state,
    stateReason,
    contractDigest: spec.contractDigest,
    // Same mint, same reason. Nothing outside this function produces a `Binding`.
  } as unknown as Binding<K>
}
