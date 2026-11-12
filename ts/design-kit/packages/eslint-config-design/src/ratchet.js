/**
 * Baseline/ratchet support for eslint-config-design.
 *
 * The ratchet solves the adoption problem: a codebase with 1,000 existing
 * violations can adopt the gate today, record those violations as its baseline,
 * and fail CI only when someone ADDS a new one. The count can only go down.
 *
 * DESIGN PRINCIPLES
 *
 * 1. Per-rule, per-app granularity. A single integer per rule is not enough: a
 *    count increase in `no-arbitrary-scale` while `no-color-literal` is cleaned
 *    up must still fail. Rule totals are stored and compared individually.
 *
 * 2. Zero-dependency. The ratchet is pure Node.js with no imports from outside
 *    this package. The script layer brings in ESLint; the logic layer does not.
 *
 * 3. Fail direction is conservative. If a rule is present in the current run
 *    but absent from the baseline, the baseline is treated as 0 for that rule —
 *    the ratchet records what it saw, so a new rule is a new obligation.
 *
 * 4. The baseline is a JSON file checked into the consuming repo. It records the
 *    snapshot that CI will compare against. Updating it is intentional and
 *    auditable — the diff says "we fixed 30 violations" or "we are accepting 5
 *    new ones as technical debt".
 *
 *    Default filename: `.eslint-design-baseline.json`
 *    Recommended location: repo root (committed, not gitignored).
 *
 * 5. The ratchet does not prescribe ESLint configuration. The calling script
 *    builds the ESLint instance with the project's own config, then passes the
 *    LintResult[] array here.
 *
 * BASELINE FILE FORMAT
 *
 * {
 *   "version": 1,
 *   "recorded": "2026-10-01T18:00:00Z",
 *   "note": "optional human note",
 *   "counts": {
 *     "design/no-color-literal":        4,
 *     "design/no-raw-palette-utility":   0,
 *     "design/no-arbitrary-scale":     650,
 *     "design/no-undefined-token":       2,
 *     "design/no-idiom-shadowing-contract": 0,
 *     "design/require-disable-reason":   0
 *   }
 * }
 *
 * RATCHET RESULT FORMAT (returned by compare())
 *
 * {
 *   pass: boolean,
 *   current:  { [ruleId]: number },
 *   baseline: { [ruleId]: number },    // {} if no baseline exists
 *   delta:    { [ruleId]: number },    // positive = REGRESSION, negative = improvement
 *   regressions: string[],             // ruleIds that increased
 *   improvements: string[],            // ruleIds that decreased
 *   unchanged: string[],
 *   isNew: boolean,                    // true when no baseline existed
 * }
 */

/** All rule IDs this package enforces, in column order for reports. */
export const DESIGN_RULES = [
  'design/no-color-literal',
  'design/no-raw-palette-utility',
  'design/no-arbitrary-scale',
  'design/no-undefined-token',
  'design/no-idiom-shadowing-contract',
  'design/require-disable-reason',
]

/**
 * Count violations per design rule in an ESLint LintResult array.
 *
 * @param {import('eslint').ESLint.LintResult[]} results
 * @param {string[]} [rules] — which ruleIds to count; defaults to DESIGN_RULES
 * @returns {{ [ruleId: string]: number }}
 */
export function countByRule(results, rules = DESIGN_RULES) {
  const counts = Object.fromEntries(rules.map((r) => [r, 0]))
  for (const file of results) {
    for (const msg of file.messages) {
      if (msg.fatal || msg.ruleId === null) continue
      if (counts[msg.ruleId] !== undefined) counts[msg.ruleId]++
    }
  }
  return counts
}

/**
 * Build a baseline object ready to be serialized to JSON.
 *
 * @param {{ [ruleId: string]: number }} counts
 * @param {{ note?: string }} [options]
 * @returns {BaselineFile}
 */
export function buildBaseline(counts, { note } = {}) {
  const out = {
    version: 1,
    recorded: new Date().toISOString(),
    counts,
  }
  if (note) out.note = note
  return out
}

/**
 * Serialize a baseline to a JSON string (with trailing newline).
 *
 * @param {BaselineFile} baseline
 * @returns {string}
 */
export function serializeBaseline(baseline) {
  return JSON.stringify(baseline, null, 2) + '\n'
}

/**
 * Parse a baseline JSON string. Throws if the format is unrecognised.
 *
 * @param {string} json
 * @returns {BaselineFile}
 */
export function parseBaseline(json) {
  let data
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('eslint-design baseline: invalid JSON')
  }
  if (data.version !== 1) {
    throw new Error(`eslint-design baseline: unknown version ${data.version}`)
  }
  if (!data.counts || typeof data.counts !== 'object') {
    throw new Error('eslint-design baseline: missing or invalid "counts" field')
  }
  return data
}

/**
 * Compare current counts against a baseline (which may be null/undefined when
 * no baseline file exists yet).
 *
 * Returns a RatchetResult describing whether the ratchet holds.
 *
 * @param {{ [ruleId: string]: number }} current
 * @param {BaselineFile | null | undefined} baseline
 * @returns {RatchetResult}
 */
export function compare(current, baseline) {
  const isNew = baseline == null
  const baselineCounts = isNew ? {} : (baseline.counts ?? {})

  // Union of all rules seen in either current or baseline.
  const allRules = new Set([...Object.keys(current), ...Object.keys(baselineCounts)])

  const delta = {}
  const regressions = []
  const improvements = []
  const unchanged = []

  for (const rule of allRules) {
    const cur = current[rule] ?? 0
    const bas = baselineCounts[rule] ?? 0
    delta[rule] = cur - bas

    if (delta[rule] > 0) regressions.push(rule)
    else if (delta[rule] < 0) improvements.push(rule)
    else unchanged.push(rule)
  }

  return {
    pass: regressions.length === 0,
    current,
    baseline: baselineCounts,
    delta,
    regressions,
    improvements,
    unchanged,
    isNew,
  }
}

/**
 * Format a human-readable report of the ratchet result.
 *
 * @param {RatchetResult} result
 * @param {{ colors?: boolean, label?: string }} [options]
 * @returns {string}
 */
export function formatReport(result, { colors = false, label = '' } = {}) {
  const c = colors ? ansi : noAnsi
  const lines = []

  const header = label ? `eslint-design ratchet — ${label}` : 'eslint-design ratchet'
  lines.push(c.bold(header))

  if (result.isNew) {
    lines.push(c.yellow('  No baseline found — this is a first run. Use --update to record one.'))
  }

  // Rule-by-rule table
  const rules = [...new Set([
    ...DESIGN_RULES,
    ...Object.keys(result.current),
    ...Object.keys(result.baseline),
  ])]

  const colW = 38
  const numW = 8

  lines.push('')
  lines.push(
    '  ' + 'rule'.padEnd(colW) +
    'baseline'.padStart(numW) +
    'current'.padStart(numW) +
    'delta'.padStart(numW),
  )
  lines.push('  ' + '-'.repeat(colW + numW * 3))

  for (const rule of rules) {
    const cur = result.current[rule] ?? 0
    const bas = result.baseline[rule] ?? 0
    const d = result.delta[rule] ?? 0

    let deltaStr = d === 0 ? '' : (d > 0 ? `+${d}` : String(d))
    let curStr = String(cur)

    if (d > 0) {
      deltaStr = c.red(deltaStr)
      curStr = c.red(curStr)
    } else if (d < 0) {
      deltaStr = c.green(deltaStr)
      curStr = c.green(curStr)
    }

    const shortRule = rule.replace('design/', '')
    lines.push(
      '  ' + shortRule.padEnd(colW) +
      String(bas).padStart(numW) +
      curStr.padStart(numW + (d !== 0 ? colorWidth(c, d > 0) : 0)) +
      deltaStr.padStart(numW + (d !== 0 ? colorWidth(c, d > 0) : 0)),
    )
  }

  lines.push('')

  if (result.regressions.length > 0) {
    lines.push(c.red('  ✗ RATCHET FAILED — new violations introduced:'))
    for (const r of result.regressions) {
      const d = result.delta[r]
      lines.push(c.red(`    ${r}: +${d}`))
    }
    lines.push('')
    lines.push('  To fix: remove the new violations, then re-run.')
    lines.push('  To accept as debt: run with --update to advance the baseline.')
  } else if (result.isNew) {
    lines.push(c.yellow('  No baseline to compare. Run with --update to record one.'))
  } else {
    const totalImproved = result.improvements.reduce((s, r) => s + Math.abs(result.delta[r]), 0)
    if (totalImproved > 0) {
      lines.push(c.green(`  ✓ Ratchet holds — ${totalImproved} violation(s) fixed since baseline.`))
    } else {
      lines.push(c.green('  ✓ Ratchet holds — no new violations.'))
    }
  }

  lines.push('')
  return lines.join('\n')
}

// ─── ANSI helpers ────────────────────────────────────────────────────────────

const ansi = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
}

const noAnsi = {
  bold: (s) => s,
  red: (s) => s,
  green: (s) => s,
  yellow: (s) => s,
}

/** Extra width that ANSI escape sequences add to a colored string. */
function colorWidth(c, isRed) {
  // When colors are disabled noAnsi is used and widths are exact.
  return c === noAnsi ? 0 : (isRed ? '\x1b[31m\x1b[0m'.length : '\x1b[32m\x1b[0m'.length)
}

/**
 * @typedef {{
 *   version: 1,
 *   recorded: string,
 *   note?: string,
 *   counts: { [ruleId: string]: number }
 * }} BaselineFile
 *
 * @typedef {{
 *   pass: boolean,
 *   current:  { [ruleId: string]: number },
 *   baseline: { [ruleId: string]: number },
 *   delta:    { [ruleId: string]: number },
 *   regressions: string[],
 *   improvements: string[],
 *   unchanged: string[],
 *   isNew: boolean,
 * }} RatchetResult
 */
