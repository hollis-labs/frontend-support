import type { ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'

export interface FilterChip {
  value: string
  disabled?: boolean
  /** Display text. Defaults to `value`. */
  label?: ReactNode
  /**
   * Tailwind classes applied when the chip is active — border + bg + text.
   * For status chips, pass `statusTone(value)`'s classes. Omit for the
   * neutral default accent.
   */
  activeClassName?: string
}

interface FilterChipGroupProps {
  /** Outlined chips keep full contrast in triage toolbars. */
  variant?: 'muted' | 'outline'
  ariaLabel?: string
  /** Optional label prefix, e.g. "Status". */
  label?: string
  chips: readonly FilterChip[]
  /** Currently-selected chip values. */
  selected: readonly string[]
  onToggle: (value: string) => void
}

const DEFAULT_ACTIVE = 'border-border bg-panel-hover text-text'
// Active chips carry a faint inset ring; inactive chips are dimmed — mirrors
// Torque's filter-bar chip states.
const ACTIVE_RING = 'ring-1 ring-inset ring-text/15'
const INACTIVE = 'border-border-subtle bg-panel-2/50 text-text-subtle opacity-50 hover:text-text-soft'

/**
 * Multi-select chip row — the facet toggle used in `FilterBar`'s chip row
 * (status filters, priority filters, …). Drop it into `FilterBar`'s children.
 * Tone-agnostic: each chip carries its own active classes so status chips can
 * use `statusTone` while other groups use a flat accent.
 */
export function FilterChipGroup({ variant = 'muted', label, ariaLabel, chips, selected, onToggle }: FilterChipGroupProps) {
  return (
    <div role="group" aria-label={ariaLabel ?? label} className="dash-filter-chips flex flex-wrap items-center gap-1">
      {label ? (
        <span className="mr-1 dash-filter-chip uppercase tracking-wider text-text-subtle">{label}</span>
      ) : null}
      {chips.map((chip) => {
        const active = selected.includes(chip.value)
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            disabled={chip.disabled}
            onClick={() => onToggle(chip.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 dash-filter-chip uppercase tracking-wider transition-all',
              variant === 'outline' && 'h-6 font-mono',
              active ? `${ACTIVE_RING} ${chip.activeClassName ?? DEFAULT_ACTIVE}` : variant === 'outline' ? 'border-border text-fg-muted hover:bg-surface-hover' : INACTIVE,
            )}
          >
            {chip.label ?? chip.value}
          </button>
        )
      })}
    </div>
  )
}
