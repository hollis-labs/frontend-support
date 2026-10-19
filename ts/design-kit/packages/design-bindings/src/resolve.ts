/**
 * Resolution — "can I draw this one, right now?"
 *
 * A MISS IS A CLASSIFICATION, NEVER AN EXCEPTION. This function does not throw, has
 * no failure path, and always returns something a host can draw. That is settled
 * answer #4, and the reason it is stated so strongly is the failure it prevents: a
 * silently dropped envelope is how an agent's message disappears with no trace, and
 * nobody finds out — not the user, who sees a gap, and not the operator, who sees
 * nothing at all.
 *
 * A WIRE KIND WITH NO BINDING IS THE NORMAL CASE. It is what a plugin looks like
 * before a host has decided to draw it. Treating it as an error would make the
 * ordinary state of an extensible system read as a fault.
 *
 * THIS PAIRS WITH go-envelopes' `TypeSupport` (CW-20260910-0122) and the two answer
 * different questions. `CheckSupport` asks, at build time, "do I have a policy for
 * every type?" — it prevents surprise. `resolve` asks, at runtime, "can I draw this
 * one?" — it handles surprise. A host wants both; neither replaces the other.
 */
import type { Binding } from './binding.ts'
import type { BindingTable } from './table.ts'

/**
 * Why a kind will not draw.
 *
 * FOUR CODES, AND THEY ARE FOUR BECAUSE THEY ARE FOUR DIFFERENT OPERATOR ACTIONS.
 * Tangent's resolver makes the same argument for keeping its own codes apart: "we
 * have no idea what this is" and "we know what it is and will not serve it" are
 * different answers, and only the second one is actionable. The test for adding a
 * fifth is not whether it is a distinguishable internal state — it is whether
 * somebody reading it does something different.
 *
 * A code the proposal listed and this does not: `trust_unimplemented`. Tangent needs
 * it because it reads trust classes as strings from a generated table. Here
 * `TrustClass` is a closed union and `TRUST_PROFILES` is a mapped type over it, so
 * an unimplemented class is a compile error rather than a runtime code. It was
 * eliminated by the shape, not dropped.
 */
export type MissCode =
  /** Nothing in this build classifies the kind. Ship a row, or expect the kind. */
  | 'unclassified'
  /** Classified, and this build will not serve it. Ask for a different workflow. */
  | 'unavailable'
  /** A trust claim the host refused. Review the claim; it was not downgraded. */
  | 'quarantined'
  /** Two rows declared it. Declare one host row to settle which draws. */
  | 'ambiguous'

/** A kind this host will draw, with the row that says how. */
export interface Drawable<K extends string = string> {
  readonly ok: true
  readonly binding: Binding<K>
  /**
   * The payload ceiling that applies to THIS resolution, already resolved.
   *
   * The host's configured ceiling, or this row's override if its policy set one.
   * Returned as a plain number so a caller never writes `binding.inlinePayloadLimitBytes
   * ?? config.inlinePayloadLimitBytes` and never gets `undefined` by forgetting to —
   * the same reason `FallbackBinding` puts its id on the variant where reading it is
   * correct. Resolving config against an override is the resolver's job, so it does it.
   */
  readonly inlinePayloadLimitBytes: number
}

/** A kind this host will not draw, and everything needed to say so usefully. */
export interface Miss {
  readonly ok: false
  readonly code: MissCode
  /** The kind asked about, echoed so a caller handling several does not track it. */
  readonly kind: string
  /** A sentence for an operator. Composed by the host's policy; nothing parses it. */
  readonly reason: string
  /**
   * The renderer to draw instead, or `null`.
   *
   * ONLY EVER A FALLBACK THAT PRESERVES MEANING. A declared fallback that does not
   * is recorded on the row and never offered here, because degrading a structured
   * decision into something that cannot express it is worse than refusing — it
   * returns a success the user acts on. `null` means draw the generic fallback: a
   * titled view of the payload, naming the kind, is sufficient and honest.
   */
  readonly fallbackRendererId: string | null
}

export type Resolution<K extends string = string> = Drawable<K> | Miss

/**
 * Classify one wire kind against a host's table.
 *
 * `kind` is `string` AND NOT `K` ON PURPOSE. The unknown kind is the case this
 * function exists for — a plugin's, or a newer server's — and a signature that only
 * accepted the host's own generated union could not be asked the question that
 * matters. The union constrains what a host DECLARES; it must not constrain what a
 * host can be ASKED.
 */
export function resolve<K extends string = string>(
  table: BindingTable<K>,
  kind: string,
): Resolution<K> {
  const binding = table.byKind.get(kind as K)

  if (!binding) {
    return {
      ok: false,
      code: 'unclassified',
      kind,
      reason: `nothing in this build classifies a renderer for "${kind}"`,
      fallbackRendererId: null,
    }
  }

  if (binding.state === 'available') {
    return {
      ok: true,
      binding,
      inlinePayloadLimitBytes:
        binding.inlinePayloadLimitBytes ?? table.resolverConfig.inlinePayloadLimitBytes,
    }
  }

  return {
    ok: false,
    code: binding.state,
    kind,
    reason: binding.stateReason,
    fallbackRendererId: safeFallbackOf(binding),
  }
}

/**
 * The fallback renderer for a row, or `null` when there is none to offer.
 *
 * Exported because a host drawing its own refusal UI needs the same answer, and two
 * implementations of "which fallback is safe" is exactly the drift this package
 * removes elsewhere.
 */
export function safeFallbackOf<K extends string>(binding: Binding<K>): string | null {
  return binding.fallback.kind === 'safe' ? binding.fallback.rendererId : null
}

/** A parsed `entry`: the module to load and the symbol to take from it. */
export interface ParsedEntry {
  readonly module: string
  readonly symbol: string
}

/**
 * Split an `entry` into its module specifier and exported symbol.
 *
 * Returns `null` for a malformed entry rather than throwing, and composition does
 * NOT validate the format — deliberately. This package cannot load modules, so a
 * well-formed entry is no evidence the module exists and a check here would buy an
 * illusion of validation. The host's loader is the only thing that can actually
 * answer, so the question belongs there, with this to do the parsing so every host
 * does not.
 */
export function parseEntry(entry: string): ParsedEntry | null {
  const hash = entry.indexOf('#')
  if (hash <= 0 || hash === entry.length - 1) return null
  if (entry.indexOf('#', hash + 1) !== -1) return null
  return { module: entry.slice(0, hash), symbol: entry.slice(hash + 1) }
}
