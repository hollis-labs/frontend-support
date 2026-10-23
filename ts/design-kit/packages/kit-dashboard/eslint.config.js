import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { designConfig } from '@hollis-labs/eslint-config-design'

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
  // REPORT-ONLY, ON PURPOSE: 70 no-undefined-token findings (dash-status-* tokens the
  // contract does not know) are printed on every lint run but do not fail it. No count
  // is recorded anywhere; a gate asserts a property of the code, never a quantity.
  // CW-20261023-0033 fixes them and raises this to 'error' like the other packages.
  ...(await designConfig({ severity: 'warn' })),
])
