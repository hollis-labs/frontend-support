import type { ComponentProps } from 'react'
import { cn } from '@hollis-labs/design-components'
import type { TableDensity } from './data-table'

export interface DataTableCellProps extends ComponentProps<'td'> {
  density?: TableDensity
  kind?: 'data' | 'selection'
}

/** Shared cell rhythm for DataTable and app-owned semantic tables. */
export function DataTableCell({ density = 'compact', kind = 'data', className, ...props }: DataTableCellProps) {
  return <td
    {...props}
    data-slot="data-table-cell"
    className={cn(
      'align-top dash-record-body',
      density === 'compact' ? 'py-1.5' : 'py-3',
      kind === 'selection' ? 'w-px pl-4 pr-0' : 'px-3',
      className,
    )}
  />
}
