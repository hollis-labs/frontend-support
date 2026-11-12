import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@hollis-labs/design-components'

/** One stacked series in a {@link TimeSeriesChart}. */
export interface TimeSeriesSeries<T> {
  /** Stable data key — also the recharts `dataKey`. */
  key: string
  /** Human label shown in the legend and tooltip. */
  label: string
  /** Series color — a theme token string (e.g. `var(--color-dash-status-done)`). */
  color: string
  /** Per-item numeric contribution to this series. */
  value: (item: T) => number
}

export interface TimeSeriesChartProps<T> {
  items: T[]
  /** ISO timestamp accessor — items are bucketed by `.slice(0, 10)`. */
  date: (item: T) => string | null | undefined
  /** Stacked series definitions. */
  series: Array<TimeSeriesSeries<T>>
  /** `bar` = stacked BarChart (default); `area` = stacked AreaChart with gradient fill. */
  kind?: 'bar' | 'area'
  /** Number of trailing calendar days to bucket. Default 14. */
  days?: number
  /** Chart height in px. Default 160. */
  height?: number
  /** Header title. */
  title?: string
  /** Y-axis + tooltip value formatter. Default `String`. */
  formatValue?: (n: number) => string
  /** Empty-state message. Default `No data in window`. */
  emptyLabel?: string
  /** Force-show the legend. Defaults to `true` when more than one series. */
  showLegend?: boolean
  className?: string
}

interface DayBucket {
  /** `MM-DD` day label for the X axis. */
  day: string
  /** Per-series summed values, keyed by `series[i].key`. */
  [key: string]: string | number
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-micro text-muted-foreground">
      <span
        className="inline-block h-2 w-2 rounded-sm"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  )
}

/**
 * Stacked time-series chart — buckets `items` by calendar day over a trailing
 * window and renders a stacked bar or area chart. Generic over the item type;
 * each series pulls its value through an accessor.
 */
export function TimeSeriesChart<T>({
  items,
  date,
  series,
  kind = 'bar',
  days = 14,
  height = 160,
  title,
  formatValue = String,
  emptyLabel = 'No data in window',
  showLegend,
  className,
}: TimeSeriesChartProps<T>) {
  const data = useMemo<DayBucket[]>(() => {
    const buckets: DayBucket[] = []
    const map = new Map<string, DayBucket>()
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const bucket: DayBucket = { day: key.slice(5) }
      for (const s of series) bucket[s.key] = 0
      buckets.push(bucket)
      map.set(key, bucket)
    }
    for (const item of items) {
      const iso = date(item)
      if (!iso) continue
      const bucket = map.get(iso.slice(0, 10))
      if (!bucket) continue
      for (const s of series) {
        bucket[s.key] = (bucket[s.key] as number) + s.value(item)
      }
    }
    return buckets
  }, [items, date, series, days])

  const total = useMemo(
    () =>
      data.reduce(
        (acc, b) => acc + series.reduce((sum, s) => sum + (b[s.key] as number), 0),
        0,
      ),
    [data, series],
  )

  const legendVisible = showLegend ?? series.length > 1

  // `fill` here lands on an SVG <text> as a PRESENTATION ATTRIBUTE, where `var()`
  // is not resolved — and `--muted-foreground` was never declared in this codebase
  // anyway, so this has been rendering the SVG default black since it was written.
  // A className routes it through CSS, where both problems go away.
  const axisTick = {
    className: 'fill-fg-faint',
    fontSize: 9,
    fontFamily: 'ui-monospace',
  }
  // These DO resolve — recharts applies `contentStyle` to a real div — but the
  // names did not exist. `--popover`, `--border` and `--popover-foreground` are
  // shadcn's bare template spellings, and sysop-ui rebuilt the value layer as
  // `--theme-color-*` and kept only the `--color-*` half, so the tooltip has never
  // been themed. Same family as sonner's three. The declared names are prefixed.
  const tooltipContentStyle = {
    background: 'var(--color-popover)',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    fontSize: 11,
    fontFamily: 'ui-monospace',
    color: 'var(--color-popover-foreground)',
  }
  const tooltipFormatter = (v: unknown) =>
    formatValue(Number(Array.isArray(v) ? v[0] : (v ?? 0)))

  return (
    <div className={cn('flex flex-col gap-2', className)} aria-label={title}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-micro uppercase tracking-label text-muted-foreground">
          {title ? `${title} — last ${days}d` : `last ${days}d`}
        </span>
        {legendVisible ? (
          <div className="flex items-center gap-3">
            {series.map((s) => (
              <LegendDot key={s.key} color={s.color} label={s.label} />
            ))}
          </div>
        ) : null}
      </div>

      {total === 0 ? (
        <div
          className="flex items-center justify-center rounded-sm border border-border-subtle/60 bg-muted/20 font-mono text-caption text-muted-foreground"
          style={{ height }}
        >
          {emptyLabel}
        </div>
      ) : kind === 'area' ? (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`tsc-fill-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              width={36}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatValue(v)}
            />
            <Tooltip
              // Same presentation-attribute trap as the fill on 223, and
              // `--border` is declared nowhere either — dead twice over.
              cursor={{ className: 'stroke-border', strokeDasharray: '2 2' }}
              contentStyle={tooltipContentStyle}
              formatter={tooltipFormatter}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stackId="series"
                stroke={s.color}
                strokeWidth={1.5}
                fill={`url(#tsc-fill-${s.key})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              width={28}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickFormatter={(v: number) => formatValue(v)}
            />
            <Tooltip
              // A CLASS, NOT A `fill` VALUE, and the distinction is load-bearing:
              // recharts spreads these onto an SVG <Rectangle> as PRESENTATION
              // ATTRIBUTES, and `var()` is not resolved in those. `fill="var(--x)"`
              // would render nothing. A className goes through CSS, where it is.
              cursor={{ className: 'fill-fg', fillOpacity: 0.03 }}
              contentStyle={tooltipContentStyle}
              formatter={tooltipFormatter}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="series"
                fill={s.color}
                radius={i === series.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
