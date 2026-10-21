import { Combobox as Primitive } from '@base-ui/react/combobox'
import { useId, type Ref } from 'react'

export interface InputComboboxItem {
  id: string
  label: string
  description?: string
  keywords?: string[]
}

export interface InputComboboxProps {
  items: InputComboboxItem[]
  value: string | null
  onChange: (id: string | null) => void
  label: string
  placeholder?: string
  inputRef?: Ref<HTMLInputElement>
  disabled?: boolean
  loading?: boolean
}

/** Editable single-recipient field. Base UI owns filtering, keyboard and popup focus. */
export function InputCombobox({ items, value, onChange, label, placeholder, inputRef, disabled, loading }: InputComboboxProps) {
  const id = useId()
  return <Primitive.Root items={items} value={items.find(item => item.id === value) ?? null}
    onValueChange={item => onChange(item?.id ?? null)}
    onInputValueChange={(_, details) => { if (details.reason === 'input-change') onChange(null) }}
    itemToStringLabel={item => item.label} isItemEqualToValue={(a, b) => a.id === b.id}
    filter={(item, query) => query.toLocaleLowerCase().trim().split(/\s+/).every(term => [item.label, item.description ?? '', ...(item.keywords ?? [])].join(' ').toLocaleLowerCase().includes(term))}
    autoHighlight disabled={disabled}>
    <div className="flex items-center gap-3 border-b border-border py-2">
      <label htmlFor={id} className="shrink-0 font-mono text-label text-fg-muted">{label}</label>
      <Primitive.Input ref={inputRef} id={id} placeholder={placeholder} autoComplete="off" className="min-w-0 flex-1 bg-transparent py-1 text-control text-fg outline-none placeholder:text-fg-faint" />
    </div>
    <Primitive.Portal>
      <Primitive.Positioner sideOffset={4} align="start" className="z-[70] outline-none">
        <Primitive.Popup className="w-[var(--anchor-width)] min-w-64 max-w-[calc(100vw-var(--spacing)*8)] border border-border bg-popover text-popover-foreground shadow-lg outline-none">
          <Primitive.Empty className="px-3 py-3 text-control text-fg-muted">{loading ? 'Loading agents…' : 'No matching agents.'}</Primitive.Empty>
          <Primitive.List className="max-h-[min(15rem,var(--available-height))] overflow-y-auto overscroll-contain">
            {(item: InputComboboxItem) => <Primitive.Item key={item.id} value={item} className="grid cursor-default gap-1 border-b border-border/60 px-3 py-2 outline-none last:border-b-0 data-highlighted:bg-surface-hover">
              <span className="text-control font-medium text-fg">{item.label}</span>
              {item.description && <span className="truncate font-mono text-caption text-fg-muted">{item.description}</span>}
            </Primitive.Item>}
          </Primitive.List>
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  </Primitive.Root>
}
