import { useRef, type ReactNode } from 'react'
import { ListPageLayout } from './list-page-layout'
import { PageHeader } from '../page-header'
import { SummaryCards, type SummaryCard } from '../summary-cards'
import { FilterBar } from '../filter-bar'
import { Skeleton, type ColumnDef, type SortState } from '@hollis-labs/design-components'
import { DataTable } from '../data-table'
import type { TableDensity } from '../data-table/data-table'

export interface OperationsTablePageProps<T> {
  /* ---- header ---- */
  title: string
  /** Action buttons in the page header. */
  headerActions?: ReactNode
  /** Optional tab strip pinned under the header. */
  tabs?: ReactNode

  /* ---- summary ---- */
  /** Metric strip cards. Omit to hide the summary row. */
  summaryCards?: SummaryCard[]

  /* ---- filter bar ---- */
  searchQuery: string
  onSearchChange: (q: string) => void
  searchPlaceholder?: string
  searchAriaLabel?: string
  slashToFocus?: boolean
  searchControl?: ReactNode
  /** Count of active facet filters (drives the row-1 badge). */
  activeFilterCount?: number
  /** Optional summary string, e.g. "2 filters · 14 matches". */
  filterSummary?: string
  searchMatchCount?: number
  filterActions?: ReactNode
  footer?: ReactNode
  /** When provided, a Clear button appears once anything is active. */
  onClear?: () => void
  /** Row-2 facet controls — status chips, cycle toggles, comboboxes. */
  filterControls?: ReactNode

  /* ---- table ---- */
  density?: TableDensity
  onVisibleOrderChange?: (ids: string[]) => void | boolean
  items: T[]
  columns: ColumnDef<T>[]
  getRowId: (item: T) => string
  initialSort?: SortState
  selectable?: boolean
  selectedIds?: readonly string[]
  selectionResetKey?: unknown
  guardedRows?: boolean
  interactionAllowed?: () => boolean
  revealControls?: boolean
  onSelectionChange?: (ids: string[]) => void
  onRowOpen?: (id: string, item: T) => void
  rowAriaLabel?: (item: T) => string
  pageSize?: number

  /* ---- states ---- */
  /** Render a skeleton in place of the table. */
  loading?: boolean
  /** Shown in place of the table body when there are no rows. */
  emptyState?: ReactNode
  /** Request failure content, distinct from a successful empty result. */
  errorState?: ReactNode
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  )
}

/**
 * The operations / list page as one component. Composes `ListPageLayout` +
 * `PageHeader` + `SummaryCards` + `FilterBar` + `DataTable`, and owns the
 * wiring every app re-derived by hand — most importantly threading a single
 * scroll-region ref to the `DataTable` so its infinite-scroll observer roots
 * on the page body.
 *
 * Apps supply data + column defs + filter config; the chrome and spacing stay
 * identical across apps. For a bespoke layout, drop down to `ListPageLayout`.
 */
export function OperationsTablePage<T>({
  title,
  headerActions,
  tabs,
  summaryCards,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  slashToFocus,
  searchControl,
  activeFilterCount = 0,
  filterSummary,
  searchMatchCount,
  filterActions,
  footer,
  density,
  onVisibleOrderChange,
  onClear,
  filterControls,
  items,
  columns,
  getRowId,
  initialSort,
  selectable,
  selectedIds,
  selectionResetKey,
  guardedRows,
  interactionAllowed,
  revealControls,
  onSelectionChange,
  onRowOpen,
  rowAriaLabel,
  pageSize,
  loading,
  emptyState,
  errorState,
}: OperationsTablePageProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <ListPageLayout
      scrollRef={scrollRef}
      listScrollHook={guardedRows}
      header={<PageHeader title={title}>{headerActions}</PageHeader>}
      tabs={tabs}
      footer={footer}
      summary={summaryCards ? <SummaryCards cards={summaryCards} /> : undefined}
      filters={
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          searchAriaLabel={searchAriaLabel}
          slashToFocus={slashToFocus}
          searchControl={searchControl}
          activeFilterCount={activeFilterCount}
          summary={filterSummary}
          searchMatchCount={searchMatchCount}
          actions={filterActions}
          onClear={onClear}
        >
          {filterControls}
        </FilterBar>
      }
    >
      {loading ? (
        <TableSkeleton />
      ) : errorState ? errorState : (
        <DataTable
          items={items}
          density={density}
          onVisibleOrderChange={onVisibleOrderChange}
          columns={columns}
          getRowId={getRowId}
          initialSort={initialSort}
          selectable={selectable}
          selectedIds={selectedIds}
          selectionResetKey={selectionResetKey}
          guardedRows={guardedRows}
          interactionAllowed={interactionAllowed}
          revealControls={revealControls}
          onSelectionChange={onSelectionChange}
          onRowOpen={onRowOpen}
          rowAriaLabel={rowAriaLabel}
          pageSize={pageSize}
          scrollRootRef={scrollRef}
          emptyState={emptyState}
        />
      )}
    </ListPageLayout>
  )
}
