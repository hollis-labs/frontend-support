import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Button, Pill, type IconComponent } from '@hollis-labs/design-components'
import { ConfirmationCardContext } from '../confirmation-context'
import type { Tone } from '@hollis-labs/design-tokens'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'
import { AnswerableNotices, ResolvedFooter } from '../answerable'
import { useAnswerable, type AnswerableStateProps } from '../answerable-state'
import type { CardResponder, PriorResponseState } from '../response'

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

export interface ConfirmationCardProps extends AnswerableStateProps {
  readonly title: ReactNode
  readonly description?: ReactNode
  /** Rendered between the description and the actions — a diff, a list, details. */
  readonly children?: ReactNode
  /** At least one. An empty action row is a card nobody can answer. */
  readonly actions: readonly ConfirmationAction[]
  readonly onRespond: CardResponder
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
  expired: { icon: AlertTriangle, tone: 'neutral', text: 'Expired' },
  superseded: { icon: AlertTriangle, tone: 'neutral', text: 'Superseded' },
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
  busy: hostBusy,
  stale,
  onReload,
  elevation,
  receipt,
  supersededBy,
  priorActionId,
  cancelable = true,
  cancelLabel = 'Dismiss',
  icon = AlertTriangle,
  label = 'Confirm',
  className,
}: ConfirmationCardProps) {
  const { state, live, disabled, transitioned, run } = useAnswerable({ priorStatus, busy: hostBusy, stale, elevation })

  const choose = (action: ConfirmationAction) =>
    run(() =>
      onRespond({
        status: 'submitted',
        decisions: [{ itemId: action.id, action: action.id }],
      }),
    )
  const decline = () => run(() => onRespond({ status: 'canceled' }))

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
          {stale || elevation ? (
            <div className="mt-3 flex flex-col gap-2">
              <AnswerableNotices stale={stale} onReload={onReload} elevation={elevation} />
            </div>
          ) : null}
        </EnvelopeBody>

        {live && !elevation ? (
          <EnvelopeFooter className="flex-wrap justify-end">
            {actions.length === 0 ? (
              <span className="mr-auto text-xs text-warning">
                This card was given no actions, so there is nothing to answer.
              </span>
            ) : null}
            {cancelable ? (
              <Button variant="ghost" size="sm" className="max-sm:min-h-11" disabled={disabled} onClick={decline}>
                {cancelLabel}
              </Button>
            ) : null}
            {actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                className="max-sm:min-h-11"
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
        ) : live ? null : (
          <ResolvedFooter state={state} receipt={receipt} supersededBy={supersededBy} chosen={chosen?.label} focusOnMount={transitioned} statusInHeader />
        )}
      </Envelope>
    </ConfirmationCardContext.Provider>
  )
}
