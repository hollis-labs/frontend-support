/**
 * Tests for the ratchet core logic.
 *
 * These use Node's built-in test runner (same as the rest of the package).
 * The ESLint integration is tested in test/ratchet.integration.test.js.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  DESIGN_RULES,
  countByRule,
  buildBaseline,
  serializeBaseline,
  parseBaseline,
  compare,
  formatReport,
} from '../src/ratchet.js'

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal ESLint LintResult-like array from a flat list of ruleIds. */
function fakeResults(ruleIds) {
  const messages = ruleIds.map((ruleId) => ({ ruleId, fatal: false }))
  return [{ filePath: 'fake.tsx', messages }]
}

// ─── countByRule ──────────────────────────────────────────────────────────────

describe('countByRule', () => {
  it('returns zero counts for all rules when no results', () => {
    const counts = countByRule([])
    for (const r of DESIGN_RULES) {
      assert.equal(counts[r], 0)
    }
  })

  it('counts each rule independently', () => {
    const results = fakeResults([
      'design/no-color-literal',
      'design/no-color-literal',
      'design/no-arbitrary-scale',
    ])
    const counts = countByRule(results)
    assert.equal(counts['design/no-color-literal'], 2)
    assert.equal(counts['design/no-arbitrary-scale'], 1)
    assert.equal(counts['design/no-raw-palette-utility'], 0)
  })

  it('ignores fatal/parse errors', () => {
    const results = [{ filePath: 'x.tsx', messages: [{ ruleId: null, fatal: true }] }]
    const counts = countByRule(results)
    for (const r of DESIGN_RULES) assert.equal(counts[r], 0)
  })

  it('ignores unknown ruleIds', () => {
    const results = fakeResults(['react/no-unused-vars'])
    const counts = countByRule(results)
    for (const r of DESIGN_RULES) assert.equal(counts[r], 0)
  })

  it('counts only the requested rules when a subset is provided', () => {
    const results = fakeResults(['design/no-color-literal', 'design/no-arbitrary-scale'])
    const counts = countByRule(results, ['design/no-color-literal'])
    assert.equal(Object.keys(counts).length, 1)
    assert.equal(counts['design/no-color-literal'], 1)
    assert.equal(counts['design/no-arbitrary-scale'], undefined)
  })
})

// ─── buildBaseline / serializeBaseline / parseBaseline ───────────────────────

describe('baseline serialization round-trip', () => {
  it('round-trips a baseline without data loss', () => {
    const counts = { 'design/no-color-literal': 4, 'design/no-arbitrary-scale': 650 }
    const baseline = buildBaseline(counts, { note: 'test note' })
    const json = serializeBaseline(baseline)
    const parsed = parseBaseline(json)

    assert.equal(parsed.version, 1)
    assert.equal(parsed.note, 'test note')
    assert.deepEqual(parsed.counts, counts)
    assert.ok(typeof parsed.recorded === 'string' && parsed.recorded.length > 0)
  })

  it('JSON ends with a newline', () => {
    const json = serializeBaseline(buildBaseline({}))
    assert.ok(json.endsWith('\n'))
  })

  it('parseBaseline throws on unknown version', () => {
    assert.throws(
      () => parseBaseline(JSON.stringify({ version: 2, counts: {} })),
      /unknown version 2/,
    )
  })

  it('parseBaseline throws on invalid JSON', () => {
    assert.throws(() => parseBaseline('not json'), /invalid JSON/)
  })

  it('parseBaseline throws when counts field is missing', () => {
    assert.throws(
      () => parseBaseline(JSON.stringify({ version: 1 })),
      /missing or invalid/,
    )
  })

  it('omits note when not provided', () => {
    const baseline = buildBaseline({ 'design/no-color-literal': 0 })
    assert.equal(baseline.note, undefined)
    const parsed = parseBaseline(serializeBaseline(baseline))
    assert.equal(parsed.note, undefined)
  })
})

// ─── compare ─────────────────────────────────────────────────────────────────

describe('compare', () => {
  it('passes when counts match the baseline exactly', () => {
    const counts = { 'design/no-color-literal': 4, 'design/no-arbitrary-scale': 650 }
    const baseline = buildBaseline(counts)
    const result = compare(counts, baseline)
    assert.ok(result.pass)
    assert.deepEqual(result.regressions, [])
    assert.deepEqual(result.improvements, [])
  })

  it('passes when counts decrease (improvement)', () => {
    const baseline = buildBaseline({ 'design/no-color-literal': 10 })
    const current = { 'design/no-color-literal': 5 }
    const result = compare(current, baseline)
    assert.ok(result.pass)
    assert.deepEqual(result.regressions, [])
    assert.ok(result.improvements.includes('design/no-color-literal'))
    assert.equal(result.delta['design/no-color-literal'], -5)
  })

  it('fails when any rule count increases', () => {
    const baseline = buildBaseline({ 'design/no-color-literal': 4 })
    const current = { 'design/no-color-literal': 5 }
    const result = compare(current, baseline)
    assert.ok(!result.pass)
    assert.ok(result.regressions.includes('design/no-color-literal'))
    assert.equal(result.delta['design/no-color-literal'], 1)
  })

  it('fails on a rule present in current but absent from baseline (treated as baseline 0)', () => {
    const baseline = buildBaseline({})
    const current = { 'design/no-color-literal': 3 }
    const result = compare(current, baseline)
    assert.ok(!result.pass)
    assert.ok(result.regressions.includes('design/no-color-literal'))
  })

  it('handles null baseline (isNew)', () => {
    const current = { 'design/no-color-literal': 0 }
    const result = compare(current, null)
    assert.ok(result.isNew)
    // With zero violations a null baseline still "passes" (nothing to regress on).
    assert.ok(result.pass)
  })

  it('handles undefined baseline (isNew)', () => {
    const result = compare({}, undefined)
    assert.ok(result.isNew)
    assert.ok(result.pass)
  })

  it('detects regression against null baseline when counts are non-zero', () => {
    const result = compare({ 'design/no-color-literal': 5 }, null)
    assert.ok(result.isNew)
    // No baseline means 0 baseline, so 5 > 0 = regression.
    assert.ok(!result.pass)
    assert.ok(result.regressions.includes('design/no-color-literal'))
  })

  it('reports unchanged rules correctly', () => {
    const counts = { 'design/no-color-literal': 4, 'design/no-arbitrary-scale': 10 }
    const result = compare(counts, buildBaseline(counts))
    assert.ok(result.pass)
    assert.ok(result.unchanged.includes('design/no-color-literal'))
    assert.ok(result.unchanged.includes('design/no-arbitrary-scale'))
  })

  it('exposes current and baseline counts', () => {
    const current = { 'design/no-color-literal': 2 }
    const baseline = buildBaseline({ 'design/no-color-literal': 5 })
    const result = compare(current, baseline)
    assert.equal(result.current['design/no-color-literal'], 2)
    assert.equal(result.baseline['design/no-color-literal'], 5)
  })
})

// ─── formatReport ─────────────────────────────────────────────────────────────

describe('formatReport', () => {
  it('includes PASS text on success', () => {
    const result = compare({ 'design/no-color-literal': 0 }, buildBaseline({ 'design/no-color-literal': 0 }))
    const report = formatReport(result, { colors: false })
    assert.ok(report.includes('Ratchet holds') || report.includes('ratchet'))
    assert.ok(!report.includes('FAILED'))
  })

  it('includes FAIL text and rule name on regression', () => {
    const result = compare(
      { 'design/no-color-literal': 5 },
      buildBaseline({ 'design/no-color-literal': 3 }),
    )
    const report = formatReport(result, { colors: false })
    assert.ok(report.includes('FAILED'))
    assert.ok(report.includes('no-color-literal'))
  })

  it('includes "No baseline" text when isNew', () => {
    const result = compare({}, null)
    const report = formatReport(result, { colors: false })
    assert.ok(report.includes('No baseline') || report.includes('baseline'))
  })

  it('includes the label when provided', () => {
    const result = compare({}, buildBaseline({}))
    const report = formatReport(result, { colors: false, label: 'apps/tangent' })
    assert.ok(report.includes('apps/tangent'))
  })

  it('produces plain text when colors: false', () => {
    const result = compare(
      { 'design/no-color-literal': 5 },
      buildBaseline({ 'design/no-color-literal': 3 }),
    )
    const report = formatReport(result, { colors: false })
    assert.ok(!report.includes('\x1b['))
  })

  it('produces ANSI sequences when colors: true', () => {
    const result = compare(
      { 'design/no-color-literal': 5 },
      buildBaseline({ 'design/no-color-literal': 3 }),
    )
    const report = formatReport(result, { colors: true })
    assert.ok(report.includes('\x1b['))
  })
})

// ─── DESIGN_RULES export ──────────────────────────────────────────────────────

describe('DESIGN_RULES', () => {
  it('exports the canonical list of rule IDs', () => {
    assert.ok(Array.isArray(DESIGN_RULES))
    assert.ok(DESIGN_RULES.every((r) => r.startsWith('design/')))
    assert.ok(DESIGN_RULES.includes('design/no-color-literal'))
    assert.ok(DESIGN_RULES.includes('design/no-arbitrary-scale'))
  })
})
