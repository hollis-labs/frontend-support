import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

/**
 * The lint config for a contract package with no appearance and no React.
 *
 * SMALLER THAN design-app-runtime's ON PURPOSE, and the differences are the
 * interesting part rather than an oversight:
 *
 *   no `globals`                    — src/ is pure TypeScript. It touches no DOM, no
 *                                     `window`, no `process`; the tests import
 *                                     everything they use from `node:` explicitly.
 *                                     Declaring browser globals here would describe
 *                                     an environment this package does not run in.
 *   no `eslint-plugin-react-hooks`  — no React, by instruction and by design. The
 *                                     resolver answers which entry, which payload
 *                                     path, which trust; the host renders.
 *   no `eslint-plugin-react-refresh` — ships no components, so "a file should only
 *                                     export components" has nothing to say.
 *
 * THE DESIGN RULES ARE NOT REPEATED HERE. They are enforced across this package by
 * the repo gate (.github/scripts/design-rules-gate.mjs), which lints every blocking
 * package from the repo root with its own config — including `test/`, as this
 * package found out on its first run.
 *
 * Enrolling a package that holds no colour, no scale and no className reads as
 * pointless, and the point is the opposite: it costs nothing today and asserts that
 * it stays true. For THIS package the assertion is unusually load-bearing, because
 * "a binding names a component identity, never an appearance value" is the whole
 * contract. The row type is closed so a colour cannot be represented at all; this is
 * the second, independent layer, and it is the one that would object if someone ever
 * widened the type.
 */
export default defineConfig([
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023 },
  },
])
