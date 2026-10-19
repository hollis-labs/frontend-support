/**
 * The binding row — what draws a wire kind, and how the payload reaches it.
 *
 * ============================================================================
 * THE ONE RULE, MADE STRUCTURAL. READ THIS BEFORE ADDING A FIELD.
 * ============================================================================
 *
 * A binding names a COMPONENT IDENTITY, never an appearance value. If a binding
 * ever grows a colour, a size or a class name, that is the failure mode the whole
 * Portfolio UI vNext epic exists to prevent — appearance would have a second
 * authority, one layer up from where it was solved last time.
 *
 * The defence is not a lint rule. It is that THERE IS NOWHERE TO PUT ONE:
 *
 *   - every type below is CLOSED — no index signature, anywhere;
 *   - there is no `options`, `props`, `meta`, `extra` or `config` record;
 *   - `payload` is a closed discriminated union, not a bag;
 *   - every remaining string is an IDENTITY (a wire kind, a renderer id, a module
 *     specifier) or a host-authored human sentence, and none of them is read by
 *     anything that draws.
 *
 * THE ABSENCE IS THE FEATURE. The failure mode this comment exists to prevent is a
 * later session helpfully adding an extensibility escape hatch — one `Record<string,
 * unknown>` for "renderer options" — and not seeing what it cost. That one field
 * re-opens appearance to the design layer, and it will not look like a design
 * decision when it lands; it will look like a convenience. If you need to pass a
 * renderer something, pass it through the PAYLOAD, which is the envelope's data and
 * belongs to the wire. If it is not in the envelope, the host knows it, and the host
 * is rendering.
 *
 * ============================================================================
 * THE TWO ROW TYPES, AND WHY THERE ARE TWO
 * ============================================================================
 *
 * `BindingRequest` is what a kit, a plugin or a host's own generator DECLARES.
 * `Binding` is what a host's composition GRANTS. They are different types, and the
 * difference is not decoration: the host-only fields are ABSENT from the request,
 * not optional on it.
 *
 * That is settled answer #3 built rather than promised. A kit may ship default
 * binding rows — it is what makes kit-chat adoptable rather than a component
 * grab-bag — but a kit's rows must be inert, and "inert" has to survive somebody
 * deciding otherwise. A `BindingRequest` cannot be handed to `resolve`, because
 * `resolve` takes a `BindingTable`, and the only way to get one is to run a host's
 * own decision policy over requests. There is no global registry to install into and
 * no `register()` to call, so a kit has nowhere to put a row even if it wants to.
 *
 * A kit's rows are therefore a REQUEST, which is the same shape as "a plugin
 * declares, the host grants" one layer up. That symmetry is the sign the split is
 * the right one rather than a bolt-on: the mechanism that keeps a plugin from
 * asserting its own privilege is the mechanism that keeps a kit from asserting a
 * wire binding.
 */
import type { HostComposed } from './internal/brand.ts'
import type { RendererClass, TrustClass, Isolation } from './trust.ts'

/**
 * How the envelope's payload reaches the component.
 *
 * THIS IS THE ONE SUBSTANTIVE ADDITION to Tangent's shape, and it exists because of
 * a row that already shipped. go-envelopes' deleted `ENVELOPE_IMPORT_METADATA`
 * carried three fields, not one: `component`, `export` and `props` — and `props`,
 * naming WHICH PROP the host feeds the payload to, was the one encoding real
 * renderer behaviour. Tangent's `entry` says which component and nothing about how
 * the payload gets there, so a binding that carried only `entry` would lose the part
 * that does work (CW-20260910-0113 finding #1).
 *
 * The closed union is what makes `Record<kind, string>` insufficient and this
 * sufficient. See `test/round-trip.test.ts` for the pair that forces it.
 */
export type PayloadBinding =
  /** `envelope.data` becomes the component's `data` prop. The common case. */
  | { readonly from: 'data' }
  /**
   * `envelope[field]` becomes the component's `as` prop.
   *
   * The case `props` encoded. Two fields rather than one because the envelope's
   * field name and the component's prop name are owned by different layers and are
   * not required to agree.
   */
  | { readonly from: 'field'; readonly field: string; readonly as: string }
  /**
   * The whole envelope goes to the component.
   *
   * The escape hatch that keeps the other two honest: a renderer needing
   * `presentation` or `trace` alongside its data should not push the host into
   * re-threading them, and without this someone would add a field bag to do it.
   */
  | { readonly from: 'whole' }

/**
 * The renderer to fall back to when this one cannot draw.
 *
 * A DISCRIMINATED UNION RATHER THAN `{ rendererId, preservesMeaning: boolean }`,
 * and the difference is a real bug class. Tangent's resolver gates the fallback on
 * `preservesMeaning` — `safeFallback()` returns empty when it is false — because
 * degrading a structured decision into something that cannot express it is worse
 * than refusing outright (ADR 0003 §8 C5). With a boolean beside the id, reading the
 * id without checking the boolean typechecks, and the result is a card that looks
 * like it rendered and has quietly dropped the decision the user was asked to make.
 * That is the silently-dropped-envelope failure wearing a success code.
 *
 * Here the id only exists on the variant where offering it is correct. You cannot
 * read it without having matched on `safe`.
 */
export type FallbackBinding =
  /** No fallback was declared. */
  | { readonly kind: 'none' }
  /**
   * A fallback was declared and it preserves the interaction's meaning. Offer it.
   */
  | { readonly kind: 'safe'; readonly rendererId: string; readonly degradation: string }
  /**
   * A fallback was declared and it does NOT preserve meaning. Recorded so an
   * operator can see that one exists and why it is not offered — never returned by
   * `resolve`, which is the whole point of distinguishing it from `none`.
   */
  | { readonly kind: 'unsafe'; readonly rendererId: string; readonly degradation: string }

/**
 * Whether a host will serve a row it has composed.
 *
 * `unclassified` is deliberately NOT here: it is the absence of a row, not a state a
 * row can be in, and it belongs to `resolve`. Tangent's own resolver draws the same
 * line, for the reason its comment gives — "we have no idea what this is" and "we
 * know what it is and will not serve it" are different answers and only the second
 * is actionable by an operator.
 */
export type BindingState =
  | 'available'
  /** Composed, classified, and this build will not serve it. */
  | 'unavailable'
  /** A trust claim the host refused. Never downgraded — see `trust.ts` rule 3. */
  | 'quarantined'
  /**
   * More than one row in the same tier declared this kind, and composition will not
   * pick one.
   *
   * A host row beating a kit default is composition and is not ambiguous — that is
   * settled answer #5, and the two tiers are separate arguments to
   * `defineBindingTable` precisely so precedence is never a sort order someone can
   * get wrong. This state is the case with no answer: two kits claiming one kind, or
   * a host's generator emitting a kind twice. Silently taking the first would be a
   * binding chosen by array order, which is the drift this package exists to remove.
   */
  | 'ambiguous'

/**
 * What a kit, a plugin or a generator DECLARES about a kind it implements.
 *
 * Freely constructible, and inert by construction: nothing in this package consumes
 * a request except `defineBindingTable`, which is a host's own call.
 *
 * WHAT IS ABSENT, AND WHY EACH ONE IS ABSENT RATHER THAN OPTIONAL:
 *   - `trustClass`   — the host GRANTS trust. A declaration would be a thing
 *                      asserting its own privilege.
 *   - `isolation`    — the host DERIVES it from the grant (`isolationFor`).
 *   - `state`        — whether a build serves a kind is a fact about that build.
 *   - `contractDigest` — the host stamps the catalog it generated against.
 *   - `inlinePayloadLimitBytes` — host policy, and the class of fact this split
 *                      exists to keep out of a kit's hands. It lives in the host's
 *                      `ResolverConfig`; the optional per-row override on `Binding`
 *                      is settable only by a host's own policy.
 *
 * An optional field would let a kit fill one in and be silently ignored, which is
 * worse than either honest outcome. Absent means a kit that tries gets a compile
 * error naming the field it may not have.
 *
 * @typeParam K - the host's generated wire-kind union. Defaults to `string` so a
 * host with no generated union still gets every other guarantee. This package takes
 * NO dependency on go-envelopes — it ships no npm package and generates TypeScript
 * into each consumer, and a binding is host-local anyway, which is the same argument
 * that kept the table out of here.
 */
export interface BindingRequest<K extends string = string> {
  /** The wire name this renderer serves. */
  readonly kind: K
  /** The kind's schema version this row was written against. */
  readonly version: string
  /**
   * Stable renderer identity, DISTINCT FROM `kind` so one renderer can serve
   * several — Tangent's own comment, and the reason `Record<kind, string>` is not
   * the shape. See `test/round-trip.test.ts`.
   */
  readonly rendererId: string
  readonly rendererClass: RendererClass
  /**
   * Module specifier and exported symbol in ONE field: `"module/path#Symbol"`.
   *
   * Merged deliberately. go-envelopes carried `component` and `export` separately
   * and needed `dependentRequired` in its metaschema to stop them drifting apart;
   * one string makes the drift unrepresentable instead of detected.
   */
  readonly entry: string
  /** How the payload reaches the component. */
  readonly payload: PayloadBinding
  /** The privilege this row ASKS FOR. The host decides what it gets. */
  readonly requestedTrust: TrustClass
  readonly fallback: FallbackBinding
}

/**
 * A row a host has composed: trust granted, isolation derived, state decided.
 *
 * Only `defineBindingTable` produces one — see `internal/brand.ts` for why that is
 * enforced in the type system rather than asked for in a comment.
 */
export interface Binding<K extends string = string> extends HostComposed {
  readonly kind: K
  readonly version: string
  readonly rendererId: string
  readonly rendererClass: RendererClass
  readonly entry: string
  readonly payload: PayloadBinding
  /** GRANTED by the host, not requested by the row. */
  readonly trustClass: TrustClass
  /** DERIVED from the grant. Never declared. */
  readonly isolation: Isolation
  /**
   * A payload ceiling for THIS row only, present when the host's policy set one.
   *
   * THE CEILING IS NORMALLY RESOLVER CONFIG, NOT A ROW FIELD. Decided by Chrispian,
   * 2026-09-11. Tangent carries it on every row and all 19 carry the identical
   * 262144 — a value present on 100% of rows carries no per-row information, so it
   * is host policy denormalised into a table. Put against the two fields it sits
   * beside: trust is genuinely per-row because a binding REQUESTS it, and isolation
   * is deliberately kept off the row because the host DERIVES it. A payload ceiling
   * behaves like isolation, not like trust. So the host states it once in
   * `ResolverConfig` and no row carries the constant.
   *
   * THE FIELD IS NOT GONE, AND READING ITS ABSENCE AS "THE SECURITY FIELD WAS
   * REMOVED" IS THE WRONG READING — somebody will, so it is written here. The
   * ceiling exists from day one and applies to every resolution; nobody faces a
   * migration the first time they need it, which was the whole reason settled
   * answer #2 kept trust and isolation in the shape. What changed is that it is
   * supplied ONCE by the host instead of repeated identically per row.
   *
   * This optional field is the override, for a host that genuinely varies the
   * ceiling by kind. It is absent by default and only a host's own `HostPolicy` can
   * set it — `BindingRequest` has no such field, so a kit cannot express one.
   *
   * DO NOT READ THIS FIELD DIRECTLY to find the ceiling that applies. It is the
   * override, not the answer; `resolve` returns the effective value on `Drawable`,
   * which is the same reason `FallbackBinding` puts its id on the variant where
   * reading it is correct.
   */
  readonly inlinePayloadLimitBytes?: number
  readonly fallback: FallbackBinding
  readonly state: BindingState
  /**
   * Why this row is not `available`, as a sentence for an operator. Empty when it
   * is. Composition writes it; nothing parses it.
   */
  readonly stateReason: string
  /** The catalog this row was composed against, for self-identification. */
  readonly contractDigest: string
}
