# @hollis-labs/design-app-runtime

## Unreleased — CW-20261010-0072

- Commit-scoped source/store/viewport/layer leases reject retired callbacks even after ID reuse and unmount. Hook spread props carry explicit trigger/fallback admission; closing focus is owned by the underlying Sheet. Temporary overlays reset on source or viewport transitions without persisting them.

- Add headless `createAppShellAsideStore` and `useAppShellAside` hook for `AppShell` aside preference management.
- Persists aside width (`compact`, `regular`, `wide`) and collapsed state under `ops-shell:aside:v1` with `appNamespace` isolation via `createScopedStorage`.
- In-memory only overlay open state for narrow screens below 1024px, preserving desktop state across breakpoint changes.
- Safe focus return management on overlay close and narrow transitions.
- SSR-safe via `useSyncExternalStore` media query subscription.

## 0.5.0 — 2026-10-10

Add controlled AppShell aside state, persisted preference validation and source/activation admission. Upgrade the six core packages together; ^0.4.0 excludes this minor.


## Unreleased — CW-20261010-0072

- Commit-scoped source/store/viewport/layer leases reject retired callbacks even after ID reuse and unmount. Hook spread props carry explicit trigger/fallback admission; closing focus is owned by the underlying Sheet. Temporary overlays reset on source or viewport transitions without persisting them.

- Add headless `createAppShellAsideStore` and `useAppShellAside` hook for `AppShell` aside preference management.
- Persists aside width (`compact`, `regular`, `wide`) and collapsed state under `ops-shell:aside:v1` with `appNamespace` isolation via `createScopedStorage`.
- In-memory only overlay open state for narrow screens below 1024px, preserving desktop state across breakpoint changes.
- Safe focus return management on overlay close and narrow transitions.
- SSR-safe via `useSyncExternalStore` media query subscription.

## 0.4.0 — 2026-10-02 — version alignment, no code change

Co-released with the other core packages. No source or behavior change.

## 0.3.0 — 2026-10-02 — version alignment, no code change

Released with the other core packages so that one number selects a compatible set.
No source or behaviour changed; the published files differ from 0.2.0 only in `package.json`
and this changelog.

## 0.2.0 — 2026-10-01

Co-released with design-tokens, design-components, eslint-config-design, kit-chat and
kit-dashboard.

**Headless appearance preferences (CW-20261001-0498).** New `createThemeStore` and
`useTheme`, with the `ColorMode`, `ModePreference`, `ThemeState`, `ThemeStore` and
`ThemeStoreOptions` types. The store keeps a theme id and a mode preference (`light`,
`dark` or `system`) outside React and exposes it through `useSyncExternalStore`:

- `createThemeStore({ defaultTheme, themes, storageKey })` validates persisted ids
  against `themes`; the default storage key is `hollis.appearance`. Call
  `initialize()` before `createRoot` so the first paint is already in the right mode.
- It writes `data-theme`, `data-mode`, the `.light` / `.dark` class and `color-scheme`
  on `<html>`, leaving unrelated root classes alone.
- `system` follows `prefers-color-scheme`, and preferences sync across tabs.
- Storage that is blocked or malformed falls back to the configured theme and system
  mode; live switching keeps working. Server snapshots are SSR-safe.
- `useTheme(store)` returns `{ theme, mode, resolvedMode, setTheme, setMode }`.

It holds no palette values and no component dependency: the values stay in
design-tokens and the controls in design-components (`ModeToggle`, `ThemePicker`). See
`docs/appearance.md` in the repository for the adoption steps. The theme-only helpers in
design-tokens (`readStoredTheme`, `persistTheme`) are a different, string-only store for
consumers that keep a bare theme id.

**Packaging (CW-20260912-0097).** `tailwindcss: ^4.0.0` is declared as an optional peer.
npm does not auto-install it or warn when it is missing; an incompatible installed major
fails peer resolution. JavaScript-only consumers can continue without Tailwind.

## 0.1.0 — 2026-09-11

First release, alongside the five other packages in this repo. The set shares a
version number; the release record for all of it is the repo's
[`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

**App runtime with no opinion about appearance** — API client, polling and SSE hooks,
scoped storage, list cursors, formatters. Zero runtime dependencies, zero class
strings, and the design rules are enforced against it precisely so it stays that way.

Fixed during extraction: `createApiClient` used `window.location.origin` as a parsing
base and therefore **threw off-browser** — in a test environment or during SSR. The
`shell-reset.css` subpath carries only the document-shell lock; scrollbar suppression
and focus-ring taste were deliberately left to the kits.
