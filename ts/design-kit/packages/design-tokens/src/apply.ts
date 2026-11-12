import { COLOR_TOKENS, VALUE_PREFIX } from './tokens.js'
import type { Theme, ThemeMode, TokenValues } from './theme.js'

/**
 * THE OPTIONAL RUNTIME LAYER — and optional is the whole point.
 *
 * Nothing in this file is needed to use the package. Import the CSS and you have
 * ten themes that swap by attribute with zero JavaScript, which is sysop-ui's
 * property and the one that makes first paint correct. This exists for the two
 * things CSS alone cannot do, both of which Nanite already proved are worth
 * having:
 *
 *   · A USER-AUTHORED theme, which by definition is not in the stylesheet.
 *   · A LIVE theme editor, which needs to write values as they change.
 *
 * The shape is Nanite's `apply.ts`, with the prefix renamed and the mode model
 * generalised. It writes ONE `<style>` element and overrides only the value
 * layer, so the contract layer and every utility keep working untouched.
 *
 * No React, no framework, no dependency. Every function is a no-op outside a
 * browser rather than a crash, because a tokens package is imported during SSR
 * and during tests and should not care.
 */

const STYLE_ID = 'hollis-labs-theme-override'

const hasDom = (): boolean => typeof document !== 'undefined'

function serialize(values: TokenValues, indent = '  '): string {
  // Iterate COLOR_TOKENS, not Object.keys — so the output order is the
  // contract's order and an override never carries a key the contract dropped.
  return COLOR_TOKENS.map((t) => `${indent}--${VALUE_PREFIX}-${t}: ${values[t]};`).join('\n')
}

/**
 * The CSS an override for `theme` would be. Pure — no DOM, so a build step or a
 * server render can call it.
 *
 * Scoped to `[data-theme="<id>"]` rather than `:root` so an applied theme
 * composes with the built-ins instead of fighting them. Set the attribute to the
 * theme's id and it takes effect; unset it and you are back on the default.
 */
export function themeCss(theme: Theme): string {
  const out: string[] = []
  out.push(`[data-theme="${theme.id}"] {`)
  out.push(serialize(theme.tokens.dark))
  out.push('}')
  if (theme.tokens.light) {
    out.push(`[data-theme="${theme.id}"][data-mode="light"],`)
    out.push(`[data-theme="${theme.id}"].light {`)
    out.push(serialize(theme.tokens.light))
    out.push('}')
  }
  return out.join('\n') + '\n'
}

/**
 * Install `theme` as a live override and select it.
 *
 * Replaces any previous override — one `<style>` element, not a growing pile.
 */
export function applyTheme(theme: Theme, mode?: ThemeMode): void {
  if (!hasDom()) return
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = themeCss(theme)
  setTheme(theme.id)
  if (mode) setMode(mode)
}

export function clearThemeOverride(): void {
  if (!hasDom()) return
  document.getElementById(STYLE_ID)?.remove()
}

/** Select a theme by id. `null` falls back to the package default at `:root`. */
export function setTheme(id: string | null): void {
  if (!hasDom()) return
  const root = document.documentElement
  if (id === null) root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', id)
}

/**
 * Select dark or light.
 *
 * Writes `data-mode` AND toggles the `light` class, because Nanite's stylesheet
 * and its `@custom-variant` key off the class and its adoption should not have
 * to be a flag day. Both spellings are in the generated selectors.
 */
export function setMode(mode: ThemeMode): void {
  if (!hasDom()) return
  const root = document.documentElement
  root.setAttribute('data-mode', mode)
  root.classList.toggle('light', mode === 'light')
  root.classList.toggle('dark', mode === 'dark')
  root.style.colorScheme = mode
}

export function currentTheme(): string | null {
  return hasDom() ? document.documentElement.getAttribute('data-theme') : null
}

export function currentMode(): ThemeMode {
  if (!hasDom()) return 'dark'
  const root = document.documentElement
  return root.getAttribute('data-mode') === 'light' || root.classList.contains('light')
    ? 'light'
    : 'dark'
}

/**
 * Read a token's COMPUTED value off the DOM.
 *
 * The escape hatch for a charting library, which needs a real colour string and
 * cannot be handed `var(--hl-chart-1)`. Reads the value layer directly, so it
 * reflects whatever theme is live — including a runtime override.
 *
 * Returns '' outside a browser, and '' for a token the current stylesheet does
 * not define. A chart config should check, because
 * `PLACEHOLDER_CHART_COLOR` is what it will get for `chart-*` until the palette
 * has been designed.
 */
export function readToken(token: (typeof COLOR_TOKENS)[number], el?: Element): string {
  if (!hasDom()) return ''
  const target = el ?? document.documentElement
  return getComputedStyle(target).getPropertyValue(`--${VALUE_PREFIX}-${token}`).trim()
}
