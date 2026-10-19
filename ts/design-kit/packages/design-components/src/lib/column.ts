import type { ReactNode } from 'react'

/**
 * The column contract — types plus two pure helpers, and no component.
 *
 * This is here on a judgment call CW-0116 stated rather than assumed, so it can
 * be argued with: `DataTable` itself is dense-operations idiom and stays in
 * `kit-dashboard`, but the *contract* it renders against is the thing a second
 * kit would otherwise re-derive. The epic names "this schema renders as these
 * components" as the binding gap that produces drift N consumers deep; two kits
 * shipping two incompatible `ColumnDef`s is that gap in miniature. Putting the
 * contract one layer down costs base nothing — zero appearance beyond
 * `text-left/right/center` — and makes the incompatibility impossible instead of
 * merely unlikely.
 *
 * If that call is rejected, the alternative is to keep this beside `DataTable` in
 * kit; the cost is that the second kit re-derives it.
 */

export type SortDir = 'asc' | 'desc'

export interface SortState {
  key: string
  dir: SortDir
}

/** Column definition for a data table. */
export interface ColumnDef<T> {
  /** Stable key — also the sort key when the column is sortable. */
  key: string
  /** Header content. */
  header: ReactNode
  /** Cell renderer for a row. */
  cell: (item: T) => ReactNode
  /**
   * When provided the column is sortable; returns the comparable value for a
   * row. Strings sort case-insensitively.
   */
  sortValue?: (item: T) => string | number
  /** `fill` takes the remaining width; `min` shrinks to content. Default `min`. */
  width?: 'fill' | 'min'
  /** Horizontal alignment for header + cells. Default `left`. */
  align?: 'left' | 'right' | 'center'
  /** Extra className applied to each cell in this column. */
  className?: string
}

const ALIGN_CLASS: Record<NonNullable<ColumnDef<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

/** Resolve the alignment utility class for a column. */
export function alignClass(align: ColumnDef<unknown>['align']): string {
  return ALIGN_CLASS[align ?? 'left']
}

/** Compare two rows by a column's sort value. */
export function compareBy<T>(column: ColumnDef<T>, a: T, b: T, dir: SortDir): number {
  if (!column.sortValue) return 0
  const av = column.sortValue(a)
  const bv = column.sortValue(b)
  const an = typeof av === 'string' ? av.toLowerCase() : av
  const bn = typeof bv === 'string' ? bv.toLowerCase() : bv
  const cmp = an < bn ? -1 : an > bn ? 1 : 0
  return dir === 'asc' ? cmp : -cmp
}
