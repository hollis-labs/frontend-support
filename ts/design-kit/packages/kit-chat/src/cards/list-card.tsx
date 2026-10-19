import { useState, type ReactNode } from 'react'
import { Check, List } from 'lucide-react'
import { cn, Button, Pill, type Tone } from '@hollis-labs/design-components'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'
import {
  acceptsInput,
  classifyPriorResponse,
  type CardDecision,
  type CardResponder,
} from '../lib/response'

/**
 * A checkable list, with an optional action per row.
 *
 * THIS IS THE MOST AGGRESSIVELY NARROWED OF THE THREE. Nanite's `ListCard` is 361
 * lines carrying two entire domain flows — todos through `useTodos`/`useToggleTodo`,
 * and plan steps through `useTogglePlanStep` — plus `lib/api` and a `PlanStepStatus`
 * import. Six app surfaces, measured 2026-09-12. Almost none of that is list.
 *
 * WHAT SURVIVED IS: items with a checked state, an optional per-item status pill, an
 * optional per-item action, and one submission carrying every item's final state. The
 * toggling is CONTROLLED — the host owns `items` and gets `onToggle` — because a list
 * whose checkboxes are internal state cannot be driven by a server that also changes
 * them, which is exactly the case both of Nanite's flows are.
 *
 * ONE DECISION PER ITEM, NOT ONE PER CLICK. A person ticking four boxes and pressing
 * submit is making one answer about four things, and `decisions[]` is shaped for
 * precisely that. Emitting on every tick would submit — and therefore terminally
 * claim the envelope — on the first one.
 */

export interface ListCardItem {
  readonly id: string
  readonly label: ReactNode
  readonly description?: ReactNode
  readonly checked?: boolean
  /** A short status chip on the right of the row. */
  readonly status?: ReactNode
  readonly statusTone?: Tone
  /** Disable this row alone — a step that is not yet reachable. */
  readonly disabled?: boolean
}

export interface ListCardProps {
  readonly title?: ReactNode
  readonly items: readonly ListCardItem[]
  readonly description?: ReactNode
  /**
   * Called when a row is ticked. CONTROLLED — this card never mutates `items`; the
   * host applies the change and passes new items down. Omit to render a plain list
   * with no checkboxes at all.
   */
  readonly onToggle?: (id: string, checked: boolean) => void
  /**
   * Omit for a list that only displays. Supplying it adds the submit row, and
   * submission sends one decision per item with its final checked state.
   */
  readonly onRespond?: CardResponder
  readonly submitLabel?: ReactNode
  readonly priorStatus?: string | null
  readonly className?: string
}

export function ListCard({
  title,
  items,
  description,
  onToggle,
  onRespond,
  submitLabel = 'Submit',
  priorStatus,
  className,
}: ListCardProps) {
  const [busy, setBusy] = useState(false)
  const state = classifyPriorResponse(priorStatus)
  const answerable = onRespond != null
  const live = answerable && acceptsInput(state)
  const checkable = onToggle != null

  const done = items.filter((i) => i.checked).length

  async function submit() {
    if (!live || busy || onRespond == null) return
    setBusy(true)
    try {
      const decisions: CardDecision[] = items.map((item) => ({
        itemId: item.id,
        action: item.checked ? 'checked' : 'unchecked',
      }))
      await onRespond({ status: 'submitted', decisions })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Envelope muted={answerable && !live} className={className}>
      <EnvelopeHeader
        icon={List}
        label={title ?? 'List'}
        meta={checkable ? `${done}/${items.length}` : `${items.length}`}
      />

      {items.length === 0 ? (
        <EnvelopeBody description="Nothing in this list." />
      ) : (
        <EnvelopeBody description={description}>
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => {
              const rowDisabled = item.disabled === true || !live
              return (
                <li key={item.id} className="flex items-start gap-2.5">
                  {checkable ? (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.checked === true}
                      aria-label={typeof item.label === 'string' ? item.label : undefined}
                      disabled={rowDisabled}
                      onClick={() => onToggle(item.id, !(item.checked === true))}
                      className={cn(
                        'mt-0.5 grid size-4 shrink-0 place-items-center rounded-control border transition-colors',
                        item.checked
                          ? 'border-primary bg-primary text-primary-fg'
                          : 'border-border bg-bg',
                        rowDisabled ? 'opacity-50' : 'hover:border-primary',
                      )}
                    >
                      {item.checked ? <Check className="size-3" /> : null}
                    </button>
                  ) : (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" aria-hidden />
                  )}

                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        'text-control',
                        item.checked ? 'text-fg-muted line-through' : 'text-fg',
                      )}
                    >
                      {item.label}
                    </div>
                    {item.description != null ? (
                      <p className="mt-0.5 text-xs text-fg-secondary">{item.description}</p>
                    ) : null}
                  </div>

                  {item.status != null ? (
                    <Pill tone={item.statusTone ?? 'neutral'}>{item.status}</Pill>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </EnvelopeBody>
      )}

      {live && items.length > 0 ? (
        <EnvelopeFooter className="justify-end">
          <Button size="sm" disabled={busy} onClick={submit}>
            {submitLabel}
          </Button>
        </EnvelopeFooter>
      ) : null}

      {state.kind === 'unrecognized' ? (
        <EnvelopeFooter>
          <span className="text-xs text-warning">
            Recorded status <code className="font-mono">{state.status}</code> is not one this
            build knows, so the list stays locked.
          </span>
        </EnvelopeFooter>
      ) : null}
    </Envelope>
  )
}
