import { useTheme } from '@hollis-labs/design-app-runtime'
import { ModeToggle, ThemePicker } from '@hollis-labs/design-components'
import { BUILTIN_THEMES } from '@hollis-labs/design-tokens'
import { appearance } from './appearance'



export function ThemeControls() {
  const state = useTheme(appearance)
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border bg-bg-elevated px-4 py-2">
      <ThemePicker themes={BUILTIN_THEMES} theme={state.theme} onThemeChange={state.setTheme} />
      <ModeToggle mode={state.mode} resolvedMode={state.resolvedMode} onModeChange={state.setMode} />
    </div>
  )
}
