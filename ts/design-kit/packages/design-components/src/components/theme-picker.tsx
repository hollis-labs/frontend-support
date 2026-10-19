import { useId } from 'react'
import { cn } from '../lib/utils'

export interface ThemePickerProps {
  theme: string
  themes: readonly { id: string; name: string }[]
  onThemeChange: (theme: string) => void
  className?: string
}

/** Native select keeps keyboard and screen-reader behavior without a provider. */
export function ThemePicker({ theme, themes, onThemeChange, className }: ThemePickerProps) {
  const id = useId()
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={id} className="text-sm text-fg-secondary">Theme</label>
      <select id={id} value={theme} onChange={(event) => onThemeChange(event.target.value)}
        className="h-8 rounded-control border border-border bg-bg-elevated px-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {themes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </div>
  )
}
