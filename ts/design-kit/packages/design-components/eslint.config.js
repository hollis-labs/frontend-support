import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * THE DESIGN RULES APPLY HERE AND ARE ENFORCED AT ZERO, by the repo gate
 * (.github/scripts/design-rules-gate.mjs) rather than repeated in this file. This
 * package is on the gate's BLOCKING list; if it cannot come out clean, the CW-0116
 * classification was wrong and that is a finding, not a config change.
 *
 * The exemption below is INHERITED VERBATIM from kit-dashboard's config and is
 * deliberately not widened. It exists for one pattern: the vendored shadcn
 * primitives co-export their variant helpers (`buttonVariants`, `badgeVariants`)
 * alongside the component, and the registry keeps producing that shape, so
 * fighting it means rewriting every component on arrival, forever.
 *
 * IT DOES NOT COVER PLAIN UTILITIES. `json-payload.tsx` co-exported
 * `safeParseObject` and `scalarStr` — the last two lint errors in the repo — and
 * the fix was to move them to `lib/`, not to widen this glob. A component module
 * is the wrong home for a parser regardless of what the rule says, and widening
 * the exemption would have hidden that rather than answered it.
 */
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Vendored shadcn/ui primitives intentionally co-export variant helpers
    // (buttonVariants, badgeVariants, …) alongside their components.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
