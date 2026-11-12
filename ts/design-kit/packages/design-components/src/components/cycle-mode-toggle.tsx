import type { ComponentProps, ReactNode } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from './ui/button'
import { useCommittedShortcutFrame } from '../hooks/use-committed-shortcut-frame'

export interface CycleModeToggleProps extends Omit<ComponentProps<typeof Button>, 'onChange' | 'onClick' | 'children'> {
  modes: readonly { id: string; label: string; icon?: ReactNode }[]
  value: string
  onValueChange: (value: string) => void
  /** Caller owns long-press handlers and post-hold click suppression. No timer here. */
  onSecondaryAction?: () => void
}

export function CycleModeToggle({ modes, value, onValueChange, onSecondaryAction, disabled, ...props }: CycleModeToggleProps) {
  const live = useCommittedShortcutFrame()
  const position = modes.findIndex(mode => mode.id === value)
  const mode = modes[position]
  return <Button {...props} type="button" disabled={disabled || !mode || modes.length < 2}
    aria-label={props['aria-label'] ?? `Switch view mode (current: ${mode?.label ?? value})${onSecondaryAction ? '. Shift+F10 for settings.' : ''}`}
    onClick={event => { if (!event.defaultPrevented && live() && !disabled && mode && modes.length > 1) onValueChange(modes[(position + 1) % modes.length].id) }}
    onKeyDown={event => {
      if (!live()) return
      props.onKeyDown?.(event)
      if (live() && !disabled && onSecondaryAction && !event.defaultPrevented && !event.repeat && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229 && event.key === 'F10' && event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault(); event.stopPropagation(); onSecondaryAction()
      }
    }}>{mode?.icon}{mode?.label ?? value}</Button>
}

export interface SearchAddToggleProps extends Omit<ComponentProps<typeof Button>, 'onChange' | 'onClick' | 'children'> {
  value: 'search' | 'add'
  onValueChange: (value: 'search' | 'add') => void
}

export function SearchAddToggle({ value, onValueChange, disabled, ...props }: SearchAddToggleProps) {
  const live = useCommittedShortcutFrame()
  const label = value === 'search' ? 'Search mode (switch to Quick Add)' : 'Quick Add mode (switch to Search)'
  return <Button {...props} type="button" disabled={disabled} aria-label={label} title={label}
    onClick={() => { if (live() && !disabled) onValueChange(value === 'search' ? 'add' : 'search') }}>
    {value === 'search' ? <Search /> : <Plus />}
  </Button>
}
