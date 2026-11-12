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
 *      a request; `Binding.isolation` is a grant; they are different fields on
 *      different types for that reason.
 *
 *   2. THE VOCABULARY IS ISOLATION AND NOTHING ELSE (Tangent ADR 0009). There is
 *      no trust class sitting above it: a request asks for an isolation and a host
 *      grants one. Where a renderer runs IS the privilege it holds, so a second name
 *      for the same fact was a place for the two to disagree.
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
 * Where a renderer runs, which is the whole of the privilege it holds (ADR 0009).
 *
 * A closed union rather than a string, which is what makes "this build does not
 * implement that isolation" unrepresentable rather than a runtime code.
 */
export type Isolation =
  | 'main-origin'
  | 'host-primitive'
  | 'sandboxed-frame'
  | 'external-surface'

/** Where a content item came from, which decides what authority it may be drawn with. */
export type Origin = 'host' | 'agent'

/**
 * What one isolation means, in the terms a host needs to act on it.
 *
 * DELIBERATELY NOT CARRIED FROM TANGENT: its `capabilities` list
 * (`file.read_scoped`, `process.exec`, …). That vocabulary is Tangent's host policy,
 * and a shared contract package asserting a capability vocabulary for seven apps
 * would be this epic's own failure mode one layer over. A host that needs
 * capabilities keeps them in its own policy and keys them off `isolation`.
 *
 * What IS carried is the part that is structural rather than policy: whether
 * publisher code executes at all, whether it reaches the host's own authority, and
 * which renderer classes it can coherently serve.
 */
export interface TrustProfile {
  readonly isolation: Isolation
  /** False for the isolations where no publisher-authored code executes at all. */
  readonly executesPublisherCode: boolean
  /**
   * Whether this isolation can reach the host's own origin, storage and session.
   * Agent-origin content is barred from any isolation where this is true.
   */
  readonly ambientHostAuthority: boolean
  /**
   * The renderer classes this isolation can coherently serve.
   *
   * Granting `host-primitive` to a `sandboxed-frame` renderer is not a policy choice
   * a host is entitled to make — it is a category error, and composition quarantines
   * it. See `defineBindingTable`.
   */
  readonly rendererClasses: readonly RendererClass[]
}

/**
 * Every isolation, with its profile.
 *
 * The mapped key type is doing real work: adding a member to `Isolation` without a
 * profile here is a compile error, so the union and this table cannot drift apart.
 */
export const TRUST_PROFILES: { readonly [I in Isolation]: TrustProfile } = {
  'main-origin': {
    isolation: 'main-origin',
    executesPublisherCode: true,
    ambientHostAuthority: true,
    rendererClasses: ['react-component', 'declarative'],
  },
  'host-primitive': {
    isolation: 'host-primitive',
    executesPublisherCode: false,
    ambientHostAuthority: false,
    rendererClasses: ['declarative'],
  },
  'sandboxed-frame': {
    isolation: 'sandboxed-frame',
    executesPublisherCode: true,
    ambientHostAuthority: false,
    rendererClasses: ['sandboxed-frame'],
  },
  'external-surface': {
    isolation: 'external-surface',
    executesPublisherCode: false,
    ambientHostAuthority: false,
    rendererClasses: ['external-surface'],
  },
}

/** The profile for an isolation. Total, because `Isolation` is closed. */
export function trustProfileFor(isolation: Isolation): TrustProfile {
  return TRUST_PROFILES[isolation]
}

/**
 * Whether an isolation can coherently serve a renderer class.
 *
 * Used by composition to quarantine an incoherent grant. Exported because a host
 * writing its own policy is better off refusing up front, with its own message,
 * than discovering the refusal in the composed table.
 */
export function isolationPermits(isolation: Isolation, rendererClass: RendererClass): boolean {
  return TRUST_PROFILES[isolation].rendererClasses.includes(rendererClass)
}
