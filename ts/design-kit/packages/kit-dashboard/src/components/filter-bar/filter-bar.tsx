import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { SearchInput } from '@hollis-labs/design-components'
import { DashboardToolbar } from '../layout/dashboard-controls'

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  searchPlaceholder?: string
  searchAriaLabel?: string
  /** Opt out of the legacy window shortcut when the host owns pane focus. */
  slashToFocus?: boolean
  /** Controlled pane search replaces the legacy SearchInput when supplied. */
  searchControl?: ReactNode
  /** Count of active facet filters — shown in the row-1 badge. */
  activeFilterCount: number
  /** Optional summary string (e.g. "2 filters · 14 matches"). */
  summary?: string
  /** Match count generates a summary when an explicit summary is omitted. */
  searchMatchCount?: number
  /** Trailing view/density/refresh actions, separate from facet controls. */
  actions?: ReactNode
  /** When provided, a Clear button appears once anything is active. */
  onClear?: () => void
  /** Row 2 — the chip row. Apps compose their own facet controls here. */
  children?: ReactNode
}

/**
 * Two-row filter shell: a search hero (row 1) and an app-composed chip row
 * (row 2, via `children`). Facet controls — status chips, cycle toggles,
 * entity comboboxes — are app-specific; build them with the filter primitives
 * (`FilterCycleToggle`, `FilterEntityCombobox`) and pass them as children.
 */
export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  slashToFocus,
  searchControl,
  activeFilterCount,
  summary,
  searchMatchCount,
  actions,
  onClear,
  children,
}: FilterBarProps) {
  const anyActive = activeFilterCount > 0 || searchQuery.length > 0
  const summaryText = summary ?? [
    activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'}` : '',
    searchMatchCount !== undefined ? `${searchMatchCount} match${searchMatchCount === 1 ? '' : 'es'}` : '',
  ].filter(Boolean).join(' · ')
  const showClear = Boolean(onClear) && anyActive

  return (
    <div className="flex flex-col border-b border-border bg-bg">
      {/* Row 1: search hero + summary + clear */}
      <DashboardToolbar className="px-4 py-2">
        <div className="dash-search-adapter flex min-w-0 flex-1 basis-60 [&>div]:min-w-0">
          {searchControl ?? <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            ariaLabel={searchAriaLabel}
            slashToFocus={slashToFocus}
          />}
        </div>
        <div className="inline-flex h-8 items-center gap-1.5 rounded border border-border-subtle bg-panel-2/50 px-2 dash-filter-caption uppercase tracking-wider text-text-soft">
          <span className="sr-only">Active filters:</span>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {activeFilterCount}
        </div>
        {summaryText && anyActive && (
          <span
            role="status"
            className="dash-filter-caption uppercase tracking-wider text-text-subtle"
          >
            {summaryText}
          </span>
        )}
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear all filters and search"
            className="rounded border border-border bg-transparent px-2 py-1 dash-filter-caption uppercase tracking-wider text-text-muted transition-colors hover:border-border-subtle hover:text-text"
          >
            Clear
          </button>
        )}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </DashboardToolbar>

      {/* Row 2: app-composed chip row */}
      {children && (
        <div className="border-t border-border px-4 py-2">
          <DashboardToolbar>{children}</DashboardToolbar>
        </div>
      )}
    </div>
  )
}
