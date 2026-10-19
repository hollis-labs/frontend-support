import { it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { ESLint } from 'eslint'
import { designConfig, loadIdiomManifest, vocabularyFrom } from '../src/index.js'

const vocabulary = vocabularyFrom({
  COLOR_TOKENS: ['bg', 'fg', 'primary'], IDIOM_PREFIXES: ['dash', 'chat'],
})

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'design-idiom-'))
  mkdirSync(join(root, 'kit'))
  const path = join(root, 'kit/idiom-tokens.json')
  writeFileSync(path, JSON.stringify({
    prefix: 'dash', stylesheet: './theme.css',
    tokens: {
      'dash-priority-p1-bg': 'var(--theme-color-priority-p1-bg)',
      'dash-priority-p2-bg': 'var(--theme-color-priority-p2-bg)',
    },
    deprecated: { 'priority-p1-bg': 'dash-priority-p1-bg' },
  }))
  writeFileSync(join(root, 'kit/theme.css'), `@theme inline {
    --color-dash-priority-p1-bg: var(--theme-color-priority-p1-bg);
    --color-dash-priority-p2-bg: var(--theme-color-priority-p2-bg);
  }`)
  return { root, path, close: () => rmSync(root, { recursive: true, force: true }) }
}

it('registers real priority tokens, rejects invented tokens and keeps package scope', async () => {
  const f = fixture()
  try {
    const config = [
      ...await designConfig({ vocabulary }),
      ...await designConfig({ vocabulary, files: ['kit/**/*.js'], idiomManifests: [f.path] }),
    ]
    const eslint = new ESLint({ cwd: f.root, overrideConfigFile: true, overrideConfig: config })
    const lint = async (code, filePath = 'kit/badge.js') =>
      (await eslint.lintText(code, { filePath }))[0].messages
    assert.deepEqual(await lint('const c = "bg-dash-priority-p1-bg bg-dash-priority-p2-bg text-fg"'), [])
    assert.ok((await lint('const c = "bg-dash-priority-invented-bg"'))
      .some((m) => m.ruleId === 'design/no-undefined-token'))
    assert.ok((await lint('const c = "bg-dash-priority-p1-bg"', 'base.js'))
      .some((m) => m.ruleId === 'design/no-undefined-token'))
    assert.ok((await lint('const c = "bg-priority-p1-bg"'))
      .some((m) => m.message.includes('retired') && m.message.includes('dash-priority-p1-bg')))
    assert.ok((await lint('const c = "bg-dash-primary"'))
      .some((m) => m.ruleId === 'design/no-idiom-shadowing-contract'))
  } finally { f.close() }
})

it('refuses registration when the stylesheet binding is missing or differs', async () => {
  const f = fixture()
  try {
    writeFileSync(join(f.root, 'kit/theme.css'), '@theme inline { --color-dash-priority-p1-bg: var(--wrong); }')
    await assert.rejects(loadIdiomManifest(f.path, vocabulary), /binding.*missing or differs/)
  } finally { f.close() }
})

it('refuses undeclared CSS idiom names and contract shadowing', async () => {
  const f = fixture()
  try {
    const { appendFileSync } = await import('node:fs')
    appendFileSync(join(f.root, 'kit/theme.css'), '@theme inline { --color-dash-invented: var(--color-bg); }')
    await assert.rejects(loadIdiomManifest(f.path, vocabulary), /absent from metadata/)
    writeFileSync(f.path, JSON.stringify({
      prefix: 'dash', stylesheet: './theme.css', tokens: { 'dash-primary': 'var(--color-primary)' },
    }))
    await assert.rejects(loadIdiomManifest(f.path, vocabulary), /shadows a base contract/)
  } finally { f.close() }
})

it('ratchet and Biome --no-config enroll explicitly and still reject an undefined dash token', () => {
  const f = fixture()
  try {
    const file = join(f.root, 'kit/badge.js')
    const run = (script, extra = []) => spawnSync(process.execPath, [
      new URL(`../scripts/${script}`, import.meta.url).pathname,
      '--root', f.root, '--json', ...extra,
      '--idiom-manifest', f.path, 'kit/badge.js',
    ], { encoding: 'utf8' })
    writeFileSync(file, 'const c = "bg-dash-priority-p1-bg bg-dash-priority-p2-bg"')
    for (const [script, args] of [['ratchet.mjs', ['--no-config']], ['biome-check.mjs', []]]) {
      let result = run(script, args)
      assert.equal(result.status, 0, result.stderr + result.stdout)
      writeFileSync(file, 'const c = "bg-dash-priority-invented-bg"')
      result = run(script, args)
      assert.equal(result.status, 1, result.stderr + result.stdout)
      assert.ok(JSON.parse(result.stdout).current['design/no-undefined-token'] > 0)
      writeFileSync(file, 'const c = "bg-dash-priority-p1-bg bg-dash-priority-p2-bg"')
    }
  } finally { f.close() }
})
