/**
 * The REAL contract, from @hollis-labs/design-tokens, plus the two idiom families
 * the discrimination tests need.
 *
 * This used to restate the 43 token names by hand because the tokens package was
 * an empty stub. It landed (d995bd6), so the restatement is gone — these tests now
 * run against the actual contract, and they fail if it changes underneath them,
 * which is the point.
 *
 * `mode-*` is added because NANITE declares `--color-mode-*` today and it is half
 * of the test case that matters most: `bg-mode-default` and `bg-bg-elevated` are
 * real tokens a structural parser calls invented, while `bg-bg-surface` is genuinely
 * invented. Under the contract Nanite's would become `chat-mode-*`, but the rule has
 * to be right about the vocabulary a repo ACTUALLY declares, so the fixture models
 * one that declares them.
 */
export {
  TEXT_TOKENS, RADIUS_TOKENS, TRACKING_TOKENS, IDIOM_PREFIXES,
  SHADCN_ALIASES, DEPRECATED_TOKENS,
  INHERITED_TEXT_STEPS, INHERITED_RADIUS_STEPS, INHERITED_TRACKING_STEPS,
  TEXT_SCALE, RADIUS_SCALE, TRACKING_SCALE,
} from '@hollis-labs/design-tokens'

import { COLOR_TOKENS as CONTRACT_COLORS } from '@hollis-labs/design-tokens'

export const COLOR_TOKENS = [
  ...CONTRACT_COLORS,
  'mode-default', 'mode-planner', 'mode-architect', 'mode-writer',
]
