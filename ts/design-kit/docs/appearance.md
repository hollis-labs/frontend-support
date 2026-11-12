# Theme and color mode

All ten built-in themes ship light and dark. Import the values and register the
component sources with Tailwind v4:

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";
@import "@hollis-labs/kit-chat/source.css"; /* when using chat */
```

Dashboard apps can use `@import "@hollis-labs/kit-dashboard/theme.css"` instead.
Its shared-theme bridge follows the active built-in palette. Legacy dashboard
palette ids remain supported; use the ids from `BUILTIN_THEMES` for mode switching.

Create one preference store outside React, then initialize before `createRoot`:

```tsx
import { createThemeStore, useTheme } from '@hollis-labs/design-app-runtime'
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from '@hollis-labs/design-tokens'
import { ModeToggle, ThemePicker } from '@hollis-labs/design-components'

const appearance = createThemeStore({
  defaultTheme: DEFAULT_THEME_ID,
  themes: BUILTIN_THEMES.map(theme => theme.id),
  storageKey: 'my-app.appearance',
})
appearance.initialize()

function AppearanceControls() {
  const { theme, mode, resolvedMode, setTheme, setMode } = useTheme(appearance)
  return <>
    <ThemePicker themes={BUILTIN_THEMES} theme={theme} onThemeChange={setTheme} />
    <ModeToggle mode={mode} resolvedMode={resolvedMode} onModeChange={setMode} />
  </>
}
```

Mount `AppearanceControls` in the app header or settings. `useTheme` subscribes to
system and cross-tab preference changes while mounted. The store writes
`data-theme`, `data-mode`, `.light`/`.dark`, and `color-scheme` on `<html>`.
Unrelated root classes are preserved. No app-specific palette overrides are needed.

The initial mode is `system` (`prefers-color-scheme`); an explicit toggle persists
light or dark. **Use system** returns to following the OS. Only theme id and mode
preference go to localStorage. Missing/malformed preferences fall back to the
configured theme and system mode. Storage failures leave live switching functional.

The runtime has no palette or component dependency; the components are controlled
and can be used with another store. `themes` constrains persisted ids to known
palettes. Call `initialize()` again after replacing preferences externally.

SSR imports are safe. The server snapshot is the default theme with system/light;
use hydration and supply matching server attributes if you render a themed shell.
Initializing before client-only React rendering avoids a React paint in the wrong
mode; an SSR app that needs a themed first document paint should bootstrap the
same preferences before its stylesheet/markup paints.

Run `npm run demo`, then open `/themes`, to review base, dashboard, and chat together.
Screenshots and measured verification are in [screenshots](./screenshots/README.md).
Tachyon verification is deferred to CW-20260918-0039 per the orchestrator's scope.
