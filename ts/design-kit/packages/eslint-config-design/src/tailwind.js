/**
 * Tailwind facts the rules need. Values, not opinions — every constant here
 * describes what Tailwind v4 ships, so a rule can tell "you wrote a value that
 * already has a name" apart from "you wrote a value nothing names".
 *
 * The token VOCABULARY is deliberately not here. It comes from
 * @hollis-labs/design-tokens at config-build time (see vocabulary.js), because a
 * hardcoded copy would be a third list that drifts from the two the contract
 * just unified.
 */

/** The 22 Tailwind palette families. A component naming one is naming a value. */
export const PALETTE_FAMILIES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
]

/** Utility prefixes that take a color. Longest-first matters: `border-t` before `border`. */
export const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'border-t', 'border-r', 'border-b', 'border-l',
  'border-x', 'border-y', 'border-s', 'border-e',
  'ring', 'ring-offset', 'outline', 'divide', 'fill', 'stroke',
  'from', 'via', 'to', 'accent', 'caret', 'decoration', 'shadow', 'placeholder',
]

/**
 * Tailwind v4's type scale, px. The contract extends this rather than replacing
 * it, so these stay legal names — and an arbitrary value equal to one of them is
 * an unambiguous autofix.
 */
export const TW_TEXT_STEPS = {
  12: 'xs', 14: 'sm', 16: 'base', 18: 'lg', 20: 'xl', 24: '2xl', 30: '3xl',
  36: '4xl', 48: '5xl', 60: '6xl', 72: '7xl', 96: '8xl', 128: '9xl',
}

/**
 * Tailwind v4's radius scale, px. The contract does NOT override these — see
 * §5: sysop-ui overrides them today (`sm` 4.5px, `lg` 9px) and Nanite does not,
 * so `rounded-sm` renders two different ways across the portfolio. Any rule
 * reasoning about radius equivalence must assume Tailwind's real values.
 */
export const TW_RADIUS_STEPS = { 2: 'xs', 4: 'sm', 6: 'md', 8: 'lg', 12: 'xl', 16: '2xl' }

/** Tailwind v4's tracking scale, em. */
export const TW_TRACKING_STEPS = {
  '-0.05': 'tighter', '-0.025': 'tight', '0': 'normal',
  '0.025': 'wide', '0.05': 'wider', '0.1': 'widest',
}

/** Utility prefixes whose arbitrary values the contract gives tokens for. */
export const SCALE_PREFIXES = {
  text: 'type',
  rounded: 'radius',
  'rounded-t': 'radius', 'rounded-r': 'radius', 'rounded-b': 'radius', 'rounded-l': 'radius',
  'rounded-tl': 'radius', 'rounded-tr': 'radius', 'rounded-br': 'radius', 'rounded-bl': 'radius',
  'rounded-s': 'radius', 'rounded-e': 'radius', 'rounded-ss': 'radius', 'rounded-se': 'radius',
  'rounded-ee': 'radius', 'rounded-es': 'radius',
  tracking: 'tracking',
}

/**
 * Arbitrary-value prefixes the contract explicitly puts OUT of scope (§8).
 * Layout geometry and icon-sized boxes are one-off facts, not a repeated design
 * decision — `h-[18px]` on an icon wrapper is legitimate in a way `text-[13px]`
 * is not. This list is why the scale rule does not have the false-positive
 * problem the task was warned about.
 */
export const NEVER_SCALE_PREFIXES = [
  'w', 'h', 'size', 'min-w', 'min-h', 'max-w', 'max-h',
  'top', 'right', 'bottom', 'left', 'inset', 'inset-x', 'inset-y',
  'translate-x', 'translate-y', 'z', 'basis', 'grid-cols', 'grid-rows',
  'col-span', 'row-span', 'order', 'flex', 'aspect', 'columns',
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
  'gap', 'gap-x', 'gap-y', 'space-x', 'space-y', 'leading', 'indent',
  'duration', 'delay', 'opacity', 'scale', 'rotate', 'blur', 'brightness',
  'shadow', 'bg', 'mask', 'bg-size', 'bg-position', 'transition',
]

/**
 * Tailwind VARIANT prefixes that take an arbitrary SELECTOR, not an arbitrary
 * value. `data-[side=right]:bg-surface` names a selector and a token — it is not
 * the defect the one rule describes. Measured 2026-09-11: 192 of the kit's 415
 * bracket utilities are these, which is most of why the kit looked denser on
 * scale than it is.
 */
export const ARBITRARY_VARIANT_PREFIXES = [
  'data', 'has', 'aria', 'supports', 'not', 'in', 'nth', 'nth-last',
  'group-data', 'group-has', 'group-aria', 'peer-data', 'peer-has', 'peer-aria',
  'min', 'max', 'where', 'is',
]

/** Longest-first so `border-t` wins over `border`. */
export function sortedByLength(prefixes) {
  return [...prefixes].sort((a, b) => b.length - a.length)
}
