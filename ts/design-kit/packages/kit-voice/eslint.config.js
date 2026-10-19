import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * THE DESIGN RULES APPLY HERE AND ARE ENFORCED AT ZERO by the repo gates
 * (.github/scripts/design-rules-gate.mjs and lint-gate.mjs), not repeated in this
 * file. kit-voice is on both BLOCKING lists from its first commit.
 *
 * No `src/components/ui/**` exemption, for the reason kit-chat has none: this
 * package vendors no shadcn primitive, it composes the ones design-components exports.
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
])
