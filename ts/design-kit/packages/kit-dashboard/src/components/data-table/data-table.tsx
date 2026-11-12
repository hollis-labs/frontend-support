import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { alignClass, compareBy, type ColumnDef, type SortState } from '@hollis-labs/design-components'
import { DataTableRow } from './data-table-row'

export type TableDensity = 'compact' | 'comfortable'

interface DataTableProps<T> {
  /** Table layout classes; the shared wrapper retains horizontal scrolling. */
  className?: string
  /** Accessible table name, also useful when the header is visually hidden. */
  ariaLabel?: string
  /** Hide column headings visually for a record-list presentation. */
  headerVisibility?: 'visible' | 'sr-only'
  /** Accessible table description; displayed beneath the records. */
  caption?: ReactNode
  /** Full-width table footer for totals or evidence coverage. */
  footer?: ReactNode
  /** Compact operations rows by default; comfortable for longer content. */
  density?: TableDensity
  /** Currently rendered ids after sorting/windowing; use for detail navigation. */
  onVisibleOrderChange?: (ids: string[]) => void | boolean
  items: T[]
  columns: ColumnDef<T>[]
  /** Stable, unique id per row. */
  getRowId: (item: T) => string
  /** Initial sort. Defaults to unsorted (input order). */
  initialSort?: SortState
  /** When set, rows are openable (click / Enter / Space). */
  onRowOpen?: (id: string, item: T) => void
  /** Accessible label per row, used for openable rows + select checkboxes. */
  rowAriaLabel?: (item: T) => string
  /** Render a leading select-checkbox column. */
  selectable?: boolean
  selectedIds?: readonly string[]
  /** Opt-in synchronous selection/window retirement, preserving current sort. */
  selectionResetKey?: unknown
  guardedRows?: boolean
  interactionAllowed?: () => boolean
  revealControls?: boolean
  /** Notified with the selected row ids whenever the selection changes. */
  onSelectionChange?: (ids: string[]) => void
  /** Rows rendered per window page (infinite scroll). Default 50. */
  pageSize?: number
  /** Scroll container used as the IntersectionObserver root. */
  scrollRootRef?: RefObject<HTMLElement | null>
  /** Shown in place of the body when there are no rows. */
  emptyState?: ReactNode
}

const DEFAULT_PAGE_SIZE = 50

/**
 * Generic, sortable, windowed data table. Columns are described declaratively
 * via `ColumnDef`; the table owns sorting, infinite-scroll windowing, and
 * (optional) row selection. App-specific tables are a thin `columns` array
 * plus a `getRowId`.
 */
export function DataTable<T>({
  className = '',
  ariaLabel,
  headerVisibility = 'visible',
  caption,
  footer,
  items,
  density = 'compact',
  onVisibleOrderChange,
  columns,
  getRowId,
  initialSort,
  onRowOpen,
  rowAriaLabel,
  selectable,
  selectedIds,
  selectionResetKey,
  guardedRows = false,
  interactionAllowed,
  revealControls = false,
  onSelectionChange,
  pageSize = DEFAULT_PAGE_SIZE,
  scrollRootRef,
  emptyState,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null)
  const [internalSelected, setSelected] = useState<Set<string>>(new Set())
  const selected = new Set(selectedIds ?? internalSelected)
  const reportedOrderRef = useRef<{ key: unknown; ids: string[] } | null>(null)
  const [resetKey, setResetKey] = useState(selectionResetKey)
  const [visibleCount, setVisibleCount] = useState(pageSize)
  if (!Object.is(resetKey, selectionResetKey)) {
    setResetKey(selectionResetKey)
    setSelected(new Set())
    setVisibleCount(pageSize)
  }
  const sentinelRef = useRef<HTMLTableRowElement | null>(null)

  // Reset the window to the first page whenever the list, sort, or page size
  // changes. Done as an adjust-state-during-render rather than an effect so it
  // applies before the first paint of the new list.
  const [windowKey, setWindowKey] = useState({ items, sort, pageSize })
  if (windowKey.items !== items || windowKey.sort !== sort || windowKey.pageSize !== pageSize) {
    setWindowKey({ items, sort, pageSize })
    setVisibleCount(pageSize)
  }

  const columnByKey = useMemo(
    () => new Map(columns.map((column) => [column.key, column])),
    [columns],
  )

  function handleSortClick(key: string) {
    if (interactionAllowed && !interactionAllowed()) return
    const column = columnByKey.get(key)
    if (!column?.sortValue) return
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key, dir: 'asc' }
    })
  }

  const sorted = useMemo(() => {
    if (!sort) return items
    const column = columnByKey.get(sort.key)
    if (!column?.sortValue) return items
    return [...items].sort((a, b) => compareBy(column, a, b, sort.dir) || (guardedRows ? getRowId(a).localeCompare(getRowId(b)) : 0))
  }, [items, sort, columnByKey, guardedRows, getRowId])

  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount])
  const hasMore = visibleCount < sorted.length

  useEffect(() => {
    if (!onVisibleOrderChange) {
      reportedOrderRef.current = null
      return
    }
    const ids = visible.map(getRowId)
    const report = reportedOrderRef.current
    const previous = Object.is(report?.key, selectionResetKey) ? report?.ids : null
    // Inline columns/getRowId/callbacks may change identity when the app stores
    // this cursor in state. Publish actual order changes, avoiding a render loop.
    if (previous?.length === ids.length && previous.every((id, index) => id === ids[index])) return
    const accepted = onVisibleOrderChange(ids)
    if (!guardedRows || accepted !== false) reportedOrderRef.current = { key: selectionResetKey, ids }
  }, [visible, getRowId, onVisibleOrderChange, selectionResetKey, guardedRows])

  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const root = scrollRootRef?.current ?? null
    const observer = new IntersectionObserver(
      (entries) => {
        if (interactionAllowed && !interactionAllowed()) return
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + pageSize, sorted.length))
        }
      },
      { root, rootMargin: '200px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, sorted.length, scrollRootRef, pageSize, interactionAllowed])

  function emitSelection(next: Set<string>) {
    if (interactionAllowed && !interactionAllowed()) return
    setSelected(next)
    onSelectionChange?.([...next])
  }

  function handleSelect(id: string, isSelected: boolean) {
    const next = new Set(selected)
    if (isSelected) next.add(id)
    else next.delete(id)
    emitSelection(next)
  }

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    emitSelection(e.target.checked ? new Set(visible.map(getRowId)) : new Set())
  }

  const allSelected = visible.length > 0 && visible.every((item) => selected.has(getRowId(item)))
  const totalCols = columns.length + (selectable ? 1 : 0)

  return (
    <div className="w-full overflow-x-auto">
      <table aria-label={ariaLabel} className={`w-full min-w-full ${className}`} data-density={density}>
        {caption != null && <caption className="dash-table-note caption-bottom">{caption}</caption>}
        <thead className={`${headerVisibility === 'sr-only' ? 'sr-only' : ''} dash-table-heading uppercase text-text-subtle`}>
          <tr className="border-b border-border">
            {selectable && (
              <th className="w-8 py-1.5 pl-3.5 pr-0">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-3 w-3 cursor-pointer appearance-none rounded-sm border border-border bg-panel-2 checked:border-text-soft checked:bg-text-soft"
                  aria-label={revealControls ? "Select all revealed rows" : "Select all rows"}
                />
              </th>
            )}
            {columns.map((column) => {
              const sortable = Boolean(column.sortValue)
              const isSorted = sort?.key === column.key
              return (
                <th
                  key={column.key}
                  aria-sort={sortable ? (isSorted ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  className={`py-1.5 font-medium ${alignClass(column.align)} ${
                    column.width === 'fill' ? 'px-3' : 'w-px whitespace-nowrap px-1.5'
                  }`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 transition-colors hover:text-text-muted"
                      onClick={() => handleSortClick(column.key)}
                    >
                      {column.header}
                      <span className={isSorted ? 'text-text-muted' : 'text-text-subtle'}>
                        {isSorted ? (sort?.dir === 'asc' ? '↑' : '↓') : '⇕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider dash-body leading-4">
          {visible.map((item) => {
            const id = getRowId(item)
            return (
              <DataTableRow
                key={id}
                density={density}
                guarded={guardedRows}
                item={item}
                rowId={id}
                columns={columns}
                selectable={selectable}
                selected={selected.has(id)}
                onSelect={handleSelect}
                onOpen={onRowOpen}
                ariaLabel={rowAriaLabel?.(item)}
              />
            )
          })}
          {visible.length === 0 && emptyState && (
            <tr>
              <td colSpan={totalCols} className="py-0">
                {emptyState}
              </td>
            </tr>
          )}
          {hasMore && (
            <tr ref={sentinelRef} aria-hidden="true">
              <td
                colSpan={totalCols}
                className="py-3 text-center text-label text-text-subtle/80"
              >
                Loading more… ({visible.length} of {sorted.length})
              </td>
            </tr>
          )}
        </tbody>
        {footer != null && <tfoot><tr><td colSpan={totalCols} className="dash-table-note border-t border-border">{footer}</td></tr></tfoot>}
      </table>
      {hasMore && revealControls && <button type="button" data-ops-action="reveal-more" className="m-3 rounded border border-border px-3 py-2 text-label text-text" onClick={() => { if (!interactionAllowed || interactionAllowed()) setVisibleCount(c => Math.min(c + pageSize, sorted.length)) }}>Show more</button>}
    </div>
  )
}
