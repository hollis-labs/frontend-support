/**
 * The lifecycle engine's vocabulary. Headless: no React, no DOM, no timers, no
 * transport, and NO WIRE KINDS — `kind` is an opaque string the host chose, and the
 * engine only compares it. Everything that varies by app is rule DATA.
 */

export type Surface = 'inline' | 'tray' | 'toast' | 'modal'

/** What the host knows about a card when it arrives. `payload` is opaque to the engine. */
export interface CardInput {
  readonly id: string
  readonly kind: string
  readonly source?: string
  /** What the card is about (an operation, a run). Used for dedupe, never interpreted. */
  readonly subject?: string
  readonly risk?: string
  /** The sender is waiting on the answer. Blocking cards may escalate to a modal. */
  readonly blocking?: boolean
  /** Server revision. A lower revision for a known id is ignored, never applied. */
  readonly revision?: number
  /** Absolute expiry from the server, ms since epoch. Wins over a rule `ttlMs`. */
  readonly expiresAt?: number
  readonly payload?: unknown
}

/** Equality, list membership, or a trailing-`*` prefix, per field. All given fields must match. */
export type MatchValue = string | readonly string[]
export interface RuleMatch {
  readonly kind?: MatchValue
  readonly source?: MatchValue
  readonly risk?: MatchValue
  readonly blocking?: boolean
}

export interface RuleAction {
  readonly id: string
  readonly label: string
  readonly tone?: 'danger' | 'neutral'
}

/**
 * A rule, as data. The first rule whose `match` fits wins; a card no rule matches is
 * not ingested (the host gets `null` and decides what to do — nothing is dropped
 * silently inside the engine).
 */
export interface CardRule {
  readonly id: string
  readonly match: RuleMatch
  readonly surface: Surface
  /** Card fields joined with `:` form the dedupe key. Absent fields join as empty. */
  readonly dedupeBy?: readonly ('kind' | 'source' | 'subject' | 'risk')[]
  /**
   * `dedupe-key`: a newer card with the same key supersedes the older one (the older
   * becomes `superseded`, linked to the newer). Without it a same-key card UPDATES the
   * existing one in place.
   */
  readonly supersedes?: 'dedupe-key'
  /** Lifetime from arrival, ms. Display only for answerable cards — see `expiry.ts`. */
  readonly ttlMs?: number
  /** Presence of actions is what makes a card answerable. */
  readonly actions?: readonly RuleAction[]
  /** A blocking card escalates to a modal when true. Default: stays on `surface`. */
  readonly escalateBlocking?: boolean
}

/** Server-recorded status. Opaque string, like `classifyPriorResponse` takes. */
export type CardStatus = string

export interface CardViewModel {
  readonly id: string
  readonly kind: string
  readonly input: CardInput
  readonly ruleId: string
  /** Where the card LIVES. Answerable cards always live somewhere durable (tray/inline/modal). */
  readonly home: Exclude<Surface, 'toast'>
  /** Every surface showing it. A toast here always links to `home`. */
  readonly surfaces: readonly Surface[]
  readonly answerable: boolean
  readonly actions: readonly RuleAction[]
  readonly status: CardStatus | null
  readonly supersededBy: string | null
  readonly dedupeKey: string | null
  /** Absolute ms since epoch, or null. Never turned into a state by the engine. */
  readonly expiresAt: number | null
  readonly editing: boolean
  /** A swap/update is waiting because the person is editing; show an "updated" affordance. */
  readonly updatedAvailable: boolean
  readonly toastDismissed: boolean
  /**
   * Highest revision accepted for this card from ANY entry point (ingest, a held arrival,
   * or server state). Anything at or below it is stale and rejected.
   */
  readonly revisionFloor: number | null
}

/** Work waiting because its target card is being edited, with the policy it matched. */
export interface HeldEntry {
  readonly card: CardInput
  /** `update`: same id. `supersede`/`dedupe`: a new id that matched a dedupe key. */
  readonly mode: 'update' | 'supersede' | 'dedupe'
}

export interface EngineSnapshot {
  /** Arrival order, stable: updates and supersession never reorder. */
  readonly order: readonly string[]
  readonly cards: Readonly<Record<string, CardViewModel>>
  /** Held replacements keyed by the id they will replace. */
  readonly held: Readonly<Record<string, HeldEntry>>
}

/** The host owns persistence. The default store is memory. */
export interface EngineStore {
  get(): EngineSnapshot
  set(next: EngineSnapshot): void
}

export interface EngineOptions {
  readonly rules: readonly CardRule[]
  /** The host's clock, ms since epoch. The engine never reads `Date`. */
  readonly now: () => number
  readonly store?: EngineStore
}
