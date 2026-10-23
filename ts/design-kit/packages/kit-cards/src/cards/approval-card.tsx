import { useId, useState, type ReactNode } from 'react'
import { OctagonAlert, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button, Input, type Accent, type IconComponent } from '@hollis-labs/design-components'
import { AnswerableNotices, ResolvedFooter } from '../answerable'
import { useAnswerable, type AnswerableStateProps } from '../answerable-state'
import { fieldDescribedBy } from '../field-ids'
import { ActionBar, Field } from '../layout'
import type { CardResponder } from '../response'
import type { ConfirmationAction } from './confirmation-card'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader, EnvelopeSection } from './envelope'

/**
 * An approval: a person is asked to authorise one specific operation.
 *
 * REUSE CHECK. `ConfirmationCard` was examined first and is the closest thing — it
 * owns the action/outcome seam and this card reports through the same
 * `CardResponder`. It is NOT extended, because an approval has contract that a
 * confirmation does not: a risk class that changes how the answer is collected, the
 * thing being approved (effects and a digest), who asked, when it lapses, and a
 * read-only state for a viewer who lacks the assurance. Bolting those onto
 * ConfirmationCard would turn its props into a union of two products.
 *
 * THIS IS A SHAPE, NOT A WIRE KIND (see cards/index.ts). Nothing here knows how the
 * host verifies the digest or applies the effects; the card shows them and reports
 * which action was chosen, with the digest it was shown so the host can bind it.
 *
 * RISK IS NEVER BY COLOUR ALONE. Each class carries an icon and a word. The class
 * also changes how the answer is collected: `medium` needs an explicit second
 * confirmation; `high` needs the typed phrase or is read-only. A class the card does
 * not recognise is treated as the most restrictive — read-only with the elevation
 * notice — because a missing class must never read as permission.
 */

export type ApprovalRisk = 'low' | 'medium' | 'high'

export interface ApprovalEffect {
  readonly id: string
  readonly label: ReactNode
  readonly detail?: ReactNode
}

const RISK: Record<ApprovalRisk, { icon: IconComponent; accent: Accent; label: string }> = {
  low: { icon: ShieldCheck, accent: 'info', label: 'Low risk' },
  medium: { icon: ShieldAlert, accent: 'warning', label: 'Medium risk' },
  high: { icon: OctagonAlert, accent: 'danger', label: 'High risk' },
}

export interface ApprovalCardProps extends AnswerableStateProps {
  /** The operation, as a sentence. */
  readonly title: ReactNode
  readonly description?: ReactNode
  /** Required. An unrecognised value is treated as `high` and read-only. */
  readonly risk: ApprovalRisk
  /** Short id shown in the header meta. */
  readonly id?: string
  /** Absolute expiry, already formatted by the host. */
  readonly expiresAt?: ReactNode
  /**
   * Remaining milliseconds from the HOST's clock. The countdown shows only in the
   * final minute; before that the absolute time is the only expiry shown.
   */
  readonly remainingMs?: number
  /** Who asked — the requesting agent. */
  readonly requester?: ReactNode
  /** Short digest of the exact change set being approved. */
  readonly digest?: string
  /** What will change. */
  readonly effects?: readonly ApprovalEffect[]
  /** Source app and a link back, for a card mirrored from elsewhere. */
  readonly origin?: ReactNode
  /** Default: Approve (primary) and Deny. */
  readonly actions?: readonly ConfirmationAction[]
  /** `high` risk: the exact phrase the person must type before approving. */
  readonly confirmPhrase?: string
  readonly onRespond: CardResponder
  readonly className?: string
}

const DEFAULT_ACTIONS: readonly ConfirmationAction[] = [
  { id: 'approve', label: 'Approve', primary: true },
  { id: 'deny', label: 'Deny' },
]

export function ApprovalCard({
  title,
  description,
  risk,
  id,
  expiresAt,
  remainingMs,
  requester,
  digest,
  effects,
  origin,
  actions = DEFAULT_ACTIONS,
  confirmPhrase,
  onRespond,
  priorStatus,
  busy: hostBusy,
  stale,
  onReload,
  elevation,
  receipt,
  supersededBy,
  className,
}: ApprovalCardProps) {
  const known = risk in RISK
  const effectiveRisk: ApprovalRisk = known ? risk : 'high'
  const r = RISK[effectiveRisk]
  const Icon = r.icon
  const unrecognizedElevation = known
    ? elevation
    : { reason: 'This approval has no recognised risk class, so it is read-only until it is elevated.', action: elevation?.action }
  const a = useAnswerable({ priorStatus, busy: hostBusy, stale, elevation: unrecognizedElevation })
  const phraseId = useId()
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState<ConfirmationAction | null>(null)

  const needsPhrase = effectiveRisk === 'high' && confirmPhrase != null
  const phraseOk = !needsPhrase || typed === confirmPhrase
  const countdown = remainingMs != null && remainingMs > 0 && remainingMs <= 60_000 ? Math.ceil(remainingMs / 1000) : null

  async function submit(action: ConfirmationAction) {
    await a.run(() =>
      onRespond({
        status: 'submitted',
        decisions: [{ itemId: id ?? action.id, action: action.id }],
        ...(digest ? { data: { digest } } : {}),
      }),
    )
    setPending(null)
    setTyped('')
  }

  function choose(action: ConfirmationAction) {
    if (a.disabled) return
    // `medium` collects an explicit second confirmation for any non-dismissive action.
    if (effectiveRisk === 'medium' && pending?.id !== action.id) {
      setPending(action)
      return
    }
    void submit(action)
  }

  async function decline() {
    await a.run(() => onRespond({ status: 'canceled' }))
  }

  const approvalBlocked = !phraseOk

  return (
    <Envelope accent={a.live ? r.accent : undefined} muted={!a.live} data-risk={effectiveRisk} className={className}>
      <EnvelopeHeader
        icon={Icon}
        tone={r.accent}
        label={
          <>
            Approval · {r.label}
          </>
        }
        meta={id ?? null}
      />
      <EnvelopeBody title={title} description={description}>
        <div className="flex flex-col gap-3">
          {requester != null || expiresAt != null || digest != null || origin != null ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-caption text-fg-muted">
              {requester != null ? (
                <>
                  <dt>Requested by</dt>
                  <dd className="min-w-0 text-fg-secondary">{requester}</dd>
                </>
              ) : null}
              {expiresAt != null ? (
                <>
                  <dt>Expires</dt>
                  <dd className="min-w-0 text-fg-secondary">
                    {expiresAt}
                    {countdown != null ? <span className="text-warning"> · in {countdown}s</span> : null}
                  </dd>
                </>
              ) : null}
              {digest != null ? (
                <>
                  <dt>Digest</dt>
                  <dd className="min-w-0 font-mono text-fg-secondary">{digest}</dd>
                </>
              ) : null}
              {origin != null ? (
                <>
                  <dt>Origin</dt>
                  <dd className="min-w-0 text-fg-secondary">{origin}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
          {effects && effects.length > 0 ? (
            <EnvelopeSection label="What will change">
              <ul className="space-y-1.5">
                {effects.map((effect) => (
                  <li key={effect.id} className="rounded-control border border-border-subtle bg-surface px-3 py-2">
                    <div className="text-control text-fg">{effect.label}</div>
                    {effect.detail != null ? (
                      <div className="mt-0.5 text-caption text-fg-muted">{effect.detail}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </EnvelopeSection>
          ) : null}
          <AnswerableNotices stale={stale} onReload={onReload} elevation={unrecognizedElevation} />
          {a.live && !unrecognizedElevation && needsPhrase ? (
            <Field
              id={phraseId}
              label={
                <>
                  Type <code className="font-mono">{confirmPhrase}</code> to enable approval
                </>
              }
            >
              <Input
                id={phraseId}
                value={typed}
                disabled={a.disabled}
                autoComplete="off"
                onChange={(event) => setTyped(event.target.value)}
                aria-describedby={fieldDescribedBy(phraseId, {})}
                className="text-control max-sm:min-h-11"
              />
            </Field>
          ) : null}
        </div>
      </EnvelopeBody>

      {a.live && unrecognizedElevation ? null : a.live ? (
        <EnvelopeFooter>
          {a.busy ? (
            <span role="status" className="text-caption text-fg-muted">Submitting…</span>
          ) : null}
          <ActionBar>
            {pending ? (
              <>
                <span className="mr-auto text-control text-fg-secondary">Confirm: {pending.label}?</span>
                <Button type="button" variant="ghost" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => setPending(null)}>
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={pending.tone === 'danger' ? 'destructive' : 'default'}
                  disabled={a.disabled || approvalBlocked}
                  className="max-sm:min-h-11"
                  onClick={() => void submit(pending)}
                >
                  Confirm {pending.label}
                </Button>
              </>
            ) : (
              <>
                {actions.map((action) => {
                  const isApprove = action.primary === true
                  return (
                    <Button
                      key={action.id}
                      type="button"
                      size="sm"
                      variant={action.tone === 'danger' ? 'destructive' : action.primary ? 'default' : 'outline'}
                      disabled={a.disabled || (isApprove && approvalBlocked)}
                      className="max-sm:min-h-11"
                      onClick={() => choose(action)}
                    >
                      {action.label}
                    </Button>
                  )
                })}
                <Button type="button" variant="ghost" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => void decline()}>
                  Dismiss
                </Button>
              </>
            )}
          </ActionBar>
        </EnvelopeFooter>
      ) : (
        <ResolvedFooter state={a.state} receipt={receipt} supersededBy={supersededBy} focusOnMount={a.transitioned} />
      )}
    </Envelope>
  )
}
