import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { designConfig } from '@hollis-labs/eslint-config-design'

/**
 * THE DESIGN RULES APPLY HERE AND ARE ENFORCED AT ZERO, at severity `error`, by
 * `designConfig` at the bottom of this file. (The old repo gate,
 * design-rules-gate.mjs, was not carried over.) `kit-chat` has been at zero from
 * its first commit — not baselined, and there is no exemption file to add anything to.
 *
 * NO `src/components/ui/**` EXEMPTION HERE, deliberately, unlike design-components
 * and kit-dashboard. That exemption exists for vendored shadcn primitives that
 * co-export variant helpers, and this package vendors none — it composes the ones
 * `@hollis-labs/design-components` already exports. If a file here ever needs it,
 * that is a signal the file belongs in design-components instead, and the exemption
 * would hide the question rather than answer it.
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
  ...(await designConfig({ severity: 'error' })),
])
