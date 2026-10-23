import { useId, useState, type ReactNode } from 'react'
import { ListChecks } from 'lucide-react'
import { Button, Checkbox, Input } from '@hollis-labs/design-components'
import { AnswerableNotices, ResolvedFooter } from '../answerable'
import { useAnswerable, type AnswerableStateProps } from '../answerable-state'
import { ActionBar } from '../layout'
import type { CardResponder } from '../response'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'

/**
 * Pick one or several of a short list, with an optional free-text "other".
 *
 * REUSE CHECK. `PromptCard` is text-only and its header says boolean choices belong to
 * `ConfirmationCard`; `ListCard` selects rows but is a data list, not an option set;
 * `design-components` ships `Checkbox` and `Input`, which this composes. What was
 * missing is the option-set card itself. Single choice uses native radios (arrow keys,
 * one tab stop, announced as a group); multi uses checkboxes.
 */

export interface ChoiceOption {
  readonly id: string
  readonly label: ReactNode
  readonly description?: ReactNode
}

export interface ChoiceCardProps extends AnswerableStateProps {
  readonly questionId: string
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly options: readonly ChoiceOption[]
  readonly multiple?: boolean
  /** Offer an "Other" free-text answer. */
  readonly allowOther?: boolean
  /** The ids chosen so far (controlled, host-owned draft or recorded answer). */
  readonly value: readonly string[]
  readonly onValueChange: (value: readonly string[]) => void
  readonly otherValue?: string
  readonly onOtherChange?: (value: string) => void
  readonly onRespond: CardResponder
  readonly submitLabel?: ReactNode
  readonly className?: string
}

const OTHER = '__other__'

export function ChoiceCard({
  questionId,
  title,
  description,
  options,
  multiple = false,
  allowOther = false,
  value,
  onValueChange,
  otherValue = '',
  onOtherChange,
  onRespond,
  submitLabel = 'Submit',
  priorStatus,
  busy,
  stale,
  onReload,
  elevation,
  receipt,
  supersededBy,
  className,
}: ChoiceCardProps) {
  const a = useAnswerable({ priorStatus, busy, stale, elevation })
  const group = useId()
  const [error, setError] = useState<string | null>(null)
  const otherChosen = value.includes(OTHER)
  const complete = value.length > 0 && (!otherChosen || otherValue.trim() !== '')

  function toggle(id: string, checked: boolean) {
    if (multiple) onValueChange(checked ? [...value, id] : value.filter((v) => v !== id))
    else onValueChange(checked ? [id] : [])
  }

  async function submit() {
    if (!complete) return
    setError(null)
    try {
      await a.run(() =>
        onRespond({
          status: 'submitted',
          answers: [
            {
              questionId,
              value: (multiple ? value : value.slice(0, 1)).map((v) => (v === OTHER ? { other: otherValue.trim() } : v)),
            },
          ],
        }),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit. Try again.')
    }
  }

  const rows: { id: string; label: ReactNode; description?: ReactNode }[] = [
    ...options,
    ...(allowOther ? [{ id: OTHER, label: 'Other' }] : []),
  ]

  return (
    <Envelope accent={a.live ? 'info' : undefined} muted={!a.live} className={className}>
      <EnvelopeHeader icon={ListChecks} tone="info" label="Choice" />
      <EnvelopeBody title={title} description={description}>
        <fieldset className="m-0 min-w-0 border-0 p-0" disabled={a.disabled} aria-describedby={error ? `${group}-error` : undefined}>
          <legend className="sr-only">{typeof title === 'string' ? title : 'Choose'}</legend>
          <ul className="flex flex-col gap-1">
            {rows.map((option) => {
              const checked = value.includes(option.id)
              const inputId = `${group}-${option.id}`
              return (
                <li key={option.id} className="min-w-0">
                  <label
                    htmlFor={inputId}
                    className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control px-2 py-2 hover:bg-surface sm:min-h-9"
                  >
                    {multiple ? (
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        disabled={a.disabled}
                        onCheckedChange={(next) => toggle(option.id, next === true)}
                        className="mt-0.5"
                      />
                    ) : (
                      <input
                        id={inputId}
                        type="radio"
                        name={group}
                        checked={checked}
                        disabled={a.disabled}
                        onChange={(event) => toggle(option.id, event.target.checked)}
                        className="mt-1 size-4 shrink-0 accent-primary"
                      />
                    )}
                    <span className="min-w-0 text-control text-fg">
                      {option.label}
                      {option.description != null ? (
                        <span className="block text-caption text-fg-muted">{option.description}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          {allowOther && otherChosen ? (
            <Input
              value={otherValue}
              onChange={(event) => onOtherChange?.(event.target.value)}
              aria-label="Other answer"
              className="mt-2 text-control"
              disabled={a.disabled}
            />
          ) : null}
        </fieldset>
        <div className="mt-3 flex flex-col gap-2">
          <AnswerableNotices stale={stale} onReload={onReload} elevation={elevation} />
          {error ? (
            <p id={`${group}-error`} role="alert" className="text-control text-danger">{error}</p>
          ) : null}
        </div>
      </EnvelopeBody>
      {a.live && !elevation ? (
        <EnvelopeFooter>
          {a.busy ? <span role="status" className="text-caption text-fg-muted">Submitting…</span> : null}
          <ActionBar>
            <Button type="button" variant="ghost" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => void a.run(() => onRespond({ status: 'canceled' }))}>
              Dismiss
            </Button>
            <Button type="button" size="sm" disabled={a.disabled || !complete} className="max-sm:min-h-11" onClick={() => void submit()}>
              {submitLabel}
            </Button>
          </ActionBar>
        </EnvelopeFooter>
      ) : a.live ? null : (
        <ResolvedFooter state={a.state} receipt={receipt} supersededBy={supersededBy} focusOnMount={a.transitioned} />
      )}
    </Envelope>
  )
}
