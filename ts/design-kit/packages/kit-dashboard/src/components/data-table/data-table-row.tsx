import type { TableDensity } from './data-table'
import { alignClass, type ColumnDef } from '@hollis-labs/design-components'
import { DataTableCell } from './data-table-cell'

interface DataTableRowProps<T> {
  density?: TableDensity
  guarded?: boolean
  item: T
  rowId: string
  columns: ColumnDef<T>[]
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  onOpen?: (id: string, item: T) => void
  /** Accessible label for the (interactive) row. */
  ariaLabel?: string
}

// Descendants marked data-row-interactive own their own clicks and must not
// trigger row-level open (checkboxes, copy buttons, inline menus).
const INTERACTIVE_SELECTOR = '[data-row-interactive="true"]'
const NATIVE_OWNER =
  'button, a, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="menu"], [role="listbox"]'

/** A single `DataTable` row. Internal — rendered by `DataTable`. */
export function DataTableRow<T>({
  guarded = false,
  density = 'compact',
  item,
  rowId,
  columns,
  selectable,
  selected,
  onSelect,
  onOpen,
  ariaLabel,
}: DataTableRowProps<T>) {
  function handleOpen(e: React.MouseEvent<HTMLTableRowElement>) {
    if (!onOpen) return
    if (guarded && (e.defaultPrevented || window.getSelection()?.isCollapsed === false)) return
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const target = e.target as HTMLElement | null
    if (target?.closest(INTERACTIVE_SELECTOR) || (guarded && target?.closest(NATIVE_OWNER))) return
    onOpen(rowId, item)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>) {
    if (!onOpen || e.target !== e.currentTarget) return
    if (
      guarded &&
      (e.defaultPrevented ||
        e.nativeEvent.isComposing ||
        e.nativeEvent.keyCode === 229 ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.shiftKey)
    )
      return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(rowId, item)
    }
  }

  return (
    <tr
      className={`outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        onOpen ? 'cursor-pointer' : ''
      } ${selected ? 'bg-panel-hover/70' : 'bg-bg hover:bg-panel-hover/60'}`}
      data-testid="data-table-row"
      data-ops-row-id={guarded ? rowId : undefined}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      aria-label={onOpen ? ariaLabel : undefined}
    >
      {selectable && (
        <DataTableCell density={density} kind="selection">
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={(e) => onSelect?.(rowId, e.target.checked)}
            className="mt-0.5 h-3 w-3 cursor-pointer appearance-none rounded-sm border border-border bg-panel-2 checked:border-text-soft checked:bg-text-soft"
            aria-label={ariaLabel ? `Select ${ariaLabel}` : 'Select row'}
            data-row-interactive="true"
          />
        </DataTableCell>
      )}
      {columns.map((column) => (
        <DataTableCell
          key={column.key}
          density={density}
          className={`${alignClass(column.align)} ${
            column.width === 'fill' ? 'w-full max-w-0' : 'w-px whitespace-nowrap'
          } ${column.className ?? ''}`}
        >
          {column.cell(item)}
        </DataTableCell>
      ))}
    </tr>
  )
}
