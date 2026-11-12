/**
 * The property that made the whole typed-contract argument: every theme carries
 * every key, and the compiler holds it.
 *
 * Nanite proved this across 6 themes x dark and light x 40 keys with zero drift,
 * while the names that lived only in CSS are exactly the ones that drifted out.
 * These tests are that experiment, re-run against this package's 10 themes and
 * 48 keys, so the property survives the move rather than being claimed.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILTIN_THEMES, NANITE_THEMES, SYSOP_PALETTES, DEFAULT_THEME_ID, getBuiltinTheme,
  COLOR_TOKENS, CHART_TOKENS, PLACEHOLDER_CHART_COLOR, DERIVED_TOKEN_VALUES,
  modesOf, hasDesignedChartPalette, themeCss,
} from '../dist/index.js'

test('both working implementations survived the move, whole', () => {
  // CW-0124: losing either set costs the epic its working examples.
  assert.equal(NANITE_THEMES.length, 6, 'six Nanite themes')
  assert.equal(SYSOP_PALETTES.length, 4, 'four sysop-ui palettes')
  assert.equal(BUILTIN_THEMES.length, 10)
})

test('every theme carries EVERY token in every mode it declares — zero drift', () => {
  const expected = [...COLOR_TOKENS].sort()
  for (const theme of BUILTIN_THEMES) {
    for (const mode of modesOf(theme)) {
      const values = theme.tokens[mode]
      assert.ok(values, `${theme.id}/${mode} missing`)
      assert.deepEqual(Object.keys(values).sort(), expected, `${theme.id}/${mode} key drift`)
      for (const [k, v] of Object.entries(values)) {
        assert.equal(typeof v, 'string', `${theme.id}/${mode}/${k}`)
        assert.ok(v.trim().length > 0, `${theme.id}/${mode}/${k} is empty`)
      }
    }
  }
})

test('every built-in ships dark and light', () => {
  for (const t of BUILTIN_THEMES) assert.deepEqual(modesOf(t), ['dark', 'light'], t.id)
})

test('theme ids are unique and resolvable', () => {
  const ids = BUILTIN_THEMES.map((t) => t.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) assert.equal(getBuiltinTheme(id)?.id, id)
  assert.equal(getBuiltinTheme('no-such-theme'), undefined)
})

test('the default theme exists', () => {
  assert.ok(getBuiltinTheme(DEFAULT_THEME_ID))
})

test('the default theme DEMONSTRATES the contract it ships', () => {
  // The guard on Chrispian's 2026-09-10 decision, encoded so the reasoning
  // survives rather than the outcome alone.
  //
  // The obvious default was `nanite-default`, Nanite's own. It fails this: its
  // `warning` and `danger` are the same red, and its `success` and `info` are
  // both greys — three colours across four semantics. A package that just
  // promoted success/warning/info/danger to first-class contract names should
  // not render them indistinguishably out of the box.
  //
  // Any future default has to clear the same bar or change this test on purpose.
  const theme = getBuiltinTheme(DEFAULT_THEME_ID)
  for (const mode of modesOf(theme)) {
    const feedback = ['success', 'warning', 'danger', 'info'].map((t) => theme.tokens[mode][t])
    assert.equal(new Set(feedback).size, 4, `${DEFAULT_THEME_ID}/${mode}: feedback colours collide`)
  }
  // And it must carry light, or the out-of-box experience is dark-only while
  // Theme.tokens.light is optional.
  assert.deepEqual(modesOf(theme), ['dark', 'light'])
})

test('NO theme ships a designed chart palette, and every one says so', () => {
  // The single most important honesty check in this package. `chart-1..5` is the
  // one family neither implementation had, and review round 2 was explicit:
  // names only, the palette is Chrispian's design pass. Quietly picking five
  // plausible colours is exactly how four invented token names reached
  // production. If this test starts failing, someone did the design work — and
  // this test should then be updated deliberately, not deleted in passing.
  for (const theme of BUILTIN_THEMES) {
    assert.equal(theme.chartPalette, 'placeholder', theme.id)
    assert.equal(hasDesignedChartPalette(theme), false, theme.id)
    for (const mode of modesOf(theme)) {
      for (const c of CHART_TOKENS) {
        assert.equal(theme.tokens[mode][c], PLACEHOLDER_CHART_COLOR, `${theme.id}/${mode}/${c}`)
      }
    }
  }
})

test('the placeholder is loud, not plausible', () => {
  // Five identical magentas make a chart obviously wrong. Five plausible colours
  // make it quietly unreviewed, which is worse.
  assert.equal(new Set(CHART_TOKENS.map(() => PLACEHOLDER_CHART_COLOR)).size, 1)
})

test('every derived value is declared, and declared accurately', () => {
  const ids = new Set(BUILTIN_THEMES.map((t) => t.id))
  for (const row of DERIVED_TOKEN_VALUES) {
    assert.ok(ids.has(row.theme), `unknown theme ${row.theme}`)
    const theme = getBuiltinTheme(row.theme)
    assert.ok(modesOf(theme).includes(row.mode), `${row.theme} has no ${row.mode}`)
    for (const t of row.tokens) {
      assert.ok(COLOR_TOKENS.includes(t), `${row.theme}: ${t} is not a token`)
      assert.ok(!CHART_TOKENS.includes(t), `${t} is a placeholder, not a derived value`)
    }
    assert.equal(new Set(row.tokens).size, row.tokens.length, `${row.theme}/${row.mode}: duplicate derivation`)
  }
})

test('every sysop dark palette declares the syntax ramp as derived', () => {
  const syntax = ['syntax-key', 'syntax-string', 'syntax-number', 'syntax-boolean', 'syntax-null']
  for (const row of DERIVED_TOKEN_VALUES.filter(r => r.theme.startsWith('sysop-') && r.mode === 'dark')) {
    assert.deepEqual(row.tokens.filter(token => syntax.includes(token)), syntax, `${row.theme}: syntax ramp`)
  }
})

test('a theme serialises to CSS that names only the value layer', () => {
  const css = themeCss(getBuiltinTheme('dir-a'))
  assert.match(css, /\[data-theme="dir-a"\] \{/)
  assert.match(css, /\[data-theme="dir-a"\]\.light \{/)
  assert.match(css, /--hl-bg:/)
  // A runtime override must never write the contract layer — that is what keeps
  // the utilities and the shadcn aliases working underneath it.
  assert.ok(!css.includes('--color-'), 'override wrote the contract layer')
  for (const t of COLOR_TOKENS) assert.ok(css.includes(`--hl-${t}:`), `override omits ${t}`)
})

test('a dark-only theme serialises no light block', () => {
  const builtin = getBuiltinTheme('sysop-green-phosphor')
  const css = themeCss({ ...builtin, tokens: { dark: builtin.tokens.dark } })
  assert.ok(!css.includes('.light'), 'invented a light mode')
})

test('the DOM helpers are inert outside a browser', async () => {
  // A tokens package gets imported during SSR and during tests. It should not care.
  const { applyTheme, setTheme, setMode, clearThemeOverride, currentTheme, currentMode, readToken } =
    await import('../dist/index.js')
  assert.doesNotThrow(() => applyTheme(getBuiltinTheme('dir-a')))
  assert.doesNotThrow(() => setTheme('dir-a'))
  assert.doesNotThrow(() => setMode('light'))
  assert.doesNotThrow(() => clearThemeOverride())
  assert.equal(currentTheme(), null)
  assert.equal(currentMode(), 'dark')
  assert.equal(readToken('bg'), '')
})
