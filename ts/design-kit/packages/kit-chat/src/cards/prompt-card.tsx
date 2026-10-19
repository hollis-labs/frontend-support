import { useId, useState, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button, Input, Pill } from '@hollis-labs/design-components'
import { acceptsInput, classifyPriorResponse, type CardResponder } from '../lib/response'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'

export interface PromptCardProps {
  readonly questionId: string
  readonly title: ReactNode
  readonly description?: ReactNode
  /** Controlled draft and persisted answer; the host owns both. */
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly onRespond: CardResponder
  readonly priorStatus?: string | null
  readonly inputLabel?: string
  readonly submitLabel?: ReactNode
  readonly cancelLabel?: ReactNode
  readonly className?: string
}

/** Text elicitation only. Boolean choices reuse ConfirmationCard. */
export function PromptCard({ questionId, title, description, value, onValueChange, onRespond, priorStatus, inputLabel = 'Response', submitLabel = 'Submit', cancelLabel = 'Decline', className }: PromptCardProps) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const state = classifyPriorResponse(priorStatus)
  const settled = state.kind === 'submitted' || state.kind === 'canceled'
  const disabled = busy || !acceptsInput(state)

  async function respond(cancel = false) {
    if (disabled || (!cancel && value.trim() === '')) return
    setBusy(true)
    setError(null)
    try {
      await onRespond(cancel ? { status: 'canceled' } : {
        status: 'submitted', answers: [{ questionId, value: value.trim() }],
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit response. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Envelope accent="info" muted={settled} className={className}>
      <EnvelopeHeader icon={HelpCircle} label="Prompt" tone="info"
        meta={state.kind !== 'open' ? <Pill>{state.kind === 'submitted' ? 'Submitted' : state.kind === 'canceled' ? 'Declined' : state.kind === 'pending' ? 'Working' : state.kind === 'failed' ? 'Failed' : 'Unknown state'}</Pill> : null} />
      <EnvelopeBody title={title} description={description}>
        {settled ? (
          state.kind === 'submitted' ? <p className="whitespace-pre-wrap text-control text-fg-secondary">{value}</p> : null
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-caption text-fg-muted">{inputLabel}</label>
            <Input id={id} value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}
              className="text-control md:text-(length:--text-control)"
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
      </EnvelopeBody>
      {!settled ? (
        <EnvelopeFooter className="flex-wrap justify-end">
          {busy ? <span role="status" className="mr-auto text-caption text-fg-muted">Submitting…</span> : null}
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => void respond(true)}>{cancelLabel}</Button>
          <Button type="button" size="sm" disabled={disabled || value.trim() === ''} onClick={() => void respond()}>{submitLabel}</Button>
        </EnvelopeFooter>
      ) : null}
    </Envelope>
  )
}
