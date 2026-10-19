import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * No `eslint-plugin-react-refresh` here, unlike kit-dashboard: this package ships
 * no components, so "a file should only export components" has nothing to say about
 * it, and enabling it would only produce noise.
 *
 * THE DESIGN RULES DO APPLY TO THIS PACKAGE, and they are enforced by the repo gate
 * (.github/scripts/design-rules-gate.mjs) rather than repeated here.
 *
 * That needs explaining, because the package holds no color, no scale and no
 * className — so the rules find nothing and, read naively, enrolling it is pointless.
 * The point is the opposite: enrolling it costs nothing TODAY and asserts that it
 * stays that way. The day someone adds a styled helper here, or reaches for
 * `text-[13px]` in a hook that grew a class string, the gate objects instead of the
 * boundary quietly eroding. A package whose whole value proposition is "adopt this
 * without taking any appearance" should have that property enforced, not documented.
 *
 * Measured 2026-09-11: 18 files, 0 design-rule findings, 0 files containing a
 * className. The gate asserts that rather than trusting it.
 */
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser },
  },
])
