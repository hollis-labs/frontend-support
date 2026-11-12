import { createThemeStore } from '@hollis-labs/design-app-runtime'
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from '@hollis-labs/design-tokens'

export const appearance = createThemeStore({
  defaultTheme: DEFAULT_THEME_ID,
  themes: BUILTIN_THEMES.map((theme) => theme.id),
  storageKey: 'design-kit.demo.appearance',
})
