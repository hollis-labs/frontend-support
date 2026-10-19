import type { ReactNode } from 'react'
import { Activity, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn, ACCENT_TEXT_CLASSES, type Accent, type IconComponent } from '@hollis-labs/design-components'
import { Envelope, EnvelopeBody, EnvelopeHeader } from './envelope'

/**
 * One number, with the context that makes it mean something.
 *
 * THE TREND IS A DISCRIMINATED PROP, NOT A COLOUR. `up` is not green — `up` is
 * `up`, and whether that reads as good is the caller's domain knowledge. Rising
 * error rate is `up` and should not be green. Nanite hardcodes `up -> text-success`
 * in a lookup and has no way to say otherwise, so `tone` is offered separately here
 * and the trend glyph defaults to neutral. That is a real behaviour change from the
 * source and it is deliberate: the alternative is a card that quietly editorialises.
 */

export type MetricTrend = 'up' | 'down' | 'flat'

export interface MetricCardProps {
  /** What is being measured. Rendered as the mono kicker above the value. */
  readonly label: ReactNode
  readonly value: ReactNode
  readonly unit?: ReactNode
  readonly trend?: MetricTrend
  /**
   * Colours the trend glyph. Default `neutral`, which is the honest default — see
   * the note above on why `up` is not green.
   */
  readonly tone?: Accent
  /** Shown as "Previously: …". Omit when there is nothing to compare against. */
  readonly previous?: ReactNode
  readonly description?: ReactNode
  readonly className?: string
}

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const satisfies Record<MetricTrend, IconComponent>

export function MetricCard({
  label,
  value,
  unit,
  trend,
  tone = 'neutral',
  previous,
  description,
  className,
}: MetricCardProps) {
  const TrendIcon = trend ? TREND_ICON[trend] : null

  return (
    <Envelope className={className}>
      <EnvelopeHeader icon={Activity} label="Metric" />
      <EnvelopeBody>
        <div className="font-mono text-caption font-semibold uppercase tracking-label text-fg-muted">
          {label}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold leading-none tabular-nums text-fg">
            {value}
          </span>
          {unit != null ? <span className="text-control text-fg-muted">{unit}</span> : null}
          {TrendIcon ? <TrendIcon className={cn('size-4 shrink-0', ACCENT_TEXT_CLASSES[tone])} /> : null}
        </div>
        {previous != null ? (
          <div className="mt-1 text-xs text-fg-muted">
            Previously: {previous}
            {unit != null ? <> {unit}</> : null}
          </div>
        ) : null}
        {description != null ? <p className="mt-2 text-xs text-fg-secondary">{description}</p> : null}
      </EnvelopeBody>
    </Envelope>
  )
}
