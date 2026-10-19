/**
 * Triage tool: run ONE rule over one tree and tally what it actually reported.
 *
 * The counts a gate prints are useless for judging a rule — "106 errors" could be
 * 106 real findings or one bug repeated. This groups by the offending name so the
 * shape is visible, which is how the two false-positive classes in this package
 * were found.
 *
 *   node scripts/explain.mjs design/no-undefined-token apps/tesseract/frontend/src
 */
import { ESLint } from 'eslint'
import { vocabularyFrom } from '../src/vocabulary.js'
import * as kitFixture from '../test/vocabulary.kit.fixture.js'
import { plugin } from '../src/index.js'

const ROOT = process.env.PORTFOLIO_ROOT ?? process.cwd()
const voc = vocabularyFrom(kitFixture, 'kit')
const invert = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [String(v), k]))
const [rule, target] = process.argv.slice(2)
if (!rule || !target) {
  console.error('usage: node scripts/explain.mjs <design/rule-name> <path-relative-to-portfolio-root>')
  process.exit(2)
}

const OPTIONS = {
  'design/no-undefined-token': { tokens: [...voc.colors], families: [...voc.families] },
  'design/no-arbitrary-scale': { text: invert(voc.textScale), radius: invert(voc.radiusScale), tracking: invert(voc.trackingScale) },
  'design/no-idiom-shadowing-contract': { idioms: voc.idioms, contract: [...voc.colors] },
}

const eslint = new ESLint({
  cwd: ROOT, ignore: false, overrideConfigFile: true,
  // ESLint THROWS AllFilesIgnoredError when a glob matches only ignored files —
  // which now happens for any package whose ts files all live under dist/. A gate
  // that crashes instead of reporting zero is worse than one that misses.
  errorOnUnmatchedPattern: false,
  overrideConfig: [{
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest', sourceType: 'module',
      parser: await import('typescript-eslint').then((m) => m.parser),
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { design: plugin },
    rules: { [rule]: OPTIONS[rule] ? ['error', OPTIONS[rule]] : 'error' },
  }],
})

const results = await eslint.lintFiles([`${ROOT}/${target}/**/*.{ts,tsx}`])
const tally = new Map()
const examples = new Map()
let total = 0
for (const r of results) {
  for (const m of r.messages) {
    if (m.ruleId !== rule) continue
    total++
    const key = /"([^"]+)"/.exec(m.message)?.[1] ?? m.message
    tally.set(key, (tally.get(key) ?? 0) + 1)
    if (!examples.has(key)) examples.set(key, `${r.filePath.replace(ROOT + '/', '')}:${m.line}`)
  }
}
console.log(`${rule} over ${target}: ${total} reports, ${tally.size} distinct\n`)
for (const [k, v] of [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
  console.log(`${String(v).padStart(5)}  ${k.padEnd(34)} ${examples.get(k)}`)
}
