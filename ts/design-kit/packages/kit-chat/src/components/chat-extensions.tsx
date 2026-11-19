import type { ReactNode } from 'react'
import { Button, cn } from '@hollis-labs/design-components'

/** Host-owned context shown above the editor. Removing a chip changes host state. */
export interface ChatContextChip {
  readonly id: string
  readonly label: ReactNode
  readonly removeLabel: string
  readonly onRemove?: (id: string) => void
}

export function ChatContextChips({ chips, className }: { readonly chips: readonly ChatContextChip[]; readonly className?: string }) {
  if (chips.length === 0) return null
  return <div data-slot="chat-context-chips" aria-label="Message context" className={cn('flex flex-wrap gap-2', className)}>
    {chips.map((chip) => <span key={chip.id} className="inline-flex items-center gap-1 rounded-control border border-border px-2 py-1 text-caption text-fg-secondary">
      {chip.label}
      {chip.onRemove ? <Button type="button" variant="ghost" size="icon-sm" aria-label={chip.removeLabel} onClick={() => chip.onRemove?.(chip.id)}>×</Button> : null}
    </span>)}
  </div>
}

/** Host-owned references or attachments shared into this turn. */
export interface ChatSharedItem {
  readonly id: string
  readonly label: ReactNode
  readonly removeLabel: string
  readonly onRemove?: (id: string) => void
}

export function ChatSharedItemsStrip({ items, className }: { readonly items: readonly ChatSharedItem[]; readonly className?: string }) {
  if (items.length === 0) return null
  return <div data-slot="chat-shared-items" aria-label="Shared with message" className={cn('flex flex-wrap gap-2', className)}>
    {items.map((item) => <span key={item.id} className="inline-flex items-center gap-1 rounded-control bg-surface px-2 py-1 text-caption text-fg">
      {item.label}
      {item.onRemove ? <Button type="button" variant="ghost" size="icon-sm" aria-label={item.removeLabel} onClick={() => item.onRemove?.(item.id)}>×</Button> : null}
    </span>)}
  </div>
}

/** Toolbar buttons for app-owned drawers. No drawer state or panel is owned here. */
export interface ChatDrawerToggle {
  readonly id: string
  readonly label: string
  readonly open: boolean
  readonly disabled?: boolean
  readonly onToggle: (id: string, open: boolean) => void
}

export function ChatDrawerToggles({ drawers }: { readonly drawers: readonly ChatDrawerToggle[] }) {
  if (drawers.length === 0) return null
  return <div data-slot="chat-drawer-toggles" role="group" aria-label="Chat drawers" className="flex flex-wrap items-center gap-1">
    {drawers.map((drawer) => <Button key={drawer.id} type="button" variant={drawer.open ? 'secondary' : 'ghost'} size="sm" disabled={drawer.disabled} aria-pressed={drawer.open} onClick={() => drawer.onToggle(drawer.id, !drawer.open)}>{drawer.label}</Button>)}
  </div>
}

/** A host's choice of context slot. `id` is opaque to kit-chat. */
export interface ChatSlotOption {
  readonly id: string
  readonly label: string
  readonly disabled?: boolean
}

export function ChatSlotPicker({ options, value, onChange, label = 'Context slot' }: {
  readonly options: readonly ChatSlotOption[]
  readonly value: string
  readonly onChange: (id: string) => void
  readonly label?: string
}) {
  return <label data-slot="chat-slot-picker" className="inline-flex items-center gap-2 text-caption text-fg-muted">
    <span>{label}</span>
    <select aria-label={label} className="rounded-control border border-border bg-bg-elevated px-2 py-1 text-control text-fg" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.id} value={option.id} disabled={option.disabled}>{option.label}</option>)}
    </select>
  </label>
}
