import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import {
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@hollis-labs/design-components'
import { Popover, PopoverContent, PopoverTrigger } from '@hollis-labs/design-components'
import { ScrollArea } from '@hollis-labs/design-components'
import { useDashboardTypography } from '../../lib/dashboard-typography'

export interface FilterEntityComboboxItem {
  id: string
  name: string
  /** Optional trailing count badge. */
  count?: number
  disabled?: boolean
  /** Lifecycle status — drives the optional `showStateControls` filter. */
  status?: string | null
  /** ISO timestamp — drives the optional "Last updated" sort. */
  updated_at?: string | null
}

interface FilterEntityComboboxProps {
  /** Optional owner marker for scoped overlay admission. */
  overlayOwner?: string
  icon: ReactNode
  /** Composition-specific width; typography remains token based. */
  triggerClassName?: string
  items: FilterEntityComboboxItem[]
  value: string | null
  onChange: (id: string | null) => void
  allLabel: string
  ariaLabel: string
  /** When set, renders a sticky footer button that invokes this callback. */
  onCreate?: () => void
  /** Label for the `onCreate` footer button. Default `Create new`. */
  createLabel?: string
  /**
   * Adds a header row with a "Show inactive" toggle (filters to
   * `status === 'active'`) and an updated/title sort control.
   */
  showStateControls?: boolean
}

/**
 * Searchable single-select entity combobox. Optional `onCreate` adds a sticky
 * "create" footer; optional `showStateControls` adds active-only filtering and
 * an updated/title sort.
 */
export function FilterEntityCombobox({
  icon,
  triggerClassName,
  overlayOwner,
  items,
  value,
  onChange,
  allLabel,
  ariaLabel,
  onCreate,
  createLabel,
  showStateControls = false,
}: FilterEntityComboboxProps) {
  const typography = useDashboardTypography()
  const [open, setOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [sortOrder, setSortOrder] = useState<'updated' | 'title'>('updated')
  const selected = value ? items.find((i) => i.id === value) : null
  const displayLabel = selected?.name ?? allLabel
  const isMuted = selected === null || selected === undefined

  const visibleItems = useMemo(() => {
    const filtered =
      showStateControls && !showInactive
        ? items.filter((item) => !item.status || item.status === 'active')
        : items
    if (!showStateControls) return filtered
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'title') return a.name.localeCompare(b.name)
      return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
    })
  }, [items, showInactive, showStateControls, sortOrder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn("dash-dropdown-trigger transition-colors", triggerClassName)}
      >
        {icon && <span className="text-text-soft">{icon}</span>}
        <span className={isMuted ? 'text-text-subtle' : 'text-text'}>{displayLabel}</span>
        <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-text-subtle" />
      </PopoverTrigger>
      <PopoverContent {...typography} data-filter-owner={overlayOwner} className="dash-dropdown-menu w-64 p-0" align="start">
        <Command className={onCreate ? 'h-[300px]' : undefined}>
          <CommandInput placeholder="Search…" className="h-8 dash-filter-search" />
          {showStateControls && (
            <div className="flex items-center gap-2 border-b border-border-subtle px-2 py-2 dash-filter-search">
              <label className="flex items-center gap-1.5 text-text-soft">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Show inactive
              </label>
              <select
                className="ml-auto h-7 rounded-md border border-border-subtle bg-panel px-2 dash-filter-search text-text-muted"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'updated' | 'title')}
                aria-label="Sort order"
              >
                <option value="updated">Last updated</option>
                <option value="title">Title</option>
              </select>
            </div>
          )}
          <ScrollArea className="min-h-0 flex-1">
            <CommandList className="max-h-none">
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                >
                  <span className="text-text-soft">{allLabel}</span>
                </CommandItem>
                {visibleItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    disabled={item.disabled}
                    value={item.name}
                    onSelect={() => {
                      onChange(item.id)
                      setOpen(false)
                    }}
                  >
                    <span className="truncate">{item.name}</span>
                    {item.count !== undefined && (
                      <span className="ml-auto font-mono dash-filter-caption tabular-nums text-text-subtle">
                        {item.count}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
          {onCreate && (
            <>
              <CommandSeparator />
              <div className="sticky bottom-0 border-t border-border-subtle bg-popover p-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-muted"
                  onClick={() => {
                    onCreate()
                    setOpen(false)
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {createLabel ?? 'Create new'}
                </button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
