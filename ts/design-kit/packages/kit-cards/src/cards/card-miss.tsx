import type { ReactNode } from 'react'
import { CircleHelp, EyeOff, ShieldAlert, Split } from 'lucide-react'
import type { IconComponent } from '@hollis-labs/design-components'
import type { MissCode } from '@hollis-labs/design-bindings'
import type { Tone } from '@hollis-labs/design-tokens'
import { Envelope, EnvelopeBody, EnvelopeHeader } from './envelope'

/**
 * What the transcript shows when a wire kind resolves to no renderer.
 *
 * ============================================================================
 * THIS IS THIS KIT'S ENTIRE CONTRIBUTION TO THE BINDING LAYER, AND THAT IS RIGHT
 * ============================================================================
 *
 * `@hollis-labs/design-bindings` says a miss is a CLASSIFICATION, never an exception:
 * `resolve` does not throw and always returns something drawable. So per-envelope
 * isolation is the default rather than something a card wraps, and the job left over
 * is a design job — drawing the four outcomes so a person can act on them. That is
 * why this file exists and why this kit ships no `BindingRequest` rows: a kit that
 * implements no wire kinds has no rows to offer, but it can still draw the gap.
 *
 * THE FOUR CODES ARE NOT COLLAPSED INTO "COULDN'T RENDER", which is the whole point
 * of there being four. They are three different operator actions plus a build
 * mistake, and a UI that says "couldn't render" has destroyed the only information
 * that distinguishes them. Tangent folds `quarantined` into `unavailable`; this does
 * not, because a refused trust claim is quarantined and never silently downgraded,
 * and collapsing it makes exactly that distinction invisible to the person who needs
 * it.
 *
 * A MISS IS NOT AN ERROR, AND THE TONES SAY SO. `unclassified` is the NORMAL case —
 * it is what a plugin looks like before a host has decided to draw it — so it renders
 * informational rather than red. Only `quarantined` is a security event.
 *
 * IT ALWAYS NAMES THE KIND. `fallbackRendererId: null` means "draw the generic view",
 * and the bindings package is explicit that a titled view of the payload naming the
 * kind is sufficient and honest. A silently dropped envelope is how an agent's
 * message vanishes without trace; an unstyled one that says what it was is not.
 */

export interface CardMissProps {
  /** Straight from `resolve`. Not narrowed, not remapped. */
  readonly code: MissCode
  /** The wire kind that missed. Shown, because an operator needs it to act. */
  readonly wireKind: string
  /** `resolve`'s own sentence. Shown verbatim — it is written for a human. */
  readonly reason?: ReactNode
  /**
   * The payload, when there is one worth showing. A host that considers the payload
   * sensitive passes nothing and loses only detail, not the record that it arrived.
   */
  readonly payload?: ReactNode
  readonly className?: string
}

interface MissPresentation {
  readonly icon: IconComponent
  readonly tone: Tone
  readonly label: string
  /** What the person reading the transcript should understand happened. */
  readonly headline: string
  /** What the operator can actually do. One sentence, concrete. */
  readonly action: string
}

/**
 * `satisfies Record<MissCode, …>` IS THE MECHANISM HERE. `design-bindings` adding a
 * fifth code becomes a compile error in this file rather than a card that renders
 * blank for the new case — which is the same guard `ChatItem`'s exhaustive switch
 * gives the stream, applied to a union this package does not own.
 */
const MISS_PRESENTATION = {
  unclassified: {
    icon: CircleHelp,
    tone: 'info',
    label: 'Not rendered',
    headline: 'Nothing in this build knows how to draw this.',
    action: 'Expected, if this came from a plugin this app has not adopted. Ship a binding row for it, or ignore it.',
  },
  unavailable: {
    icon: EyeOff,
    tone: 'warning',
    label: 'Unavailable',
    headline: 'This build recognises this kind and will not serve it.',
    action: 'Deliberate. Ask for a workflow this build supports.',
  },
  quarantined: {
    icon: ShieldAlert,
    tone: 'danger',
    label: 'Quarantined',
    headline: 'A trust claim was refused, so this was not rendered at all.',
    action: 'Review the claim. It was refused, NOT downgraded — nothing ran at lower privilege.',
  },
  ambiguous: {
    icon: Split,
    tone: 'warning',
    label: 'Ambiguous',
    headline: 'Two bindings in the same tier claim this kind.',
    action: 'A build mistake rather than a runtime one. Declare one host row to settle it.',
  },
} as const satisfies Record<MissCode, MissPresentation>

export function CardMiss({ code, wireKind, reason, payload, className }: CardMissProps) {
  const p = MISS_PRESENTATION[code]

  return (
    <Envelope accent={p.tone} className={className}>
      <EnvelopeHeader icon={p.icon} label={p.label} tone={p.tone} meta={<code>{wireKind}</code>} />
      <EnvelopeBody title={p.headline} description={reason}>
        <p className="text-xs text-fg-muted">{p.action}</p>
        {payload != null ? (
          <div className="mt-3 overflow-x-auto rounded-control border border-border-subtle bg-bg p-3">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-fg-secondary">
              {payload}
            </pre>
          </div>
        ) : null}
      </EnvelopeBody>
    </Envelope>
  )
}

/**
 * The fallback that declined.
 *
 * `design-bindings` gates a fallback on `preservesMeaning` and returns nothing when
 * it is false, because degrading a structured decision into something that cannot
 * express it returns a SUCCESS THE USER ACTS ON. That matters more here than anywhere
 * else in the portfolio: these cards carry decisions a person makes. A fallback that
 * renders an approval as inert prose has not degraded gracefully — it has quietly
 * changed what the person was asked.
 *
 * So "the fallback declined" is a first-class outcome with its own card, not an empty
 * div. The person is told a decision arrived that this build cannot present faithfully.
 */
export interface CardFallbackDeclinedProps {
  readonly wireKind: string
  /** The declared degradation, so an operator can see what was on offer. */
  readonly degradation?: ReactNode
  readonly className?: string
}

export function CardFallbackDeclined({
  wireKind,
  degradation,
  className,
}: CardFallbackDeclinedProps) {
  return (
    <Envelope accent="warning" className={className}>
      <EnvelopeHeader
        icon={ShieldAlert}
        label="Not shown"
        tone="warning"
        meta={<code>{wireKind}</code>}
      />
      <EnvelopeBody
        title="This build will not show a simplified version of this."
        description="A fallback was available but could not preserve what was being asked, so it was refused rather than shown. Showing it would have looked like a success you could act on."
      >
        {degradation != null ? (
          <p className="text-xs text-fg-muted">Declared degradation: {degradation}</p>
        ) : null}
      </EnvelopeBody>
    </Envelope>
  )
}
