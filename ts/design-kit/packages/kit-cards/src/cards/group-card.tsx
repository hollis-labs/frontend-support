import { Children, useId, type ReactNode } from 'react'
import { Layers } from 'lucide-react'
import { Button } from '@hollis-labs/design-components'
import { ActionBar, Stack } from '../layout'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'

/**
 * Group and Stepper — the two ways to hold several cards as one.
 *
 * REUSE CHECK. `CollapsibleSection` and `Tabs` were examined: neither carries a
 * position-in-a-sequence meaning or the chassis, and a stepper that is a tab strip
 * lets a person skip an answer the sequence depends on. Both are PRESENTATION ONLY:
 * the group owns no answers and the stepper owns no progress — the host passes the
 * current step and gets `onStepChange`. That keeps drafts host-side, as the
 * architecture requires.
 */

export interface GroupCardProps {
  readonly title?: ReactNode
  readonly description?: ReactNode
  readonly label?: ReactNode
  readonly className?: string
  readonly children: ReactNode
}

export function GroupCard({ title, description, label = 'Group', className, children }: GroupCardProps) {
  return (
    <Envelope className={className}>
      <EnvelopeHeader icon={Layers} label={label} meta={`${Children.count(children)}`} />
      <EnvelopeBody title={title} description={description}>
        <Stack role="list" aria-label={typeof title === 'string' ? title : undefined}>
          {Children.map(children, (child, index) => (
            <div role="listitem" key={index} className="min-w-0">{child}</div>
          ))}
        </Stack>
      </EnvelopeBody>
    </Envelope>
  )
}

export interface StepperCardProps {
  readonly title?: ReactNode
  readonly steps: readonly { readonly id: string; readonly label: ReactNode; readonly content: ReactNode }[]
  /** Zero-based current step (controlled). */
  readonly step: number
  readonly onStepChange: (step: number) => void
  /** Disable Next until the current step is complete. */
  readonly canAdvance?: boolean
  readonly className?: string
}

export function StepperCard({ title, steps, step, onStepChange, canAdvance = true, className }: StepperCardProps) {
  const heading = useId()
  const current = Math.min(Math.max(step, 0), steps.length - 1)
  const active = steps[current]
  return (
    <Envelope className={className}>
      <EnvelopeHeader icon={Layers} label="Steps" meta={`${current + 1} / ${steps.length}`} />
      <EnvelopeBody title={title}>
        <ol className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-caption" aria-label="Progress">
          {steps.map((s, i) => (
            <li
              key={s.id}
              aria-current={i === current ? 'step' : undefined}
              className={i === current ? 'font-semibold text-fg' : i < current ? 'text-fg-secondary' : 'text-fg-muted'}
            >
              {i + 1}. {s.label}
              {i < current ? <span className="sr-only"> (done)</span> : null}
            </li>
          ))}
        </ol>
        <div id={heading} className="min-w-0">{active?.content}</div>
      </EnvelopeBody>
      <EnvelopeFooter>
        <ActionBar>
          <Button type="button" variant="ghost" size="sm" disabled={current === 0} className="max-sm:min-h-11" onClick={() => onStepChange(current - 1)}>
            Back
          </Button>
          <Button type="button" size="sm" disabled={current >= steps.length - 1 || !canAdvance} className="max-sm:min-h-11" onClick={() => onStepChange(current + 1)}>
            Next
          </Button>
        </ActionBar>
      </EnvelopeFooter>
    </Envelope>
  )
}
