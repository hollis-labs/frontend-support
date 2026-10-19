import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'

export interface ModeToggleProps {
  mode: 'light' | 'dark' | 'system'
  resolvedMode: 'light' | 'dark'
  onModeChange: (mode: 'light' | 'dark' | 'system') => void
  className?: string
}

/** Controlled appearance switch. The host owns preferences and persistence. */
export function ModeToggle({ mode, resolvedMode, onModeChange, className }: ModeToggleProps) {
  const next = resolvedMode === 'light' ? 'dark' : 'light'
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => onModeChange(next)} aria-label={`Switch to ${next} mode`}>
          {resolvedMode === 'dark' ? <Moon aria-hidden /> : <Sun aria-hidden />}
          {resolvedMode === 'dark' ? 'Dark' : 'Light'}{mode === 'system' ? ' (system)' : ''}
        </Button>
        <Button variant="ghost" disabled={mode === 'system'} onClick={() => onModeChange('system')}>
          Use system
        </Button>
      </div>
    </div>
  )
}
