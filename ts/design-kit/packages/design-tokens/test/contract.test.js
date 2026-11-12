/**
 * The contract's own invariants.
 *
 * These are not "does the array have things in it". Each one is a rule the
 * contract states in prose, turned into something that fails a build — because
 * every count in this epic that went unchecked turned out to be counting
 * something other than what it named.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as tokens from '../dist/index.js'

const {
  COLOR_TOKENS, CHART_TOKENS, SHADCN_ALIASES, GENERATED_SHADCN_ALIASES,
  DEPRECATED_TOKENS, DROPPED_TOKENS, IDIOM_PREFIXES, UNAVAILABLE_IDIOM_PREFIXES,
  FONT_TOKENS, VALUE_PREFIX, TOKEN_META, CATEGORIES, TONES, ACCENTS,
} = tokens

test('48 colour tokens, no duplicates', () => {
  // 43 at the contract's landing, plus the five-name syntax family (§3.10).
  assert.equal(COLOR_TOKENS.length, 48)
  assert.equal(new Set(COLOR_TOKENS).size, 48)
})

test('the value-layer prefix is --hl-, not --c-', () => {
  // Decided in review round 2. `--c-` is a one-letter namespace on public npm.
  assert.equal(VALUE_PREFIX, 'hl')
})

test('every token name is lower-kebab — no underscores, no camelCase', () => {
  for (const t of COLOR_TOKENS) assert.match(t, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, t)
})

test('§3.8 rule 1 — feedback families are RECTANGULAR', () => {
  // Not tidiness. `warning` was the one family missing `-fg`, and someone wrote
  // `text-warning-fg` anyway (SkillDetailView.tsx:421 — verified present).
  // A missing member of an otherwise-complete family invites invention.
  for (const family of ['danger', 'warning', 'success', 'info']) {
    for (const member of ['', '-muted', '-fg']) {
      assert.ok(COLOR_TOKENS.includes(family + member), `missing ${family}${member}`)
    }
  }
})

test('§3.8 rule 2 — -hover and -active only where a fill can be pressed', () => {
  const hover = COLOR_TOKENS.filter((t) => t.endsWith('-hover')).map((t) => t.slice(0, -6))
  const active = COLOR_TOKENS.filter((t) => t.endsWith('-active')).map((t) => t.slice(0, -7))
  assert.deepEqual(hover.sort(), ['brand', 'danger', 'primary', 'surface'])
  // `danger` carries -hover and NOT -active. The contract's prose names the same
  // four families for both; its token list gives danger only the one. Asserting
  // the shipped set rather than the prose, and the difference is reported.
  assert.deepEqual(active.sort(), ['brand', 'primary', 'surface'])
})

test('§3.8 rules 3 and 4 — every -muted and -fg belongs to a real family', () => {
  for (const t of COLOR_TOKENS) {
    for (const suffix of ['-muted', '-fg']) {
      if (!t.endsWith(suffix)) continue
      const base = t.slice(0, -suffix.length)
      assert.ok(COLOR_TOKENS.includes(base), `${t} has no base token ${base}`)
    }
  }
})

test('shadcn aliases all resolve to real contract tokens', () => {
  // The failure this prevents is measured: CW-0117's first pass omitted the alias
  // layer and reported nine legitimate uses of `primary-foreground` in Nanite as
  // undefined tokens.
  for (const [alias, target] of Object.entries(SHADCN_ALIASES)) {
    assert.ok(COLOR_TOKENS.includes(target), `${alias} -> ${target} is not a token`)
  }
})

test('the generated alias layer skips the rows that rename nothing', () => {
  const selfMapping = Object.entries(SHADCN_ALIASES).filter(([a, t]) => a === t).map(([a]) => a)
  assert.deepEqual(
    selfMapping.sort(),
    ['border', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'primary', 'ring'],
  )
  assert.equal(GENERATED_SHADCN_ALIASES.length, Object.keys(SHADCN_ALIASES).length - 8)
  for (const [alias] of GENERATED_SHADCN_ALIASES) assert.ok(!COLOR_TOKENS.includes(alias))
})

test('retired names point at a replacement that exists', () => {
  // A retired name is a MIGRATION, not a void. Tesseract reported 106 "renders
  // nothing" errors that were all retired names rendering perfectly well.
  for (const [old, replacement] of Object.entries(DEPRECATED_TOKENS)) {
    assert.ok(COLOR_TOKENS.includes(replacement), `${old} -> ${replacement} is not a token`)
  }
})

test('the two substantive retirements are in the map', () => {
  assert.equal(DEPRECATED_TOKENS['border-strong'], 'border')
  assert.equal(DEPRECATED_TOKENS['border-soft'], 'divider')
})

test('no retired or dropped name is ALSO a live token', () => {
  // The one way this table could do harm: telling someone to migrate off a name
  // that is still in the contract.
  for (const old of Object.keys(DEPRECATED_TOKENS)) {
    assert.ok(!COLOR_TOKENS.includes(old), `${old} is retired AND live`)
  }
  for (const dropped of Object.keys(DROPPED_TOKENS)) {
    assert.ok(!COLOR_TOKENS.includes(dropped), `${dropped} is dropped AND live`)
  }
  for (const old of Object.keys(DEPRECATED_TOKENS)) {
    assert.ok(!(old in DROPPED_TOKENS), `${old} is both retired and dropped`)
  }
})

test('§9.1 — no idiom prefix may shadow a contract name', () => {
  for (const prefix of IDIOM_PREFIXES) {
    assert.ok(!COLOR_TOKENS.includes(prefix), `idiom prefix "${prefix}" is a contract token`)
  }
  // `status` is BURNED, not available: 12 workflow states in sysop-ui vs 3 health
  // states in Nanite, same prefix, incompatible meanings, both live.
  assert.ok('status' in UNAVAILABLE_IDIOM_PREFIXES)
  assert.ok('sidebar' in UNAVAILABLE_IDIOM_PREFIXES)
  for (const burned of Object.keys(UNAVAILABLE_IDIOM_PREFIXES)) {
    assert.ok(!IDIOM_PREFIXES.includes(burned), `${burned} is both claimable and burned`)
  }
})

test('sidebar-* is gone entirely — 8 names, zero references anywhere', () => {
  assert.equal(Object.keys(DROPPED_TOKENS).filter((k) => k.startsWith('sidebar')).length, 8)
  for (const t of COLOR_TOKENS) assert.ok(!t.startsWith('sidebar-'), t)
})

test('editor metadata is total over the contract, in contract order', () => {
  assert.deepEqual(TOKEN_META.map((m) => m.key), [...COLOR_TOKENS])
  for (const m of TOKEN_META) {
    assert.ok(m.label, `${m.key} has no label`)
    assert.ok(CATEGORIES.some((c) => c.id === m.category), `${m.key}: bad category ${m.category}`)
  }
})

test('every category has at least one token', () => {
  for (const c of CATEGORIES) {
    assert.ok(TOKEN_META.some((m) => m.category === c.id), `category ${c.id} is empty`)
  }
})

test('prop types are derived from the contract, not restated', () => {
  for (const t of [...TONES, ...ACCENTS]) assert.ok(COLOR_TOKENS.includes(t), t)
  assert.deepEqual([...TONES], ['success', 'warning', 'danger', 'info'])
})

test('fonts are exactly the two both implementations declare', () => {
  assert.deepEqual([...FONT_TOKENS], ['sans', 'mono'])
})

test('chart-1..5 are the contract tokens, and they are the only ones', () => {
  assert.deepEqual([...CHART_TOKENS], ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'])
  assert.deepEqual(COLOR_TOKENS.filter((t) => t.startsWith('chart')), [...CHART_TOKENS])
})
