#!/usr/bin/env node
/**
 * biome-check — design-rule enforcement for Biome (non-ESLint) consumers.
 *
 * A Biome consumer does not have an eslint.config.js, so the standard ratchet
 * command needs an extra flag (--no-config). This script is a thin wrapper that
 * sets that flag and adds defaults appropriate for a Biome project.
 *
 * USAGE
 *
 *   node scripts/biome-check.mjs [options] <path>
 *
 * All options are forwarded to scripts/ratchet.mjs with --no-config pre-set.
 * See docs/biome-consumers.md for the full adoption guide.
 *
 * COMMON OPTIONS
 *
 *   <path>              Source path to lint (relative to repo root).
 *   --update            Record a new baseline and exit 0.
 *   --baseline <file>   Baseline file. Default: .eslint-design-baseline.json.
 *   --root <dir>        Repo root. Default: cwd.
 *   --quiet             One-line summary only.
 *   --json              Machine-readable JSON output.
 *   --severity warn|error  Rule severity. Default: error.
 *
 * EXIT CODES
 *
 *   0  No new violations (or --update succeeded).
 *   1  Ratchet failed — violations increased.
 *   2  Configuration or environment error.
 *
 * EXAMPLES
 *
 *   # First-time setup: record the baseline
 *   node node_modules/@hollis-labs/eslint-config-design/scripts/biome-check.mjs \
 *     --update --note "initial baseline" src
 *
 *   # CI check (add to package.json scripts or GitHub Actions):
 *   node node_modules/@hollis-labs/eslint-config-design/scripts/biome-check.mjs src
 *
 * WHY THIS EXISTS
 *
 *   Biome's GritQL custom rules cannot inject a dynamic vocabulary from
 *   @hollis-labs/design-tokens at runtime. The no-undefined-token and
 *   no-raw-palette-utility rules are only correct when they know the current
 *   token list; a hardcoded GritQL pattern drifts from the contract.
 *
 *   This script runs the ESLint-based design rules in isolation — one
 *   devDependency (eslint) that never touches the consumer's own config.
 *   See docs/biome-consumers.md for the full rationale.
 */

import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ratchet = resolve(__dirname, 'ratchet.mjs')

// Prepend --no-config so the consumer never needs to know about it.
// ratchet.mjs parses flags anywhere in argv, so position does not matter.
const args = ['--no-config', ...process.argv.slice(2)]

const child = spawn(process.execPath, [ratchet, ...args], {
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 2))
