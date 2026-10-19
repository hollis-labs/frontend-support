/**
 * The integration CW-20260910-0117 is blocked on, tested from THIS side.
 *
 * `@hollis-labs/eslint-config-design` builds its vocabulary by importing this
 * package and reading named exports. It deliberately ships no fallback list —
 * "a lint config that silently substitutes a stale vocabulary is worse than one
 * that refuses to load" — so if this package renames an export, that package
 * stops working rather than working wrongly.
 *
 * That makes the export NAMES part of this package's contract with it, and a
 * contract nobody tests is a convention. This is the test.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as designTokens from '../dist/index.js'

const lint = await import('@hollis-labs/eslint-config-design').catch(() => null)

test('the exports the lint config reads by name are all present', () => {
  for (const name of [
    'COLOR_TOKENS', 'SHADCN_ALIASES', 'TEXT_TOKENS', 'RADIUS_TOKENS', 'TRACKING_TOKENS',
    'TEXT_SCALE', 'RADIUS_SCALE', 'TRACKING_SCALE', 'IDIOM_PREFIXES', 'DEPRECATED_TOKENS',
  ]) {
    assert.ok(name in designTokens, `missing export ${name}`)
  }
})

test('the lint config builds a vocabulary from this package', { skip: !lint }, () => {
  const vocab = lint.vocabularyFrom(designTokens, '@hollis-labs/design-tokens')

  // Every contract token, and every shadcn alias, is a KNOWN name. The second
  // half is what stops `primary-foreground` being reported as invented — a
  // false positive CW-0117 actually hit, nine times, in Nanite.
  for (const t of designTokens.COLOR_TOKENS) assert.ok(vocab.colors.has(t), t)
  for (const a of Object.keys(designTokens.SHADCN_ALIASES)) assert.ok(vocab.colors.has(a), a)

  // The four invented names that are live in production stay unknown.
  for (const invented of ['status-running', 'status-info', 'bg-surface', 'surfcae']) {
    assert.ok(!vocab.colors.has(invented), `${invented} must not be in the vocabulary`)
  }

  // `warning-fg` was the fourth invented name. It is now a real contract token,
  // because the family it belonged to was made rectangular.
  assert.ok(vocab.colors.has('warning-fg'))
})

test('the scale VALUES reach the rule, not just the names', { skip: !lint }, () => {
  // The whole reason these maps had to ship. Without values, `no-arbitrary-scale`
  // cannot tell an autofix from a violation.
  const vocab = lint.vocabularyFrom(designTokens, '@hollis-labs/design-tokens')
  assert.equal(vocab.textScale.control, 13)
  assert.equal(vocab.textScale.label, 11)
  assert.equal(vocab.radiusScale.panel, 10)
  assert.equal(vocab.trackingScale.label, 0.18)
})

test('THE FALLBACK THIS PACKAGE DELETES agrees with the contract', { skip: !lint }, () => {
  // Reported rather than silently reconciled, per the epic's standing rule:
  // `CONTRACT_STEP_VALUES` in that package is a second copy of these numbers,
  // flagged in its own source as the one place it restates the contract. It is
  // now redundant. Pinning the agreement here means the day someone deletes it
  // is a deliberate day, and until then a divergence fails a build instead of
  // producing two different lint messages for the same line.
  const fallback = lint.CONTRACT_STEP_VALUES
  if (!fallback) return
  assert.deepEqual(fallback.text, designTokens.TEXT_SCALE)
  assert.deepEqual(fallback.radius, designTokens.RADIUS_SCALE)
  assert.deepEqual(fallback.tracking, designTokens.TRACKING_SCALE)
})

test('retired names reach the rule as a migration, not as absent', { skip: !lint }, () => {
  // Tesseract reported 106 "renders nothing" errors that were all retired names.
  const vocab = lint.vocabularyFrom(designTokens, '@hollis-labs/design-tokens')
  assert.equal(vocab.deprecated['border-strong'], 'border')
  assert.equal(vocab.deprecated['border-soft'], 'divider')
})

test('the family set derives the multi-segment names correctly', { skip: !lint }, () => {
  // The false-positive class the contract's author was caught by twice:
  // `bg-bg-elevated` and `bg-mode-default` read as invented tokens under a naive
  // regex that truncates at the second prefix segment.
  const vocab = lint.vocabularyFrom(designTokens, '@hollis-labs/design-tokens')
  assert.ok(vocab.families.has('bg'))
  assert.ok(vocab.colors.has('bg-elevated'))
  assert.ok(vocab.families.has('chart'))
})
