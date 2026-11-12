/**
 * The acceptance test that matters: run the rules over real source, not fixtures.
 *
 * A rule that lights up Tether, Tesseract or Nanite's chat directory has a
 * false-positive problem, and shipping it would teach people to disable it. The
 * expected numbers come from CW-0117's task text and were re-measured 2026-09-11.
 *
 * Read-only. ESLint is invoked without --fix; nothing outside design-kit is
 * written, and libs/sysop-ui is not touched at all.
 */
import { ESLint } from 'eslint'
import { readFileSync } from 'node:fs'
import { vocabularyFrom } from '../src/vocabulary.js'
import * as kitFixture from '../test/vocabulary.kit.fixture.js'
import { plugin, DEFAULT_THEME_FILES } from '../src/index.js'

const ROOT = process.env.PORTFOLIO_ROOT ?? process.cwd()
const voc = vocabularyFrom(kitFixture, 'kit-fixture')
const invert = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [String(v), k]))

const config = [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: await import('typescript-eslint').then((m) => m.parser),
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { design: plugin },
    rules: {
      'design/no-color-literal': 'error',
      'design/no-raw-palette-utility': 'error',
      'design/no-arbitrary-scale': ['error', {
        text: invert(voc.textScale), radius: invert(voc.radiusScale), tracking: invert(voc.trackingScale),
      }],
      'design/no-undefined-token': ['error', { tokens: [...voc.colors], families: [...voc.families], deprecated: voc.deprecated }],
      'design/no-idiom-shadowing-contract': ['error', { idioms: voc.idioms, contract: [...voc.colors] }],
    },
  },
  { files: DEFAULT_THEME_FILES, rules: { 'design/no-color-literal': 'off', 'design/no-raw-palette-utility': 'off' } },
]

const TARGETS = [
  { name: 'kit-dashboard src', glob: 'libs/design-kit/packages/kit-dashboard/src' },
  { name: 'nanite chat', glob: 'apps/nanite/ui/src/components/chat' },
  { name: 'nanite lib/theme (EXEMPT)', glob: 'apps/nanite/ui/src/lib/theme' },
  { name: 'tangent', glob: 'apps/tangent/ui/src' },
  { name: 'tesseract', glob: 'apps/tesseract/frontend/src' },
  { name: 'tether (reference)', glob: 'apps/tether/apps/sysop/frontend/src' },
  { name: 'hadron', glob: 'apps/hadron/cmd/hadron-app/frontend/src' },
]

const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: config, ignore: false, errorOnUnmatchedPattern: false })

const RULES = [
  'design/no-color-literal', 'design/no-raw-palette-utility',
  'design/no-arbitrary-scale', 'design/no-undefined-token',
  'design/no-idiom-shadowing-contract',
]

console.log('rule counts per tree — measured', new Date().toISOString().slice(0, 16) + 'Z\n')
const head = ['tree'.padEnd(28), ...RULES.map((r) => r.replace('design/no-', '').padStart(14)), 'files'.padStart(7), 'lines'.padStart(8)]
console.log(head.join(' '))
console.log('-'.repeat(head.join(' ').length))

for (const t of TARGETS) {
  const results = await eslint.lintFiles([`${ROOT}/${t.glob}/**/*.{ts,tsx}`])
  const counts = Object.fromEntries(RULES.map((r) => [r, 0]))
  let lines = 0
  let parseErrors = 0
  for (const r of results) {
    // r.source is only populated for files that HAVE messages, so counting it
    // undercounts every clean file and makes the density figures meaningless.
    lines += readFileSync(r.filePath, 'utf8').split('\n').length
    for (const m of r.messages) {
      if (m.fatal || m.ruleId === null) { parseErrors++; continue }
      if (counts[m.ruleId] !== undefined) counts[m.ruleId]++
    }
  }
  const row = [t.name.padEnd(28), ...RULES.map((r) => String(counts[r]).padStart(14)),
    String(results.length).padStart(7), String(lines).padStart(8)]
  console.log(row.join(' ') + (parseErrors ? `  (${parseErrors} parse errors)` : ''))
}

// The scale comparison the lead flagged: density per 100 lines, so file-count
// differences do not distort it.
console.log('\nscale density, errors per 100 lines (the comparison that was flagged):')
for (const t of [TARGETS[0], TARGETS[1]]) {
  const results = await eslint.lintFiles([`${ROOT}/${t.glob}/**/*.{ts,tsx}`])
  let lines = 0, scale = 0
  for (const r of results) {
    lines += readFileSync(r.filePath, 'utf8').split('\n').length
    scale += r.messages.filter((m) => m.ruleId === 'design/no-arbitrary-scale').length
  }
  console.log(`  ${t.name.padEnd(28)} ${scale} in ${lines} lines = ${(scale * 100 / lines).toFixed(1)}/100`)
}
