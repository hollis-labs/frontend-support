import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { designConfig } from '@hollis-labs/eslint-config-design'

/**
 * THE DESIGN RULES ARE APPLIED HERE, AT SEVERITY `error`, AND THIS FILE IS THE GATE.
 *
 * `kit-cards` enforces "name a token, never a value" itself rather than leaving it to
 * an aggregator script: `npm run lint` fails on `text-[13px]`, a hex literal, a raw
 * palette utility or an invented token name. Zero findings from the first commit — no
 * baseline, no exemption file, no `eslint-disable` for a design rule.
 *
 * The package claims NO idiom prefix: contract tokens only. A card that needs a token
 * the contract lacks proposes it (token-contract §9.3, a one-line change to
 * IDIOM_PREFIXES / the contract) rather than minting one locally.
 */
export default defineConfig([
  globalIgnores(['dist', 'e2e/.out']),
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
