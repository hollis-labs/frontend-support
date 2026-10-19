/**
 * How a card says what the person decided, and how it reads back what was decided
 * before.
 *
 * ============================================================================
 * THE ASYMMETRY IS THE DESIGN: EMIT CLOSED, READ OPEN.
 * ============================================================================
 *
 * These two directions get opposite treatment on purpose, because they face
 * different risks.
 *
 * EMITTING is a closed union, and `partial` is ABSENT from it — not deprecated, not
 * documented as unsafe, absent. A `partial` submission does not work: measured in
 * Nanite 2026-09-10, `store/envelope_instances.go:152` sets `responded_at` for EVERY
 * submission before the handler dispatches, so a partial claims the envelope and the
 * submission that would COMPLETE the interaction gets a 409. Partial is a state you
 * can enter and never leave. A comment warning about that is a comment someone reads
 * after writing the bug; a union that cannot express it is a compile error before.
 *
 * READING is an open `string`, and this is not laziness. The declared enum is four
 * canonical values plus the legacy British `cancelled`, and TWO MORE reach the
 * column in practice — `handling` from the claim and `failed` from a handler timeout.
 * A closed union here would be a lie that throws on real data, and the data is
 * already in production databases. So `classifyPriorResponse` is TOTAL over `string`
 * and every unrecognised value lands in a branch that renders honestly rather than
 * crashing a transcript.
 *
 * THIS PACKAGE DOES NOT DEFINE THE WIRE RESPONSE, and that boundary is deliberate.
 * The portfolio's ownership table gives wire identity to `go-envelopes`; the design
 * layer may never assert it. So a card never builds `{ v, kind, id, … }` — it reports
 * an OUTCOME and the host constructs and transports the response, exactly the seam
 * Nanite's `EnvelopeResponder` already proved. Reading a status the wire produced is
 * consuming the wire, not asserting it.
 *
 * WHY THERE IS NO `ResponseV1` TYPE HERE. There is no TypeScript expression of the
 * response protocol anywhere in the portfolio: `go-envelopes/codegen/typescript.go`
 * emits envelope data types and import metadata and nothing response-shaped, and
 * `ResponseStatus.IsTerminal()` is Go-only. Writing one here would make a FOURTH
 * definition of the same thing, which is the exact failure the protocol work was
 * done to stop. Whether go-envelopes should emit one is a real gap and someone
 * else's task.
 */

/* ────────────────────────────── EMIT ────────────────────────────── */

/** One answer to one question. Mirrors the wire's `answers[]` element. */
export interface CardAnswer {
  readonly questionId: string
  readonly value: unknown
  /** The person took a suggestion as offered rather than composing their own. */
  readonly acceptedSuggestion?: boolean
  readonly note?: string
}

/** One decision about one item. Mirrors the wire's `decisions[]` element. */
export interface CardDecision {
  readonly itemId: string
  /** Domain vocabulary — `approve`, `skip`, `retry`. The card does not interpret it. */
  readonly action: string
  readonly note?: string
}

/**
 * What a card reports when the person is done with it.
 *
 * THREE SEPARATED CHANNELS, kept from the wire's own shape because the separation is
 * the good part: free-form `data`, question/answer pairs, and per-item decisions are
 * genuinely different things, and collapsing them into one bag is what made the
 * previous generation of envelope payloads unreadable.
 *
 * `error` IS NOT HERE EITHER, and for a different reason than `partial`. The wire has
 * an `error` status, but it describes a HANDLER that failed — the server's account of
 * itself. A card is the person's side of the exchange, and the two things a person
 * can do are answer and decline.
 */
export type CardOutcome =
  | {
      readonly status: 'submitted'
      readonly data?: Readonly<Record<string, unknown>>
      readonly answers?: readonly CardAnswer[]
      readonly decisions?: readonly CardDecision[]
    }
  | { readonly status: 'canceled' }

/**
 * The seam. A host adds `v`, the envelope id and transport; the card supplies only
 * what happened.
 *
 * Returning a promise is optional and a card must not depend on it resolving — a
 * host that fires and forgets is a legitimate host. Cards drive their own busy state
 * from props, not from awaiting this.
 */
export type CardResponder = (outcome: CardOutcome) => void | Promise<void>

/* ────────────────────────────── READ ────────────────────────────── */

/**
 * What a card should draw, given whatever the wire recorded last.
 *
 * `open` COVERS BOTH "NOTHING YET" AND "A PARTIAL", which is the one place this
 * classification encodes protocol rather than reporting it — and it is the protocol's
 * own rule. `ResponseStatus.IsTerminal()` shipped in go-envelopes precisely so a
 * non-terminal status does not claim the envelope: a `partial` is replaced by the
 * next submission, so a card that finds one is still open for business. Deriving that
 * from the protocol beats each host reinventing it, which is what the function exists
 * for.
 */
export type PriorResponseState =
  | { readonly kind: 'open' }
  /** Claimed, handler still running. Controls should be disabled, not hidden. */
  | { readonly kind: 'pending' }
  | { readonly kind: 'submitted' }
  | { readonly kind: 'canceled' }
  /** The handler failed. Terminal on the wire; a host may still offer a retry. */
  | { readonly kind: 'failed'; readonly status: string }
  /**
   * A value this build does not know. NOT an error, and not silently treated as
   * open: a card that re-enables its controls against an unknown terminal state
   * invites a second submission that 409s. Draw it, say so, and stay locked.
   */
  | { readonly kind: 'unrecognized'; readonly status: string }

/**
 * Total over `string`. See the header for why the input is not a union.
 *
 * `cancelled` is the legacy British spelling still on the wire; go-envelopes keeps it
 * as a compatibility value and canonicalises it, so a card that only matched the
 * American spelling would show a cancelled envelope as open.
 */
export function classifyPriorResponse(status: string | null | undefined): PriorResponseState {
  if (status == null || status === '') return { kind: 'open' }

  switch (status) {
    case 'submitted':
      return { kind: 'submitted' }
    case 'canceled':
    case 'cancelled':
      return { kind: 'canceled' }
    case 'error':
    case 'failed':
      return { kind: 'failed', status }
    case 'handling':
      return { kind: 'pending' }
    case 'partial':
      return { kind: 'open' }
    default:
      return { kind: 'unrecognized', status }
  }
}

/**
 * Whether a card should still accept input.
 *
 * Expressed against the classification rather than against the raw string so there is
 * ONE place that knows which states are live. `unrecognized` is deliberately not
 * interactive — see the note on that variant.
 */
export function acceptsInput(state: PriorResponseState): boolean {
  return state.kind === 'open'
}
