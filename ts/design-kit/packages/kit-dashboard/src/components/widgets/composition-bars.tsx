import { cn } from '@hollis-labs/design-components'
import type { BarListItem } from './bar-list'

export interface CompositionBarsProps {
  items: BarListItem[]
  className?: string
}

/** Compact distribution bar with legend rows for composition snapshots. */
export function CompositionBars({ items, className }: CompositionBarsProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (items.length === 0 || total === 0) {
    return <div className={cn('text-label text-text-subtle', className)}>none</div>
  }
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex h-3 overflow-hidden bg-panel-2">
        {items.map((item, index) => (
          <div
            key={item.label}
            style={{
              width: `${(item.value / total) * 100}%`,
              // NOT A DERIVED TOKEN, because the ramp is computed per segment:
              // each bar is a step fainter than the last. A token per step would
              // be six tokens describing an arithmetic sequence, and it would
              // still be wrong for a seventh segment.
              //
              // `color-mix(… , transparent)` IS alpha, so this says the same thing
              // by naming the token and setting opacity — no colour function, no
              // literal, and the ramp stays where it is computed.
              backgroundColor: 'var(--color-fg)',
              opacity: Math.max(30, 88 - index * 12) / 100,
            }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2 text-label">
            <span className="truncate text-text-soft" title={item.label}>
              {item.label}
            </span>
            <span className="font-mono tabular-nums text-text-subtle">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
