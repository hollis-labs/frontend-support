/**
 * The scale contract — and the invariants that keep "closing the scale later"
 * cheap.
 *
 * Scale is the larger half of the one rule: 1,783 arbitrary-value utilities
 * against 24 component-level hex literals.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TEXT_TOKENS, TEXT_SCALE, RADIUS_TOKENS, RADIUS_SCALE, RADIUS_ALIASES,
  TRACKING_TOKENS, TRACKING_SCALE,
  INHERITED_TEXT_STEPS, INHERITED_RADIUS_STEPS, INHERITED_TRACKING_STEPS, remOf,
} from '../dist/index.js'

const pairs = [
  ['text', TEXT_TOKENS, TEXT_SCALE],
  ['radius', RADIUS_TOKENS, RADIUS_SCALE],
  ['tracking', TRACKING_TOKENS, TRACKING_SCALE],
]

test('every scale map covers exactly its token list — no extras, no gaps', () => {
  // This is the export CW-0117 is blocked on. A name with no value is useless to
  // `no-arbitrary-scale`: it cannot tell "restates text-control" (an autofix)
  // from "off the scale" (a real violation) without the number.
  for (const [name, names, scale] of pairs) {
    assert.deepEqual(Object.keys(scale).sort(), [...names].sort(), name)
  }
})

test('every scale value is a finite number, not a CSS string', () => {
  // The lint config runs Number(v) over these. A '9px' would silently become NaN
  // and the rule would stop recognising the step it is named after.
  for (const [name, , scale] of pairs) {
    for (const [k, v] of Object.entries(scale)) {
      assert.equal(typeof v, 'number', `${name}.${k}`)
      assert.ok(Number.isFinite(v), `${name}.${k}`)
    }
  }
})

test('the four new type steps are the band Tailwind does not serve', () => {
  // Root cause, and it is not laziness: Tailwind v4 has no step below 12px, and
  // this portfolio's density lives at 10-11px. 712 arbitrary uses are people
  // reaching for a step that does not exist.
  assert.deepEqual(TEXT_SCALE, { micro: 9, caption: 10, label: 11, control: 13 })
  const inherited = Object.values(INHERITED_TEXT_STEPS)
  for (const [name, px] of Object.entries(TEXT_SCALE)) {
    if (name === 'control') continue // the 13px gap sits BETWEEN xs and sm
    assert.ok(px < Math.min(...inherited), `${name} (${px}px) is not below Tailwind's floor`)
  }
  assert.equal(Math.min(...inherited), 12)
  assert.ok(TEXT_SCALE.control > 12 && TEXT_SCALE.control < 14, 'control fills the xs/sm gap')
})

test('THE CLOSING-KEPT-ALIVE INVARIANT — new steps stay distinguishable', () => {
  // Chrispian chose extend-now-revisit-closing-later over plain extend, so the
  // implementation must not make closing harder. Concretely: no added step may
  // share a NAME or a VALUE with an inherited one, or the two sets stop being
  // separable and closing becomes an audit instead of an array edit.
  for (const [names, scale, inherited, label] of [
    [TEXT_TOKENS, TEXT_SCALE, INHERITED_TEXT_STEPS, 'text'],
    [TRACKING_TOKENS, TRACKING_SCALE, INHERITED_TRACKING_STEPS, 'tracking'],
  ]) {
    for (const n of names) assert.ok(!(n in inherited), `${label}: ${n} collides with a Tailwind name`)
    const inheritedValues = new Set(Object.values(inherited))
    for (const n of names) {
      assert.ok(!inheritedValues.has(scale[n]), `${label}: ${n} restates a Tailwind value`)
    }
  }
})

test('radius: one new step and one deliberate alias', () => {
  // `panel` 10px is the one real gap (23 uses). `control` renames Tailwind's
  // `md` so ChatComposer's undocumented "6px inner-chrome scale" has a name.
  assert.deepEqual(RADIUS_SCALE, { panel: 10, control: 6 })
  assert.equal(RADIUS_ALIASES.control, 'md')
  assert.equal(RADIUS_SCALE.control, INHERITED_RADIUS_STEPS.md, 'control must equal md exactly')
  assert.ok(!Object.values(INHERITED_RADIUS_STEPS).includes(RADIUS_SCALE.panel), 'panel is new')
})

test("Tailwind's radius ladder is NOT overridden — this is the silent-divergence fix", () => {
  // sysop-ui overrides it (`--radius-sm` 4.5px, `--radius-lg` 9px) and Nanite
  // does not, so `rounded-lg` renders 9px or 8px depending on which app imports
  // a shared component. No error anywhere. Ending that is most of why this
  // package exists, so the real Tailwind values are asserted here rather than
  // trusted.
  assert.equal(INHERITED_RADIUS_STEPS.xs, 2)
  assert.equal(INHERITED_RADIUS_STEPS.sm, 4)
  assert.equal(INHERITED_RADIUS_STEPS.md, 6)
  assert.equal(INHERITED_RADIUS_STEPS.lg, 8)
  assert.equal(INHERITED_RADIUS_STEPS.xl, 12)
  assert.equal(INHERITED_RADIUS_STEPS['2xl'], 16)
})

test('tracking-label sits above anything Tailwind offers', () => {
  assert.equal(TRACKING_SCALE.label, 0.18)
  assert.ok(TRACKING_SCALE.label > INHERITED_TRACKING_STEPS.widest)
})

test('px -> rem conversion is exact at Tailwind\'s 16px root', () => {
  assert.equal(remOf(16), '1rem')
  assert.equal(remOf(9), '0.5625rem')
  assert.equal(remOf(10), '0.625rem')
  assert.equal(remOf(11), '0.6875rem')
  assert.equal(remOf(13), '0.8125rem')
})

test('the scale maps match what the contract document states in prose', () => {
  // Derived independently from docs/token-contract.md SS4 / SS5 / SS6 and pinned
  // here, so a future edit to either has to be a deliberate edit to both.
  assert.deepEqual(
    { text: TEXT_SCALE, radius: RADIUS_SCALE, tracking: TRACKING_SCALE },
    {
      text: { micro: 9, caption: 10, label: 11, control: 13 },
      radius: { panel: 10, control: 6 },
      tracking: { label: 0.18, eyebrow: 0.28 },
    },
  )
})
