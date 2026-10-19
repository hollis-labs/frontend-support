/**
 * The dense-operations table and its filter band.
 *
 * THREE THINGS THAT USED TO BE HERE ARE NOW IN
 * `@hollis-labs/design-components`, because the behaviour was idiom-free and only
 * the chrome was not:
 *   FilterSearchInput -> SearchInput    debounce, `/`-to-focus, Esc-to-clear
 *   RowActionMenu     -> OverflowMenu   nothing about it was row-specific
 *   column.ts         -> the column contract, so a second kit cannot invent an
 *                       incompatible ColumnDef
 */
export {
  FilterBar,
  FilterChipGroup,
  FilterCycleToggle,
  FilterEntityCombobox,
  type CycleOption,
  type FilterChip,
  type FilterEntityComboboxItem,
} from './components/filter-bar'
export { DataTable, DataTableRow, DataTableCell, RecordSummary, type DataTableCellProps, type RecordSummaryProps } from './components/data-table'

export type { TableDensity } from './components/data-table/data-table'
export { useArrowNav, type ArrowNavOptions } from './hooks/use-arrow-nav'
export { useListNavigation, type ListNavigationOptions } from './hooks/use-list-navigation'

export { RecordListContent, RecordListHeader, RecordTag, RankBadge } from './components/data-table/record-list'
