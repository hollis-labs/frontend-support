import { cn } from '@hollis-labs/design-components'

/** One labeled row in a {@link BarMeter}. */
export interface BarMeterRow {
  /** Stable key. */
  key: string
  /** Human label shown beside the bar. */
  label: string
  /** Numeric magnitude — bar width is `value / max`. */
  value: number
  /** Bar color — a theme token string. Default `var(--color-dash-status-doing)`. */
  color?: string
}

export interface BarMeterProps {
  /** Pre-computed rows — the caller owns the bucketing. */
  rows: BarMeterRow[]
  /** Header title. */
  title?: string
  /** Bar-width denominator. Default = largest row value (min 1). */
  max?: number
  className?: string
  /** Interactive distribution: clicking a row applies a host-owned filter. */
  onSelect?: (row: BarMeterRow) => void
  formatValue?: (value: number) => string
  showTotal?: boolean
}

const DEFAULT_COLOR = 'var(--color-dash-status-doing)'

/**
 * Horizontal labeled bar meter — a stack of thin bars sized against a shared
 * max. Generic and dependency-free; the caller pre-computes the rows.
 */
export function BarMeter({ rows, title, max, className, onSelect, formatValue = String, showTotal = true }: BarMeterProps) {
  const resolvedMax = Math.max(1, max ?? Math.max(1, ...rows.map((r) => r.value)))
  const total = rows.reduce((a, r) => a + r.value, 0)

  if (onSelect) return <div className={cn('space-y-3', className)} aria-label={title}>
    {rows.map(row => <button key={row.key} type="button" title={row.key} onClick={() => onSelect(row)} className="block w-full rounded text-left hover:bg-surface-hover/40 focus-visible:bg-surface-hover/40">
      <span className="mb-1 flex justify-between gap-3 dash-control">
        <span className="truncate text-fg-muted">{row.label}</span>
        <span className="font-mono text-fg-faint">{formatValue(row.value)}</span>
      </span>
      <span className="block h-1 bg-surface-hover">
        <span className="block h-full opacity-60" style={{ width: `${Math.max(0, Math.min(100, row.value / resolvedMax * 100))}%`, backgroundColor: row.color ?? DEFAULT_COLOR }} />
      </span>
    </button>)}
  </div>

  return (
    <div className={cn('flex flex-col gap-2', className)} aria-label={title}>
      {(title || showTotal) && <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-micro uppercase tracking-label text-muted-foreground">
          {title}
        </span>
        <span className="font-mono text-caption text-muted-foreground/80 tabular-nums">
          {showTotal && `${formatValue(total)} total`}
        </span>
      </div>}
      {rows.map((row) => {
        const color = row.color ?? DEFAULT_COLOR
        const pct = (row.value / resolvedMax) * 100
        return (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between">
              <span
                className="font-mono text-micro uppercase tracking-widest"
                style={{ color }}
              >
                {row.label}
              </span>
              <span className="font-mono text-caption tabular-nums text-muted-foreground">
                {formatValue(row.value)}
              </span>
            </div>
            <div className="h-[5px] w-full overflow-hidden rounded-sm bg-muted/50">
              <div
                className="h-full rounded-sm"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
