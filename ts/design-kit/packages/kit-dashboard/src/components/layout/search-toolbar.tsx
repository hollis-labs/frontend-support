import type { ComponentProps, ReactNode } from 'react'
import { SearchInput } from '@hollis-labs/design-components'
import { DashboardToolbar } from './dashboard-controls'

/** Standalone search band using the same gutter, field surface and divider as FilterBar. */
export function DashboardSearchToolbar({ value, onChange, label, placeholder, children, slashToFocus = false, retainFocusOnClear, layeredEscape }: {
  value: string; onChange: (value: string) => void; label: string; placeholder?: string; children?: ReactNode
} & Pick<ComponentProps<typeof SearchInput>, 'slashToFocus' | 'retainFocusOnClear' | 'layeredEscape'>) {
  return <DashboardToolbar className="border-b border-border px-4 py-2">
    <div className="dash-search-adapter min-w-0 flex-1 basis-60">
      <SearchInput value={value} onChange={onChange} ariaLabel={label} placeholder={placeholder} debounceMs={0} slashToFocus={slashToFocus} retainFocusOnClear={retainFocusOnClear} layeredEscape={layeredEscape} />
    </div>
    {children}
  </DashboardToolbar>
}
