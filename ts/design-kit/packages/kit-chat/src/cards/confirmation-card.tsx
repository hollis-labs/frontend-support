import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Button, Pill, type IconComponent } from '@hollis-labs/design-components'
import { ConfirmationCardContext } from '../lib/confirmation-context'
import type { Tone } from '@hollis-labs/design-tokens'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'
import {
  acceptsInput,
  classifyPriorResponse,
  type CardResponder,
  type PriorResponseState,
} from '../lib/response'

/**
 * A decision, presented as a card: here is what will happen, do you want it.
 *
 * ============================================================================
 * THE SPLIT THIS CARD EXISTS TO DEMONSTRATE
 * ============================================================================
 *
 * Nanite's `ConfirmationCard` is two things fused: "a confirm dialog in a card" and
 * "Nanite's plan-approval flow". It branches on `data_source.kind === 'plan_approval'`,
 * fetches the plan through `lib/api`, and calls `useApprovePlan` / `useRejectPlan`.
 * Measured 2026-09-12, it reaches into six app surfaces.
 *
 * A CARD SHAPE IS NOT A DOMAIN INTERACTION. What is general here is: a titled
 * proposal, a list of actions with tones, a submitted answer, and a resolved state
 * that survives reload. What is Nanite's is which endpoint approves a plan. So this
 * takes `actions` and a responder, and the plan-approval behaviour stays in the app —
 * which is also why this card has no data fetching, no query client, and no idea what
 * a plan is.
 *
 * RESOLVED STATE SURVIVES RELOAD, and that is the whole reason `priorStatus` is a
 * prop rather than internal state. A confirmed card that reads unconfirmed after a
 * refresh invites a second submission, and the second one 409s. The host passes
 * whatever the wire recorded and this card classifies it — see `lib/response.ts` for
 * why that input is an open string.
 */

export interface ConfirmationAction {
  /** Stable across renders, and what comes back in `decisions[].action`. */
  readonly id: string
  readonly label: ReactNode
  /**
   * Default `info`. `danger` gets the destructive treatment — this is the only
   * place the card makes a visual judgement, and the caller makes it.
   */
  readonly tone?: Tone
  /** Marks the action the person most likely wants. At most one should set it. */
  readonly primary?: boolean
}

export interface ConfirmationCardProps {
  readonly title: ReactNode
  readonly description?: ReactNode
  /** Rendered between the description and the actions — a diff, a list, details. */
  readonly children?: ReactNode
  /** At least one. An empty action row is a card nobody can answer. */
  readonly actions: readonly ConfirmationAction[]
  readonly onRespond: CardResponder
  /**
   * Whatever the wire last recorded for this envelope, verbatim. `null`/absent means
   * nothing yet. Deliberately a raw string — see `lib/response.ts`.
   */
  readonly priorStatus?: string | null
  /** The action the person chose last time, so a resolved card can say which. */
  readonly priorActionId?: string | null
  /** Offer a decline control alongside the actions. Default `true`. */
  readonly cancelable?: boolean
  readonly cancelLabel?: ReactNode
  readonly icon?: IconComponent
  readonly label?: ReactNode
  readonly className?: string
}

const RESOLVED_PRESENTATION = {
  submitted: { icon: CheckCircle, tone: 'success', text: 'Submitted' },
  canceled: { icon: XCircle, tone: 'neutral', text: 'Dismissed' },
  failed: { icon: AlertTriangle, tone: 'danger', text: 'Failed' },
  pending: { icon: AlertTriangle, tone: 'info', text: 'Working…' },
  unrecognized: { icon: AlertTriangle, tone: 'warning', text: 'Unknown state' },
} as const

function resolvedPresentation(state: PriorResponseState) {
  return state.kind === 'open' ? null : RESOLVED_PRESENTATION[state.kind]
}

export function ConfirmationCard({
  title,
  description,
  children,
  actions,
  onRespond,
  priorStatus,
  priorActionId,
  cancelable = true,
  cancelLabel = 'Dismiss',
  icon = AlertTriangle,
  label = 'Confirm',
  className,
}: ConfirmationCardProps) {
  const state = classifyPriorResponse(priorStatus)
  const live = acceptsInput(state)
  /*
   * IN-FLIGHT IS LOCAL AND PRIOR STATE IS A PROP, which is not an inconsistency.
   * "I just clicked" is this component's own business and nobody else can know it;
   * "this was decided" is a durable fact the host owns and must survive unmounting.
   * Collapsing the two would either lose the click or invent local truth about the
   * wire.
   */
  const [busy, setBusy] = useState(false)
  const disabled = !live || busy

  async function choose(action: ConfirmationAction) {
    if (disabled) return
    setBusy(true)
    try {
      await onRespond({
        status: 'submitted',
        decisions: [{ itemId: action.id, action: action.id }],
      })
    } finally {
      setBusy(false)
    }
  }

  async function decline() {
    if (disabled) return
    setBusy(true)
    try {
      await onRespond({ status: 'canceled' })
    } finally {
      setBusy(false)
    }
  }

  const resolved = resolvedPresentation(state)
  const chosen = priorActionId == null ? null : actions.find((a) => a.id === priorActionId)

  return (
    <ConfirmationCardContext.Provider value={{ state, priorActionId }}>
      <Envelope accent={live ? 'warning' : undefined} muted={!live} className={className}>
        <EnvelopeHeader
          icon={resolved ? resolved.icon : icon}
          label={label}
          tone={resolved ? resolved.tone : 'warning'}
          meta={
            resolved ? (
              <Pill tone={resolved.tone}>
                {chosen ? <>{resolved.text} · {chosen.label}</> : resolved.text}
              </Pill>
            ) : null
          }
        />
        <EnvelopeBody title={title} description={description}>
          {children}
        </EnvelopeBody>

        {state.kind === 'unrecognized' ? (
          <EnvelopeBody className="pt-0">
            <p className="text-xs text-warning">
              {/*
                * SAY THE VALUE. An operator who sees "unknown state" learns nothing;
                * one who sees the status string can grep for it. This is the same
                * reason the miss codes are not collapsed into "couldn't render".
                */}
              This build does not recognise the recorded status{' '}
              <code className="font-mono">{state.status}</code>, so the card stays locked
              rather than risk a second submission.
            </p>
          </EnvelopeBody>
        ) : null}

        {live ? (
          <EnvelopeFooter className="flex-wrap justify-end">
            {actions.length === 0 ? (
              <span className="mr-auto text-xs text-warning">
                This card was given no actions, so there is nothing to answer.
              </span>
            ) : null}
            {cancelable ? (
              <Button variant="ghost" size="sm" disabled={disabled} onClick={decline}>
                {cancelLabel}
              </Button>
            ) : null}
            {actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={
                  action.tone === 'danger' ? 'destructive' : action.primary ? 'default' : 'outline'
                }
                disabled={disabled}
                onClick={() => choose(action)}
              >
                {action.label}
              </Button>
            ))}
          </EnvelopeFooter>
        ) : null}
      </Envelope>
    </ConfirmationCardContext.Provider>
  )
}
