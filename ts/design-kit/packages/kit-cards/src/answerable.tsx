import { cloneElement, isValidElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react'
import { RefreshCw, Lock } from 'lucide-react'
import { Button, cn, TONE_CLASSES, type IconComponent, type Tone } from '@hollis-labs/design-components'
import { presentationFor, type AnswerableStateProps, type CardReceipt } from './answerable-state'
import type { PriorResponseState } from './response'

export interface ResolvedFooterProps {
  readonly state: PriorResponseState
  readonly receipt?: CardReceipt
  readonly supersededBy?: ReactNode
  /** What was chosen, when the card knows it (an action label, an answer). */
  readonly chosen?: ReactNode
  /**
   * Take focus on mount IF focus was dropped (the control that had it just unmounted).
   * Never moves focus that is somewhere else on the page.
   */
  readonly focusOnMount?: boolean
  /**
   * The card already shows the state in its header (a pill). Skip the headline here so the
   * state is not said twice; the region keeps an accessible name, and renders only when
   * there is something more to say (a receipt, a link, an unrecognised status).
   */
  readonly statusInHeader?: boolean
  readonly className?: string
}

/**
 * The one receipt slot. Terminal state, who, when, what — and NO control that looks
 * actionable, so a finished card cannot invite a second submission (the ghost-card
 * fix). `role="status"` makes a change from open to resolved announce politely.
 *
 * `unrecognized` names the status it could not read: an operator who sees "unknown
 * state" learns nothing, one who sees the string can grep for it.
 */
export function ResolvedFooter({ state, receipt, supersededBy, chosen, focusOnMount, statusInHeader, className }: ResolvedFooterProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusOnMount) return
    const active = document.activeElement
    if (!active || active === document.body) ref.current?.focus()
  }, [focusOnMount])
  const p = presentationFor(state)
  if (!p) return null
  const Icon = p.icon
  const hasReceipt = receipt != null && (receipt.who != null || receipt.when != null || receipt.summary != null)
  // The header pill says "Expired"/"Superseded"/"Unknown state"; the sentence here adds what it
  // means, so only the plain outcomes are suppressed.
  const hideHeadline = statusInHeader === true && ['submitted', 'canceled', 'pending', 'failed'].includes(state.kind)
  if (hideHeadline && !hasReceipt) return null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-slot="resolved-footer"
      data-state={state.kind}
      role="status"
      aria-label={hideHeadline ? p.text : undefined}
      className={cn('min-w-0 space-y-1 border-t border-border-subtle px-4 py-2.5 outline-none [overflow-wrap:anywhere]', className)}
    >
      {hideHeadline ? null : (
        <div className="flex items-center gap-2 text-control text-fg-secondary">
          <Icon className={cn('size-3.5 shrink-0', TONE_TEXT[p.tone])} aria-hidden />
          <span className="font-medium">{p.text}</span>
          {chosen != null ? <span className="text-fg-muted">· {chosen}</span> : null}
        </div>
      )}
      {state.kind === 'unrecognized' ? (
        <p className="text-caption text-warning">
          This build does not recognise the recorded status <code className="font-mono">{state.status}</code>, so the
          card stays locked rather than risk a second submission.
        </p>
      ) : null}
      {state.kind === 'superseded' && supersededBy != null ? (
        <p className="text-caption text-fg-muted">{supersededBy}</p>
      ) : null}
      {hasReceipt ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-caption text-fg-muted">
          {receipt.who != null ? (
            <>
              <dt>By</dt>
              <dd className="min-w-0 text-fg-secondary">{receipt.who}</dd>
            </>
          ) : null}
          {receipt.when != null ? (
            <>
              <dt>When</dt>
              <dd className="min-w-0 text-fg-secondary">{receipt.when}</dd>
            </>
          ) : null}
          {receipt.summary != null ? (
            <>
              <dt>Result</dt>
              <dd className="min-w-0 text-fg-secondary">{receipt.summary}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  )
}

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
}

export interface CardNoticeProps {
  readonly tone?: Tone
  readonly icon?: IconComponent
  /** `alert` interrupts; use it only when the person must act now (a 409). */
  readonly role?: 'status' | 'alert'
  readonly action?: ReactNode
  readonly className?: string
  readonly children: ReactNode
}

/**
 * A quiet in-card notice. Text always carries the meaning; tone only reinforces.
 *
 * The action sits UNDER the text below `sm` (full width) and beside it from `sm` up, so a
 * 390px viewport never squeezes the message into a narrow column. The action is described
 * by the notice (`aria-describedby`), so a screen reader that lands on it hears why it is
 * there — for the elevation CTA, why the card is read-only.
 */
export function CardNotice({ tone = 'info', icon: Icon, role = 'status', action, className, children }: CardNoticeProps) {
  const id = useId()
  const describedAction =
    isValidElement(action) && (action.props as { 'aria-describedby'?: string })['aria-describedby'] == null
      ? cloneElement(action as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': id })
      : action
  return (
    <div
      data-slot="card-notice"
      role={role}
      className={cn('flex min-w-0 flex-col gap-2 rounded-control border px-3 py-2 text-control sm:flex-row sm:items-start', TONE_CLASSES[tone], className)}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {Icon ? <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : null}
        <div id={id} className="min-w-0 flex-1 [overflow-wrap:anywhere]">{children}</div>
      </div>
      {describedAction != null ? (
        <div data-slot="card-notice-action" className="w-full sm:w-auto sm:shrink-0 max-sm:[&>*]:w-full">{describedAction}</div>
      ) : null}
    </div>
  )
}

/** The notices every answerable card may owe the person, in one place. */
export function AnswerableNotices({
  stale,
  onReload,
  elevation,
}: Pick<AnswerableStateProps, 'stale' | 'onReload' | 'elevation'>) {
  return (
    <>
      {stale ? (
        <CardNotice
          tone="warning"
          icon={RefreshCw}
          role="alert"
          action={
            onReload ? (
              <Button type="button" size="sm" variant="outline" onClick={onReload} className="max-sm:min-h-11">
                Reload, keep my answers
              </Button>
            ) : null
          }
        >
          This card changed while you were answering. Your answers are kept; reload to see the current version.
        </CardNotice>
      ) : null}
      {elevation ? (
        <CardNotice tone="info" icon={Lock} action={elevation.action}>
          <span className="font-medium">Read-only.</span> {elevation.reason}
        </CardNotice>
      ) : null}
    </>
  )
}
