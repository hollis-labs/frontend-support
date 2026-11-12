import { useId, useState } from 'react'
import { Button, Input } from '@hollis-labs/design-components'

export interface ScopeAdderProps {
  readonly onAdd: (scope: string) => boolean
  readonly disabled?: boolean
}

/** Free-text scope entry, because there is no catalogue to pick from. */
export function ScopeAdder({ onAdd, disabled = false }: ScopeAdderProps) {
  const id = useId()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const add = () => {
    const ok = onAdd(value)
    setInvalid(!ok)
    if (ok) setValue('')
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label text-fg-secondary">Add a scope</label>
      <div className="flex min-w-0 gap-2">
        <Input id={id} value={value} disabled={disabled} placeholder="app.read" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={invalid || undefined}
          aria-describedby={`${id}-hint`} onChange={(event) => { setValue(event.target.value); setInvalid(false) }}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add() } }} className="text-control md:text-control text-fg" />
        <Button type="button" variant="outline" size="sm" disabled={disabled || value.trim() === ''} onClick={add}>Add</Button>
      </div>
      <p id={`${id}-hint`} role={invalid ? 'alert' : undefined} className={invalid ? 'text-caption text-danger' : 'text-caption text-fg-muted'}>
        {invalid ? 'A scope has no spaces.' : 'You can only grant scopes you hold. Added scopes then appear in the list.'}
      </p>
    </div>
  )
}
