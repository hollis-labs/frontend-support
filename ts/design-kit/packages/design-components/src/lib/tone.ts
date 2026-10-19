import {
  TONES as CONTRACT_TONES,
  type Tone as ContractTone,
  type Accent as ContractAccent,
} from '@hollis-labs/design-tokens'

/**
 * THE ONE TONE SCALE, DEFINED ONCE.
 *
 * `pill.tsx`, `callout.tsx` and `live-dot.tsx` each carried their own copy of this
 * map in sysop-ui — `pill` and `callout` byte-identical, `live-dot` the dot-only
 * subset. That triplication is why 28 of the 37 status-vocabulary occurrences
 * CW-0116 found in base-bound files collapse into a single fix.
 *
 * IT WAS ALSO THE MISCLASSIFICATION TRAP. All three look operations-specific
 * because their five generic tones were implemented with the twelve-value
 * operations status palette — `status-done` for success, `status-blocked` for
 * danger, `status-paused` for warning, `status-doing` for info. That is base with
 * a token bug, not kit: the vocabulary is `neutral | success | danger | warning |
 * info`, which every kit needs, and `pill.tsx`'s own doc comment already said it
 * is "not tied to the canonical status vocabulary".
 *
 * Base cannot name `status-*` at all — the contract BURNED that prefix, because
 * sysop-ui means twelve workflow states by it and Nanite means three health
 * states, so it is available to neither. The dashboard vocabulary is
 * `dash-status-*`.
 *
 * TYPED FROM THE CONTRACT, NOT RESTATED. `Tone` extends the contract's own
 * `Tone` — which design-tokens ships precisely for this, citing CW-0116's finding
 * that nine kit exports have a prop typed `string` and applied as a colour.
 * Removing a token from the contract now breaks this type rather than leaving a
 * prop pointing at nothing.
 */
export type Tone = ContractTone | 'neutral'

/** Every tone, `neutral` first — it is the default everywhere it appears. */
export const TONES = ['neutral', ...CONTRACT_TONES] as const satisfies readonly Tone[]

/**
 * Border + surface + text, per tone.
 *
 * The alpha construction (`/40` border, `/10` fill) is carried over deliberately:
 * only the HUE changes here, from the ops status palette to the contract's
 * feedback family, and that change is forced because base may not name
 * `status-*`. The contract also ships `success-muted` / `danger-muted` /
 * `warning-muted` / `info-muted` as designed tints, and switching the fills to
 * those would very likely be better — the contract's own note on retiring
 * `danger-soft` reads "one hue at 80% alpha doing a tint's job". That is an
 * appearance decision rather than a migration, so it is flagged for a review
 * round rather than taken here.
 */
export const TONE_CLASSES = {
  neutral: 'border-border bg-bg-elevated text-fg-muted',
  success: 'border-success/40 bg-success/10 text-success',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  info: 'border-info/40 bg-info/10 text-info',
} as const satisfies Record<Tone, string>

/** Solid fill per tone, for dots and bars. `neutral` is the faintest text step. */
export const TONE_FILL_CLASSES = {
  neutral: 'bg-fg-faint',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
} as const satisfies Record<Tone, string>

/**
 * ACCENTS — the tones plus `primary` and `brand`, again straight off the
 * contract. `Accent` is what a component offers when the choice is "tint this",
 * not "signal a state": a Metric's value, a section's edge.
 *
 * Kept beside the tones rather than in each component because two files needed
 * the same six names on the same day, which is how three copies of the tone map
 * happened in sysop-ui.
 */
export type Accent = ContractAccent | 'neutral'

/** Text colour per accent. */
export const ACCENT_TEXT_CLASSES = {
  neutral: 'text-fg',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  primary: 'text-primary',
  brand: 'text-brand',
} as const satisfies Record<Accent, string>

/** Left-edge colour per accent, for accent-bordered surfaces. */
export const ACCENT_BORDER_L_CLASSES = {
  neutral: 'border-l-border',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
  info: 'border-l-info',
  primary: 'border-l-primary',
  brand: 'border-l-brand',
} as const satisfies Record<Accent, string>
