import { useId, useState, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button, Input, Pill } from '@hollis-labs/design-components'
import { AnswerableNotices, ResolvedFooter } from '../answerable'
import { useAnswerable, type AnswerableStateProps } from '../answerable-state'
import type { CardResponder } from '../response'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'

export interface PromptCardProps extends AnswerableStateProps {
  readonly questionId: string
  readonly title: ReactNode
  readonly description?: ReactNode
  /** Controlled draft and persisted answer; the host owns both. */
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly onRespond: CardResponder
  readonly inputLabel?: string
  readonly submitLabel?: ReactNode
  readonly cancelLabel?: ReactNode
  readonly className?: string
}

/** Text elicitation only. Boolean choices reuse ConfirmationCard. */
export function PromptCard({ questionId, title, description, value, onValueChange, onRespond, priorStatus, busy: hostBusy, stale, onReload, elevation, receipt, supersededBy, inputLabel = 'Response', submitLabel = 'Submit', cancelLabel = 'Decline', className }: PromptCardProps) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const { state, disabled, busy, transitioned, run } = useAnswerable({ priorStatus, busy: hostBusy, stale, elevation })
  const settled = state.kind === 'submitted' || state.kind === 'canceled'
  const lapsed = state.kind === 'expired' || state.kind === 'superseded' || state.kind === 'failed'

  async function respond(cancel = false) {
    if (disabled || (!cancel && value.trim() === '')) return
    setError(null)
    try {
      await run(() => onRespond(cancel ? { status: 'canceled' } : {
        status: 'submitted', answers: [{ questionId, value: value.trim() }],
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit response. Try again.')
    }
  }

  return (
    <Envelope accent="info" muted={settled} className={className}>
      <EnvelopeHeader icon={HelpCircle} label="Prompt" tone="info"
        meta={state.kind !== 'open' ? <Pill>{state.kind === 'submitted' ? 'Submitted' : state.kind === 'canceled' ? 'Declined' : state.kind === 'pending' ? 'Working' : state.kind === 'failed' ? 'Failed' : state.kind === 'expired' ? 'Expired' : state.kind === 'superseded' ? 'Superseded' : 'Unknown state'}</Pill> : null} />
      <EnvelopeBody title={title} description={description}>
        {settled ? (
          state.kind === 'submitted' ? <p className="whitespace-pre-wrap text-control text-fg-secondary">{value}</p> : null
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-caption text-fg-muted">{inputLabel}</label>
            <Input id={id} value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}
              className="text-control max-sm:min-h-11 md:text-(length:--text-control)"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                  event.preventDefault()
                  void respond()
                }
              }} />
            {state.kind === 'unrecognized' ? <p className="text-caption text-warning">Recorded status: {state.status}. This prompt is locked.</p> : null}
          </div>
        )}
        {error ? <p role="alert" className="mt-2 text-control text-danger">{error}</p> : null}
        {stale || elevation ? (
          <div className="mt-3 flex flex-col gap-2">
            <AnswerableNotices stale={stale} onReload={onReload} elevation={elevation} />
          </div>
        ) : null}
      </EnvelopeBody>
      {settled || lapsed ? (
        receipt || lapsed ? <ResolvedFooter state={state} receipt={receipt} supersededBy={supersededBy} focusOnMount={transitioned} statusInHeader /> : null
      ) : !elevation ? (
        <EnvelopeFooter className="flex-wrap justify-end">
          {busy ? <span role="status" className="mr-auto text-caption text-fg-muted">Submitting…</span> : null}
          <Button type="button" variant="ghost" size="sm" className="max-sm:min-h-11" disabled={disabled} onClick={() => void respond(true)}>{cancelLabel}</Button>
          <Button type="button" size="sm" className="max-sm:min-h-11" disabled={disabled || value.trim() === ''} onClick={() => void respond()}>{submitLabel}</Button>
        </EnvelopeFooter>
      ) : null}
    </Envelope>
  )
}
