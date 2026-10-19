/**
 * Trust, and the things a host derives from it.
 *
 * This is Tangent's model, generalised. Its shape and every rule in it come from
 * `apps/tangent/ui/src/generated/renderer-bindings.ts` and ADR 0003 §2.3, which is
 * the only place in the portfolio where a renderer trust model has survived contact
 * with a governed host. Read that file before changing anything here.
 *
 * THREE RULES, AND THEY ARE THE WHOLE MODEL:
 *
 *   1. Trust is REQUESTED by the thing being bound and GRANTED by the host. A
 *      manifest never asserts its own privilege. `BindingRequest.requestedTrust` is
 *      a request; `Binding.trustClass` is a grant; they are different fields on
 *      different types for that reason.
 *
 *   2. Isolation is DERIVED by the host, never declared. A declaration states
 *      intent; the host computes the consequence. Hence `isolationFor` below and
 *      no `isolation` field on the request.
 *
 *   3. A failed trust claim is QUARANTINED, never silently downgraded. Running a
 *      renderer at less privilege than it asked for looks like success and is not:
 *      the thing that asked for more had a reason, and the operator never finds out
 *      it did not get it.
 *
 * SIX OF THE SEVEN PORTFOLIO APPS NEED NONE OF THIS TODAY, and that was decided
 * with open eyes. Chrispian, 2026-09-10: adding a trust dimension later means a v2
 * migration of every binding table in the portfolio, at the exact moment someone is
 * first doing something security-sensitive. A simple host emits a constant — see
 * `constantTrust` in `table.ts`, which makes that one line.
 */

/**
 * What kind of thing a renderer is, which decides how it can be contained.
 *
 * `react-component` is one variant of four on purpose: a declarative or sandboxed
 * renderer needs no new shape, and the headless-library question (CW-20260910-0140)
 * lives entirely inside whatever the `entry` points at.
 */
export type RendererClass =
  | 'react-component'
  | 'declarative'
  | 'sandboxed-frame'
  | 'external-surface'

/**
 * The privilege level a binding asks for, and that a host grants or refuses.
 *
 * A closed union rather than a string, which is what makes "this build does not
 * implement that trust class" unrepresentable rather than a runtime code. Tangent
 * needs that fourth refusal code because it reads a generated string table; here
 * the compiler has already answered it.
 */
export type TrustClass =
  | 'core-trusted'
  | 'portfolio-trusted'
  | 'declarative'
  | 'sandboxed-code'
  | 'external-surface'

/** Where a granted trust class runs a renderer. Derived by the host, never declared. */
export type Isolation =
  | 'main-origin'
  | 'host-primitive'
  | 'sandboxed-frame'
  | 'external-surface'

/**
 * What one trust class means, in the terms a host needs to act on it.
 *
 * DELIBERATELY NOT CARRIED FROM TANGENT: its `capabilities` list
 * (`file.read_scoped`, `process.exec`, …). That vocabulary is Tangent's host policy,
 * generated from its own `internal/definition/trust.go`, and a shared contract
 * package asserting a capability vocabulary for seven apps would be this epic's own
 * failure mode one layer over — the same mistake as `component:` in go-envelopes,
 * with capabilities instead of appearance. A host that needs capabilities keeps them
 * in its own policy and keys them off `trustClass`.
 *
 * What IS carried is the part that is structural rather than policy: where the class
 * runs, whether publisher code executes at all, whether it reaches the host's own
 * authority, and which renderer classes it can coherently serve.
 */
export interface TrustProfile {
  readonly trustClass: TrustClass
  readonly isolation: Isolation
  /** False for the classes where no publisher-authored code executes at all. */
  readonly executesPublisherCode: boolean
  /** Whether this isolation can reach the host's own origin, storage and session. */
  readonly ambientHostAuthority: boolean
  /**
   * The renderer classes this trust class can coherently serve.
   *
   * Granting `declarative` trust to a `sandboxed-frame` renderer is not a policy
   * choice a host is entitled to make — it is a category error, and composition
   * quarantines it. See `defineBindingTable`.
   */
  readonly rendererClasses: readonly RendererClass[]
}

/**
 * Every trust class, with its profile.
 *
 * The mapped key type is doing real work: adding a member to `TrustClass` without a
 * profile here is a compile error, so the union and this table cannot drift apart.
 * That is the same failure Tangent contains with a second drift suite, made
 * impossible instead of tested for.
 */
export const TRUST_PROFILES: { readonly [C in TrustClass]: TrustProfile } = {
  'core-trusted': {
    trustClass: 'core-trusted',
    isolation: 'main-origin',
    executesPublisherCode: true,
    ambientHostAuthority: true,
    rendererClasses: ['react-component', 'declarative'],
  },
  'portfolio-trusted': {
    trustClass: 'portfolio-trusted',
    isolation: 'main-origin',
    executesPublisherCode: true,
    ambientHostAuthority: true,
    rendererClasses: ['react-component', 'declarative'],
  },
  declarative: {
    trustClass: 'declarative',
    isolation: 'host-primitive',
    executesPublisherCode: false,
    ambientHostAuthority: false,
    rendererClasses: ['declarative'],
  },
  'sandboxed-code': {
    trustClass: 'sandboxed-code',
    isolation: 'sandboxed-frame',
    executesPublisherCode: true,
    ambientHostAuthority: false,
    rendererClasses: ['sandboxed-frame'],
  },
  'external-surface': {
    trustClass: 'external-surface',
    isolation: 'external-surface',
    executesPublisherCode: false,
    ambientHostAuthority: false,
    rendererClasses: ['external-surface'],
  },
}

/** The profile for a trust class. Total, because `TrustClass` is closed. */
export function trustProfileFor(trustClass: TrustClass): TrustProfile {
  return TRUST_PROFILES[trustClass]
}

/**
 * Where a granted trust class runs a renderer.
 *
 * Exists as a function rather than a field on the request so that rule 2 above is
 * enforced by there being nowhere to declare it, not by a reviewer noticing.
 */
export function isolationFor(trustClass: TrustClass): Isolation {
  return TRUST_PROFILES[trustClass].isolation
}

/**
 * Whether a trust class can coherently serve a renderer class.
 *
 * Used by composition to quarantine an incoherent grant. Exported because a host
 * writing its own policy is better off refusing up front, with its own message,
 * than discovering the refusal in the composed table.
 */
export function trustClassPermits(trustClass: TrustClass, rendererClass: RendererClass): boolean {
  return TRUST_PROFILES[trustClass].rendererClasses.includes(rendererClass)
}
