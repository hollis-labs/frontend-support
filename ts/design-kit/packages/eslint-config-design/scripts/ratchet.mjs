#!/usr/bin/env node
/**
 * eslint-design ratchet — standalone CLI
 *
 * Runs the design rules over a source tree, compares the violation counts
 * against a stored baseline, and either passes or fails CI.
 *
 * USAGE
 *
 *   node scripts/ratchet.mjs [options] <path>
 *   node scripts/ratchet.mjs --update [options] <path>
 *
 * OPTIONS
 *
 *   <path>                Path (or glob) to lint, relative to --root.
 *   --root <dir>          Repository root. Default: process.cwd().
 *   --baseline <file>     Baseline JSON file. Default: <root>/.eslint-design-baseline.json.
 *   --update              Write a new baseline from the current counts and exit 0.
 *   --note <text>         Human note stored in the baseline when --update is given.
 *   --config <file>       ESLint config file to use. Defaults to the repo's own eslint.config.js.
 *   --no-config           Run with only the design rules and a minimal TS parser config.
 *   --idiom-manifest <file> Enroll kit-owned JSON metadata (repeatable; --no-config).
 *   --severity warn|error Rule severity when --no-config is used. Default: error.
 *   --rules <r,r,...>     Comma-separated ruleIds to count. Default: all design/* rules.
 *   --colors              Force ANSI color output. Default: auto-detect.
 *   --no-colors           Suppress ANSI color output.
 *   --quiet               Only print the summary line, not the table.
 *   --json                Output machine-readable JSON instead of the report.
 *
 * EXIT CODES
 *
 *   0  Ratchet holds (no new violations) or --update succeeded.
 *   1  Ratchet failed (violations increased).
 *   2  Usage or configuration error.
 *
 * EXAMPLES
 *
 *   # Record the first baseline for an app:
 *   node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs \
 *     --update --note "initial baseline" src
 *
 *   # CI check (passes if no new violations):
 *   node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs src
 *
 *   # Verify against Tangent's source (read-only, no config file needed):
 *   node scripts/ratchet.mjs --no-config \
 *     --root /path/to/hollis-labs \
 *     --baseline /tmp/tangent-baseline.json \
 *     apps/tangent/ui/src
 *
 * INTEGRATING INTO package.json scripts
 *
 *   "scripts": {
 *     "lint:ratchet": "node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs src"
 *   }
 *
 * CI WORKFLOW
 *
 *   On every PR: run without --update (fails on regression).
 *   When cleaning up violations: commit the reduced baseline alongside the fix.
 *   To accept debt: run --update and commit the new baseline with an explanation.
 *
 * BIOME CONSUMERS (CW-20260913-0031)
 *
 *   This script uses ESLint directly. Biome does not support custom plugins, so
 *   running the design rules under Biome is not yet possible. CW-20260913-0031
 *   is the separate decision task for that path. A Biome consumer can still use
 *   this script alongside Biome for the design-specific rules.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join, isAbsolute } from 'node:path'
import { ESLint } from 'eslint'
import {
  DESIGN_RULES,
  countByRule,
  buildBaseline,
  serializeBaseline,
  parseBaseline,
  compare,
  formatReport,
} from '../src/ratchet.js'
import { plugin, DEFAULT_THEME_FILES, designConfig } from '../src/index.js'
import { resolveVocabulary } from '../src/vocabulary.js'

// ─── Argument parsing ─────────────────────────────────────────────────────────

const argv = process.argv.slice(2)

function flag(name) {
  const i = argv.indexOf(name)
  if (i === -1) return false
  argv.splice(i, 1)
  return true
}

function option(name, defaultValue) {
  const i = argv.indexOf(name)
  if (i === -1) return defaultValue
  const val = argv[i + 1]
  if (val === undefined || val.startsWith('--')) {
    console.error(`error: ${name} requires a value`)
    process.exit(2)
  }
  argv.splice(i, 2)
  return val
}

const doUpdate = flag('--update')
const noConfig = flag('--no-config')
const quiet = flag('--quiet')
const jsonOutput = flag('--json')
let colors = process.stdout.isTTY // auto
if (flag('--colors')) colors = true
if (flag('--no-colors')) colors = false

const root = resolve(option('--root', process.cwd()))
const baselinePath = option('--baseline', join(root, '.eslint-design-baseline.json'))
const configFile = option('--config', null)
const note = option('--note', undefined)
const severityOpt = option('--severity', 'error')
const rulesOpt = option('--rules', null)
const idiomManifests = []
while (argv.includes('--idiom-manifest')) {
  idiomManifests.push(resolve(root, option('--idiom-manifest')))
}
if (idiomManifests.length && !noConfig) {
  console.error('error: --idiom-manifest requires --no-config; otherwise enroll in designConfig')
  process.exit(2)
}

const extraArgs = argv.filter((a) => !a.startsWith('--'))
const target = extraArgs[0]

if (!target) {
  console.error('usage: ratchet.mjs [options] <path>')
  process.exit(2)
}

if (!['error', 'warn'].includes(severityOpt)) {
  console.error(`error: --severity must be "error" or "warn", got "${severityOpt}"`)
  process.exit(2)
}

const rules = rulesOpt ? rulesOpt.split(',').map((r) => r.trim()) : DESIGN_RULES

// ─── Build ESLint instance ────────────────────────────────────────────────────

let eslint
if (noConfig) {
  // Minimal config: just the design rules with a TS parser, using the
  // kit-fixture vocabulary so the ratchet works without a design-tokens install.
  // For production use, pass --config pointing at the real eslint.config.js.
  const vocabulary = await resolveVocabulary().catch(() => null)
  const invert = (s) => Object.fromEntries(
    Object.entries(s ?? {}).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => [String(v), k]),
  )

  const tsParser = await import('typescript-eslint').then((m) => m.parser).catch(() => null)
  if (!tsParser) {
    console.error(
      'error: --no-config requires typescript-eslint to parse .ts/.tsx files,\n' +
      '       but it could not be imported. Install it as a devDependency:\n' +
      '         npm install --save-dev typescript-eslint\n' +
      '       or pass --config to use your own eslint.config.js instead.',
    )
    process.exit(2)
  }
  const langOpts = {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  }

  const rulesCfg = {}
  if (rules.includes('design/no-color-literal')) rulesCfg['design/no-color-literal'] = severityOpt
  if (rules.includes('design/no-raw-palette-utility')) rulesCfg['design/no-raw-palette-utility'] = severityOpt
  if (rules.includes('design/no-arbitrary-scale')) {
    rulesCfg['design/no-arbitrary-scale'] = [severityOpt, vocabulary ? {
      text: invert(vocabulary.textScale),
      radius: invert(vocabulary.radiusScale),
      tracking: invert(vocabulary.trackingScale),
    } : {}]
  }
  if (rules.includes('design/no-undefined-token') && vocabulary) {
    rulesCfg['design/no-undefined-token'] = [severityOpt, {
      tokens: [...vocabulary.colors],
      families: [...vocabulary.families],
      extraFamilies: [...vocabulary.idioms],
      deprecated: vocabulary.deprecated ?? {},
    }]
  }
  if (rules.includes('design/no-idiom-shadowing-contract') && vocabulary) {
    rulesCfg['design/no-idiom-shadowing-contract'] = [severityOpt, {
      idioms: vocabulary.idioms,
      contract: [...vocabulary.colors],
    }]
  }
  if (rules.includes('design/require-disable-reason')) {
    rulesCfg['design/require-disable-reason'] = severityOpt
  }

  let overrideConfig = [
    {
      ignores: ['**/dist/**', '**/build/**', '**/*.d.ts', '**/coverage/**'],
    },
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      languageOptions: langOpts,
      plugins: { design: plugin },
      rules: rulesCfg,
    },
    {
      files: DEFAULT_THEME_FILES,
      rules: {
        'design/no-color-literal': 'off',
        'design/no-raw-palette-utility': 'off',
      },
    },
  ]

  if (vocabulary) {
    // Use the same registration path as ESLint consumers and the repository gate.
    // Explicit opt-in avoids crawling node_modules or changing a consumer's scope.
    try {
      overrideConfig = (await designConfig({ vocabulary, idiomManifests, severity: severityOpt }))
        .map((config) => ({
          ...config,
          ...(config.plugins ? { languageOptions: langOpts } : {}),
          ...(config.rules ? { rules: Object.fromEntries(
            Object.entries(config.rules).filter(([rule]) => rules.includes(rule)),
          ) } : {}),
        }))
    } catch (err) {
      console.error(`error: ${err.message}`)
      process.exit(2)
    }
  } else if (idiomManifests.length) {
    console.error('error: idiom registration requires the base token vocabulary')
    process.exit(2)
  }

  eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig,
    errorOnUnmatchedPattern: false,
  })
} else {
  const opts = {
    cwd: root,
    errorOnUnmatchedPattern: false,
  }
  if (configFile) opts.overrideConfigFile = resolve(configFile)
  eslint = new ESLint(opts)
}

// ─── Run lint ─────────────────────────────────────────────────────────────────

const targetPath = isAbsolute(target) ? target : join(root, target)

let results
try {
  results = await eslint.lintFiles([targetPath])
} catch (err) {
  console.error('eslint error:', err.message)
  process.exit(2)
}

// ─── Fail-closed guards ───────────────────────────────────────────────────────
// Both guards apply before --update, so a misconfigured run cannot silently
// record a baseline of zeros or a fake "improvement".

// Guard 1: at least one file must have been linted. An empty result set means
// the path doesn't exist, the cwd is wrong, or every file was ignored. All
// three are configuration errors, not a clean run.
const filesLinted = results.length
if (filesLinted === 0) {
  console.error(
    `error: no files were linted for path "${targetPath}".\n` +
    '       Check that the path exists relative to --root, that cwd is correct,\n' +
    '       and that your ESLint config is not ignoring everything under it.',
  )
  process.exit(2)
}

// Guard 2: any file with a fatal/parse error must stop the ratchet. Silently
// counting such files as zero violations is the fail-open bug — a wrong path
// that matches nothing, or a file ESLint can't parse, produces all-zero counts
// that compare favourably against any baseline.
const parseErrorFiles = results.filter((r) => r.messages.some((m) => m.fatal || m.ruleId === null))
if (parseErrorFiles.length > 0) {
  const listed = parseErrorFiles.slice(0, 5).map((r) => {
    const msg = r.messages.find((m) => m.fatal || m.ruleId === null)
    return `  ${r.filePath.replace(root + '/', '')}: ${msg?.message ?? 'parse error'}`
  })
  const extra = parseErrorFiles.length > 5 ? `\n  … and ${parseErrorFiles.length - 5} more` : ''
  console.error(
    `error: ${parseErrorFiles.length} file(s) could not be parsed:\n` +
    listed.join('\n') + extra + '\n' +
    '       Fix the parse errors, or add ESLint ignores for generated files.',
  )
  process.exit(2)
}

const current = countByRule(results, rules)

// ─── Read baseline ────────────────────────────────────────────────────────────

let baselineData = null
try {
  const raw = readFileSync(baselinePath, 'utf8')
  baselineData = parseBaseline(raw)
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.error(`error reading baseline ${baselinePath}: ${err.message}`)
    process.exit(2)
  }
  // ENOENT is fine: this is a first run.
}

// ─── Update mode ──────────────────────────────────────────────────────────────

if (doUpdate) {
  const baseline = buildBaseline(current, { note })
  const json = serializeBaseline(baseline)
  try {
    writeFileSync(baselinePath, json, 'utf8')
  } catch (err) {
    console.error(`error writing baseline ${baselinePath}: ${err.message}`)
    process.exit(2)
  }

  if (!quiet) {
    const label = target
    console.log(formatReport(
      compare(current, baseline),
      { colors, label },
    ))
    console.log(`  Baseline written to ${baselinePath}`)
  } else {
    const total = Object.values(current).reduce((s, n) => s + n, 0)
    console.log(`baseline updated — ${total} total violations recorded`)
  }
  process.exit(0)
}

// ─── Compare mode ─────────────────────────────────────────────────────────────

const result = compare(current, baselineData)

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.pass ? 0 : 1)
}

if (!quiet) {
  console.log(formatReport(result, { colors, label: target }))
} else {
  if (result.pass) {
    const improved = result.improvements.reduce((s, r) => s + Math.abs(result.delta[r]), 0)
    if (improved > 0) console.log(`ratchet: ok (+0 new, -${improved} fixed)`)
    else console.log('ratchet: ok')
  } else {
    const added = result.regressions.reduce((s, r) => s + result.delta[r], 0)
    console.log(`ratchet: FAIL (+${added} new violations)`)
  }
}

process.exit(result.pass ? 0 : 1)
