import type { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { TONE_CLASSES, type Tone } from '../lib/tone'

interface PillProps {
  children: ReactNode
  /** Color tone. Default `neutral`. */
  tone?: Tone
  /** Render a leading dot in the current color. */
  dot?: boolean
  className?: string
}

/**
 * Mini status chip — a compact inline pill for on/off, enabled/disabled, and
 * ok/error indicators.
 *
 * Base's answer to "render a tinted chip". `StatusBadge` stays in kit-dashboard
 * because it is bound to `lib/status.ts`'s closed twelve-value Torque vocabulary
 * — `routed`, `indexed`, `backlog` — which kit-chat has no use for. Split the chip
 * from that vocabulary and what is left is this plus a dot, which this already
 * does.
 */
export function Pill({ children, tone = 'neutral', dot = false, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-caption uppercase tracking-wider',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  )
}
