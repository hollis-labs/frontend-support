/**
 * THE SCALE CONTRACT — type, radius and letter-spacing.
 *
 * The one rule covers scale as much as colour, and scale is the larger half of
 * it: 1,783 arbitrary-value utilities against 24 component-level hex literals,
 * roughly seventy to one. `text-[13px]` names a value exactly as much as
 * `#1a1b26` does.
 *
 * Implements docs/token-contract.md §4 (type), §5 (radius), §6 (tracking).
 *
 * ── WHY THE VALUES ARE EXPORTED, NOT JUST THE NAMES ──────────────────────────
 * `@hollis-labs/eslint-config-design`'s `no-arbitrary-scale` rule has to tell
 * two things apart that need different treatment:
 *
 *   text-[13px]   restates `text-control` exactly   → unambiguous autofix
 *   text-[10.5px] is off the scale entirely         → a real violation
 *
 * It cannot do that from names. Until this file existed, that package carried
 * `CONTRACT_STEP_VALUES` as a documented fallback — flagged in its own source as
 * the one place it restates the contract, which is the third-list-that-drifts
 * problem the generated-CSS design exists to prevent. These three maps delete it.
 */

/* ────────────────────────────── TYPE SCALE ───────────────────────────────── */

/**
 * The four steps the contract ADDS. Tailwind v4 has no step below 12px and this
 * portfolio's UI density lives at 10–11px, so 712 arbitrary uses were people
 * reaching for a step that does not exist. A second gap sits at 13px.
 *
 * They get ROLE names rather than `2xs`/`3xs` ordinals because the sizes carry
 * role, measurably: at 8–9px, 44% of uses are uppercase and 54% mono; at 12px
 * that is 1% and 8%. An agent choosing between `text-2xs` and `text-3xs` is
 * guessing. Choosing `text-caption` is not.
 */
export const TEXT_TOKENS = ['micro', 'caption', 'label', 'control'] as const
export type TextToken = (typeof TEXT_TOKENS)[number]

/** Name → px. The unit is px because that is how the evidence was measured. */
export const TEXT_SCALE = {
  micro: 9, // Dense metadata, mono badges, keycaps. Replaces 56 arbitrary uses.
  caption: 10, // Captions and overlines. Usually mono + uppercase + tracking-label. 344.
  label: 11, // UI labels, table headers, chips, tab strips. 368 — the single biggest.
  control: 13, // Input, button and dense-table-body text. 79.
} as const satisfies Record<TextToken, number>

/* ───────────────────────────── RADIUS SCALE ──────────────────────────────── */

/**
 * `panel` is the one genuinely new step. `control` is an ALIAS of Tailwind's
 * `md` (6px), not a new value — it exists so the two-tier system that
 * `ChatComposer.tsx` described in a header comment and nowhere else gets a name:
 * "outer frame radius … 10px (outer envelope scale)", "the button radius matches
 * the new 6px inner-chrome scale".
 *
 * 149 of 212 arbitrary radius uses in the portfolio restate a Tailwind step
 * exactly; only 63 are genuinely off-scale, and 10px (23 uses) is the one gap.
 */
export const RADIUS_TOKENS = ['panel', 'control'] as const
export type RadiusToken = (typeof RADIUS_TOKENS)[number]

/** Name → px. */
export const RADIUS_SCALE = {
  panel: 10, // Outer frame of a major surface — panel, card, drawer, composer.
  control: 6, // Controls inside that frame. ALIAS of Tailwind's `md`.
} as const satisfies Record<RadiusToken, number>

/** `control` renames a Tailwind step; `panel` adds one. The generator needs both. */
export const RADIUS_ALIASES = { control: 'md' } as const

/* ──────────────────────────── TRACKING SCALE ─────────────────────────────── */

/**
 * A fourth scale, not in the original brief, found because the one rule covers
 * it: 119 uses written as 23 distinct spellings of 17 distinct values. Six
 * values are each written two ways — `.18em` and `0.18em` both appear, as do
 * `.14em`/`0.14em`, `.16em`/`0.16em`, `.2em`/`0.2em`, `.12em`/`0.12em`.
 *
 * The gap between 23 spellings and 17 values IS the finding.
 */
export const TRACKING_TOKENS = ['label', 'eyebrow'] as const
export type TrackingToken = (typeof TRACKING_TOKENS)[number]

/**
 * Name → em. Tailwind's top step is `widest` at 0.1em, so the uppercase
 * micro-label band (0.12–0.20em, 86 uses) sits ABOVE anything Tailwind offers —
 * the same shape of gap as the type scale.
 *
 * SUPERSEDED, and left here because the correction is the interesting part. This
 * read: "0.16 is the midpoint of that band, not a measured mode... the band's
 * two-way spellings make a true mode unrecoverable." The spellings do collapse —
 * `.16em` and `0.16em` are one value — but collapsing them and then COUNTING gives
 * a clear bimodal distribution rather than an unrecoverable one. The mode is 0.2
 * and 0.18, not the midpoint. A design pass did move it; see `label` below.
 */
export const TRACKING_SCALE = {
  // 0.18, NOT 0.16 — changed in review round 2 after the distribution was counted.
  //
  // This was 0.16 with a note two lines up admitting it: "the midpoint of that
  // band, not a measured mode." Counting the band rather than bracketing it gives
  // 8 sites at 0.2em, 7 at 0.18em, 4 at 0.14em, 1 at 0.12em — bimodal, with 15 of
  // 20 at 0.18 or above. A step at 0.16 landed BETWEEN the two largest clusters
  // and matched neither, which is why twenty sites stayed arbitrary rather than
  // folding: the scale was asking them to move to a value none of them had chosen.
  //
  // Naming the mode makes 7 exact and brings 8 more within 0.02. The question was
  // never whether those sites were sloppy.
  label: 0.18,
  // §11 — added in review round 2. The widest uppercase register: 10px, faint,
  // semibold. Two authors reached 0.28em independently — `empty-state`'s `eyebrow`
  // prop and `data-table`'s <thead> — in different packages, with the same
  // construction. That independent convergence is what made it a ROLE rather than
  // an outlier, and it is why the name is `eyebrow` and not `widest`.
  //
  // It sits well outside the 0.12-0.20em band `label` was derived from, which is
  // the other half of the argument: folding it there was a visible change, and
  // this package carried one for a while because an arbitrary value could not pass
  // the gate.
  eyebrow: 0.28,
} as const satisfies Record<TrackingToken, number>

/* ───────────────── TAILWIND'S OWN STEPS — INHERITED, IN ONE PLACE ─────────── */

/**
 * ── THE "CLOSING KEPT ALIVE" OBLIGATION ──────────────────────────────────────
 *
 * Chrispian chose EXTEND NOW, REVISIT CLOSING LATER over plain "extend" — so the
 * closed semantic scale is deferred, not rejected, and this package must not
 * make closing harder. Two things that costs, both cheap, both done:
 *
 *   1. The four new steps are emitted FROM `TEXT_TOKENS`, never hand-written
 *      into CSS. See generate/css.ts.
 *   2. Tailwind's inherited steps are listed HERE, in one place, and nowhere
 *      else in this package.
 *
 * Closing the scale later is then: ban these names in the lint config, add their
 * replacements to `TEXT_TOKENS`, regenerate. It is not re-authoring components.
 *
 * ── WHAT CLOSING WOULD ACTUALLY COST, so the revisit is a decision and not a
 *    re-investigation ───────────────────────────────────────────────────────
 *
 * Cheap, and already paid for:
 *   · This package — one array edit plus a regenerate. No new abstraction was
 *     built for it; the two points above are the whole mechanism.
 *   · The lint config — `no-arbitrary-scale` already merges inherited steps with
 *     contract steps from one object. Closing means passing a smaller inherited
 *     set.
 *
 * Expensive, and NOT paid for:
 *   · EVERY VENDORED shadcn COMPONENT. They name `text-sm` and `text-xs`, the
 *     registry keeps producing them, and shadcn went tri-substrate in July 2026
 *     with Base UI as its default — so the stream of new vendored components
 *     naming Tailwind steps continues indefinitely. Closing means rewriting each
 *     one on arrival, forever. This is the cost that decided "extend".
 *   · Measured today: `text-xs` 1,098 uses, `text-sm` 766, `text-base` 42,
 *     `lg`+ 90 across the two implementations. ~2,000 call sites to rewrite, of
 *     which the ones inside vendored components recur with every registry pull.
 *
 * ── AND THE ASYMMETRY THAT MAKES THE DOOR WORTH HOLDING OPEN ─────────────────
 * Extend-then-close BREAKS every consumer that used a step you remove.
 * Close-then-open is purely ADDITIVE. That is why closing was kept alive rather
 * than settled now: it is the reversible direction, and nothing above forecloses
 * it.
 */
export const INHERITED_TEXT_STEPS = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
  '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48,
  '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128,
} as const

/**
 * Tailwind's radius ladder, UNMODIFIED — and this is a fix, not a default.
 *
 * `libs/sysop-ui` overrides it (`--radius-sm: calc(var(--radius) * 0.75)` = 4.5px,
 * `--radius-lg` = 9px) and `apps/nanite` does not. So `rounded-sm` renders 4.5px
 * in one and 4px in the other, and a shared component that says `rounded-lg`
 * renders differently depending on which app imports it — silently, with no
 * error anywhere. Ending that is most of why this package exists.
 *
 * This package does NOT override these. The only addition is `panel`.
 */
export const INHERITED_RADIUS_STEPS = {
  none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24,
} as const

/** Tailwind's tracking ladder, em. Inherited unmodified. */
export const INHERITED_TRACKING_STEPS = {
  tighter: -0.05, tight: -0.025, normal: 0, wide: 0.025, wider: 0.05, widest: 0.1,
} as const

/**
 * SPACING GETS NO TOKENS, and that is a positive result rather than an omission.
 * Measured across five codebases: 6,751 named-step spacing utilities against 39
 * arbitrary ones — 99.4% adherence, by far the cleanest scale in the portfolio.
 * Tailwind's 4px-based scale IS the spacing contract; `--spacing` is not
 * overridden. When a scale exists and fits, people use it — which is the
 * strongest evidence that the type and radius scales are abused because they
 * have holes, not because anyone is careless.
 */
export const SPACING_IS_TAILWINDS = true

/** px → rem, at Tailwind's 16px root. Emitting rem keeps user font scaling working. */
export function remOf(px: number): string {
  const rem = px / 16
  return `${Number(rem.toFixed(6))}rem`
}
