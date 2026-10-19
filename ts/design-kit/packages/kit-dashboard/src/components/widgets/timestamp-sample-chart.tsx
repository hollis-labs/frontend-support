import { useId } from 'react'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { cn } from '@hollis-labs/design-components'

export interface TimestampSample {
  /** Unique UTC timestamp, sorted ascending by the host. */
  t: string
  /** Finite sample; null preserves a gap. Zero is a real sample. */
  value: number | null
}

export type SampleUnit = 'count' | 'bytes' | 'seconds' | 'milliseconds' | 'ratio' | 'percent'

export interface TimestampSampleChartProps {
  points: readonly TimestampSample[]
  label: string
  unit: SampleUnit
  kind: 'gauge' | 'counter'
  className?: string
}

const utcTime = (epoch: number) => new Date(epoch).toISOString().slice(11, 19)

/**
 * Exact timestamp samples, without bucketing, filling, smoothing or rate
 * derivation. Hosts supply validated, sorted, unique UTC points and own
 * requested ranges, freshness, truncation and transport. Counters stay cumulative.
 * Animation is disabled, including when reduced motion is requested.
 */
export function TimestampSampleChart({ points, label, unit, kind, className }: TimestampSampleChartProps) {
  const captionId = useId()
  const data = points.map(point => ({ ...point, timestamp: Date.parse(point.t) }))
  return (
    <figure className={cn('flex min-w-0 flex-col gap-3', className)} aria-labelledby={captionId}>
      <figcaption id={captionId} className="text-label text-fg">
        {label} — {unit}, {kind === 'counter' ? 'cumulative counter' : 'gauge'}
      </figcaption>
      {points.length === 0 ? (
        <p className="text-caption text-fg-secondary">No samples</p>
      ) : (
        <div className="h-48 min-w-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} accessibilityLayer={false}>
              <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']}
                tickFormatter={utcTime} tick={{ className: 'fill-fg-secondary text-micro' }}
                axisLine={false} tickLine={false} />
              <YAxis domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]}
                tick={{ className: 'fill-fg-secondary text-micro' }} axisLine={false} tickLine={false} />
              <Line dataKey="value" type="linear" connectNulls={false}
                stroke="var(--color-primary)" dot={{ className: 'fill-primary stroke-primary' }}
                activeDot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="overflow-x-auto show-scrollbar">
        <table className="w-full text-left font-mono text-caption text-fg-secondary">
          <caption className="sr-only">{label} samples in UTC; values in {unit}</caption>
          <thead><tr><th scope="col" className="p-2">Time (UTC)</th><th scope="col" className="p-2">Value ({unit})</th></tr></thead>
          <tbody>{points.map(point => (
            <tr key={point.t} className="border-t border-border-subtle">
              <th scope="row" className="p-2 font-normal"><time dateTime={point.t}>{point.t}</time></th>
              <td className="p-2">{point.value === null ? 'No sample' : String(point.value)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </figure>
  )
}
