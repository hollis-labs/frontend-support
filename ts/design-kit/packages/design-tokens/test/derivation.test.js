import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BUILTIN_THEMES, DERIVED_TOKEN_VALUES, deriveMuted, mixSrgb, deriveHover,
  deriveActive, deriveSurfaceActive, relativeLuminance, contrastRatio,
  deriveForeground, deriveSyntax,
} from '../dist/index.js'

// Literal expected values captured from main 2df729e before introducing helpers.
// Deliberate palette edits require reviewing the expected output, not regenerating
// this fixture as part of a build. No test asserts a number of tokens or palettes.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/derived-values.json', import.meta.url)))
const authoredHover = ['sysop-p4-white', 'sysop-amber-phosphor', 'sysop-hi-contrast']

test('R1 keeps channels and adds the requested alpha', () => {
  assert.equal(deriveMuted('#0af'), 'rgb(0 170 255 / 12%)')
  assert.equal(deriveMuted('rgb(255, 184, 77)'), 'rgb(255 184 77 / 12%)')
  assert.equal(deriveMuted('#fb7588', 0.1, 'css'), 'color-mix(in srgb, #fb7588 10%, transparent)')
  assert.equal(deriveMuted('#000', 0), 'rgb(0 0 0 / 0%)')
  assert.equal(deriveMuted('#fff', 1), 'rgb(255 255 255 / 100%)')
})

test('R2 interpolates encoded sRGB, rounds once, and retains endpoints', () => {
  assert.equal(mixSrgb('#000', '#fff', 0.5), 'rgb(128 128 128)')
  assert.equal(mixSrgb('#123456', '#abcdef', 0), 'rgb(18 52 86)')
  assert.equal(mixSrgb('#123456', '#abcdef', 1), 'rgb(171 205 239)')
  assert.equal(deriveHover('rgb(228 228 231)'), 'rgb(231 231 234)')
  assert.equal(deriveActive('rgb(228 228 231)'), 'rgb(201 201 203)')
  assert.equal(deriveSurfaceActive('rgb(24 24 27)', 'rgb(244 244 245)'), 'rgb(57 57 60)')
})

test('R3 linearizes sRGB for WCAG and returns the original candidate string', () => {
  assert.equal(relativeLuminance('#000'), 0)
  assert.equal(relativeLuminance('#fff'), 1)
  assert.equal(contrastRatio('#000', '#fff'), 21)
  assert.equal(contrastRatio('#fff', '#000'), 21)
  assert.equal(deriveForeground('#fff'), '#000000')
  assert.equal(deriveForeground('#000'), '#ffffff')
  assert.equal(deriveForeground('rgb(251 113 133)', 'rgb(9 9 11)', 'rgb(255 255 255)'), 'rgb(9 9 11)')
  assert.equal(deriveForeground('#aaa', '#aaa', '#aaa'), '#aaa')
})

test('R4 produces Oklab stops and preserves endpoint spelling', () => {
  // Oklab red/blue midpoint differs from encoded-sRGB's rgb(128 0 128).
  assert.equal(deriveSyntax('#ff0000', '#0000ff', 'rgb')['syntax-number'], 'rgb(140 83 162)')
  assert.deepEqual(deriveSyntax('rgb(255 255 255)', 'rgb(208 208 208)', 'rgb'), {
    'syntax-key': 'rgb(255 255 255)', 'syntax-string': 'rgb(243 243 243)',
    'syntax-number': 'rgb(231 231 231)', 'syntax-boolean': 'rgb(220 220 220)',
    'syntax-null': 'rgb(208 208 208)',
  })
  assert.deepEqual(deriveSyntax('#e8eaed', '#8e9298'), {
    'syntax-key': '#e8eaed', 'syntax-string': 'color-mix(in oklab, #e8eaed 75%, #8e9298)',
    'syntax-number': 'color-mix(in oklab, #e8eaed 50%, #8e9298)',
    'syntax-boolean': 'color-mix(in oklab, #e8eaed 25%, #8e9298)', 'syntax-null': '#8e9298',
  })
})

test('numeric operations reject ambiguous or invalid input rather than silently inventing channels', () => {
  for (const color of ['#12345', 'rgb(256 0 0)', 'rgba(0,0,0,.5)', 'var(--fg)', 'rgb(0 0 0 / 50%)', 'rgb(0,,0,0)', 'rgb(0,0 0)']) {
    assert.throws(() => mixSrgb(color, 'white', 0.12), TypeError)
    assert.throws(() => deriveForeground(color), TypeError)
  }
  for (const fraction of [-0.1, 1.1, NaN, Infinity]) {
    assert.throws(() => mixSrgb('#000', '#fff', fraction), RangeError)
    assert.throws(() => deriveMuted('#000', fraction), RangeError)
  }
})

for (const row of DERIVED_TOKEN_VALUES) {
  test(`exported rules reproduce shipped derivations: ${row.theme}/${row.mode}`, () => {
    const values = BUILTIN_THEMES.find(theme => theme.id === row.theme).tokens[row.mode]
    const expected = fixtures.find(fixture => fixture.theme === row.theme && fixture.mode === row.mode).values
    for (const token of row.tokens) {
      let actual
      if (token.startsWith('syntax-')) actual = deriveSyntax(values.fg, values['fg-faint'], row.theme === 'sysop-hi-contrast' && row.mode === 'dark' ? 'rgb' : 'css')[token]
      else if (token === 'surface-active') actual = deriveSurfaceActive(values['surface-hover'], values.fg)
      else {
        const base = token.slice(0, token.lastIndexOf('-'))
        if (token.endsWith('-hover')) actual = deriveHover(values[base])
        else if (token.endsWith('-active')) actual = deriveActive(values[base])
        else if (token.endsWith('-muted')) {
          const adjusted = base === 'danger' && authoredHover.includes(row.theme)
          actual = deriveMuted(values[base], adjusted ? 0.1 : 0.12, adjusted ? 'css' : 'rgb')
        } else if (token.endsWith('-fg')) actual = row.theme === 'sysop-hi-contrast' && row.mode === 'dark'
          ? deriveForeground(values[base], 'rgb(0 0 0)', 'rgb(255 255 255)') : deriveForeground(values[base])
      }
      assert.equal(actual, expected[token], `${token}: fixed shipped output`)
      assert.equal(values[token], actual, `${token}: built-in uses the public rule`)
    }
    if (row.mode === 'dark' && authoredHover.includes(row.theme)) assert.ok(!row.tokens.includes('danger-hover'), 'authored override is not derived')
  })
}
