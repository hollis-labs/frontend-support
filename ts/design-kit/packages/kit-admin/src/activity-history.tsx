import { cn } from '@hollis-labs/design-components'

export type ActivityTone = 'positive' | 'attention' | 'neutral' | 'muted'
const fills = { positive: 'fill-success', attention: 'fill-warning', neutral: 'fill-info', muted: 'fill-fg-faint' }

/** Normalized observed intervals. Empty areas remain unpainted, not idle. */
export function ActivityTimeline({ label, segments, size = 'default' }: {
  label: string; segments: { from: number; to: number; label: string; tone: ActivityTone }[];
  size?: 'default' | 'compact'
}) {
  return <svg role="img" aria-label={label} viewBox="0 0 100 1" preserveAspectRatio="none" shapeRendering="crispEdges"
    className={cn('w-full bg-panel-2', size === 'compact' ? 'h-1.5' : 'h-7')}>
    {segments.map((segment, i) => <rect key={i} x={Math.max(0, segment.from) * 100} y={0}
      width={Math.max(0, Math.min(1, segment.to) - Math.max(0, segment.from)) * 100} height={1} className={fills[segment.tone]}>
      <title>{segment.label}</title>
    </rect>)}
  </svg>
}

/** A frozen activity sparkline. null buckets are unobserved; zero is observed. */
export function ActivityBars({ label, values, tone = 'positive' }: { label: string; values: (number | null)[]; tone?: ActivityTone }) {
  const step = values.length ? 120 / values.length : 120
  return <svg role="img" aria-label={label} viewBox="0 0 120 22" preserveAspectRatio="none" shapeRendering="crispEdges" className="h-5.5 w-full">
    {values.map((value, i) => {
      if (value === null) return null
      const height = Math.max(1, Math.round(Math.min(100, Math.max(0, value)) / 100 * 22))
      return <rect key={i} x={i * step} y={22 - height} width={Math.max(0, step - 1)} height={height} className={cn(fills[tone], value === 0 && 'opacity-25')}>
        <title>{Math.round(value)}% working</title>
      </rect>
    })}
  </svg>
}
