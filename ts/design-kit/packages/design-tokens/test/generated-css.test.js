/**
 * The committed CSS is generated from the TypeScript, and this is the check that
 * makes that true rather than aspirational.
 *
 * The contract (§10) asks for CI to run the generator in --check mode. It lives
 * here rather than in .github/workflows/ci.yml for two reasons, and the second
 * is the better one: that file is a root file this session does not own, and a
 * check wired into the test suite runs everywhere the tests run — including on a
 * developer's machine before the push, which a CI step does not.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BUILTIN_THEMES, DEFAULT_THEME_ID, COLOR_TOKENS, GENERATED_SHADCN_ALIASES,
  emitAll, emitContractCss, modesOf,
} from '../dist/index.js'

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

test('committed css/ matches what the TypeScript describes', () => {
  // If this fails, someone hand-edited css/. TypeScript is the source: run
  // `npm run generate` and commit the result.
  const out = execFileSync(process.execPath, [join(pkgRoot, 'scripts', 'generate.mjs'), '--check'], {
    cwd: pkgRoot,
    encoding: 'utf8',
  })
  assert.match(out, /match the contract/)
})

test('the generator writes one file per theme plus three shared', () => {
  const files = emitAll(BUILTIN_THEMES, DEFAULT_THEME_ID)
  assert.equal(Object.keys(files).length, BUILTIN_THEMES.length + 3)
  for (const k of ['tokens.css', 'themes.css', 'design-tokens.css']) assert.ok(k in files)
})

test('the contract layer declares every token and every generated alias', () => {
  const css = emitContractCss()
  for (const t of COLOR_TOKENS) assert.ok(css.includes(`--color-${t}: var(--hl-${t});`), t)
  for (const [alias, target] of GENERATED_SHADCN_ALIASES) {
    assert.ok(css.includes(`--color-${alias}: var(--hl-${target});`), alias)
  }
})

test('the contract layer names NO colour — it is layer 2, not layer 3', () => {
  // The whole point of the split. If a hex ever appears in tokens.css, the two
  // layers have collapsed back into one.
  const css = readFileSync(join(pkgRoot, 'css', 'tokens.css'), 'utf8')
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), 'tokens.css contains a colour literal')
  assert.ok(!/\brgba?\(/.test(css), 'tokens.css contains a colour function')
})

test('`@theme inline` is used for colours — a themed SUBTREE depends on it', () => {
  // Without `inline`, Tailwind resolves --color-* at :root, so [data-theme] on
  // anything below <html> silently changes nothing.
  const css = emitContractCss()
  assert.match(css, /@theme inline \{/)
  const inlineBlock = css.slice(css.indexOf('@theme inline'), css.indexOf('\n}\n'))
  assert.ok(inlineBlock.includes('--color-bg: var(--hl-bg);'))
})

test('every theme block in themes.css declares all 48 tokens', () => {
  const css = readFileSync(join(pkgRoot, 'css', 'themes.css'), 'utf8')
  for (const theme of BUILTIN_THEMES) {
    for (const mode of modesOf(theme)) {
      const selector = mode === 'light'
        ? `[data-theme="${theme.id}"].light {`
        : `[data-theme="${theme.id}"] {`
      const i = css.indexOf(selector)
      assert.ok(i > -1, `${theme.id}/${mode}: no block`)
      const block = css.slice(i, css.indexOf('}', i))
      for (const t of COLOR_TOKENS) assert.ok(block.includes(`--hl-${t}:`), `${theme.id}/${mode}: ${t}`)
    }
  }
})

test('the default theme is reachable before any attribute is set', () => {
  // sysop-ui's first-paint-flash fix, kept. The `:not([data-theme])` is what
  // stops the default's light block outranking another theme's dark block.
  const css = readFileSync(join(pkgRoot, 'css', 'themes.css'), 'utf8')
  assert.ok(css.includes(':root:not([data-theme]) {'))
  assert.ok(!css.includes(':root.light {'), 'unscoped :root.light would outrank other themes')
  // First-paint palette and dark: utilities must agree without a mode marker.
  // Keep explicit dark islands and exclude explicit light scopes from fallback.
  const variant = emitContractCss().match(/@custom-variant dark \((.*)\);/)[1]
  assert.ok(variant.startsWith('&:where(') && variant.endsWith(')'), 'mode matching must add zero specificity')
  assert.ok(variant.includes('[data-mode="dark"] *') && variant.includes('.dark *'), 'explicit dark descendants remain supported')
  assert.ok(variant.includes(':not([data-mode], [data-mode] *, .light, .light *'), 'default dark must exclude explicit mode scopes')
})

test('fonts are declared outside every theme block', () => {
  // Inside the default theme they would vanish the moment a consumer set
  // [data-theme] to anything else.
  const css = readFileSync(join(pkgRoot, 'css', 'themes.css'), 'utf8')
  const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
  assert.ok(rootBlock.includes('--hl-font-sans:'))
  assert.ok(rootBlock.includes('--hl-font-mono:'))
})

test('the bundle imports both layers', () => {
  const css = readFileSync(join(pkgRoot, 'css', 'design-tokens.css'), 'utf8')
  assert.ok(css.includes('@import "./tokens.css";'))
  assert.ok(css.includes('@import "./themes.css";'))
})
