import type { ReactNode } from 'react'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { cn } from '@hollis-labs/design-components'
import { Envelope, EnvelopeBody, EnvelopeHeader } from './envelope'

/**
 * Work in flight — a bar, and optionally the steps behind it.
 *
 * THE PERCENTAGE IS CLAMPED, AND THAT IS NOT DEFENSIVENESS. A progress value comes
 * off the wire, and a backend that computes `done / total` emits `Infinity` the
 * first time `total` is 0. Unclamped, that renders a bar wider than its own frame.
 * Clamping is the only arithmetic in this file and it is at the boundary, where the
 * untrusted number arrives.
 */

export interface ProgressStep {
  readonly label: ReactNode
  readonly done: boolean
  /** Stable identity for the row. Falls back to position when the wire has none. */
  readonly id?: string
}

export interface ProgressCardProps {
  readonly title: ReactNode
  /** 0–100. Values outside the range are clamped rather than trusted. */
  readonly percent: number
  /** A short line under the title — what is happening right now. */
  readonly status?: ReactNode
  readonly description?: ReactNode
  readonly steps?: readonly ProgressStep[]
  readonly className?: string
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

export function ProgressCard({
  title,
  percent,
  status,
  description,
  steps,
  className,
}: ProgressCardProps) {
  const pct = clampPercent(percent)

  return (
    <Envelope className={className}>
      <EnvelopeHeader
        icon={Loader2}
        label="Progress"
        tone="info"
        meta={<span className="tabular-nums">{pct}%</span>}
      />
      <EnvelopeBody>
        <h3 className="text-sm font-semibold leading-snug text-fg">{title}</h3>
        {status != null ? <p className="mt-1 text-xs text-fg-secondary">{status}</p> : null}

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/*
           * THE ONE INLINE STYLE IN THIS PACKAGE, AND IT IS NOT A TOKEN VIOLATION.
           * The width is DATA — a number off the wire that changes every render —
           * not a design decision, and there is no token for "whatever 63% is".
           * Tailwind cannot emit a utility for a value it has not seen at build
           * time, so a class here would render nothing at all. The colour, the
           * height and the radius beside it are all named.
           */}
          <div
            className="h-full rounded-full bg-info transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {description != null ? <p className="mt-2 text-xs text-fg-muted">{description}</p> : null}

        {steps != null && steps.length > 0 ? (
          <ul className="mt-3 space-y-1.5 border-t border-border-subtle pt-3">
            {/*
              * Position is a legitimate key here: a checklist's steps are ORDERED
              * and the wire rarely gives them ids, so index IS identity. `id` is
              * offered for the host that has one — matching `TimelineEvent`.
              */}
            {steps.map((step, i) => (
              <li key={step.id ?? i} className="flex items-center gap-2">
                {step.done ? (
                  <CheckCircle className="size-3.5 shrink-0 text-success" />
                ) : (
                  <Circle className="size-3.5 shrink-0 text-fg-muted" />
                )}
                <span className={cn('text-xs', step.done ? 'text-fg-muted line-through' : 'text-fg')}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </EnvelopeBody>
    </Envelope>
  )
}
