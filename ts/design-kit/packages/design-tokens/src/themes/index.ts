import { NANITE_THEMES } from './nanite.js'
import { SYSOP_PALETTES } from './sysop.js'
import type { ColorToken } from '../tokens.js'
import { modesOf, type Theme, type ThemeMode } from '../theme.js'
import { derivedTokensFor } from '../derivation-plan.js'

export * from './nanite.js'
export * from './sysop.js'

/**
 * Ten built-in themes — and both working implementations survive whole.
 *
 * CW-0124 is explicit that losing either set costs the epic its working
 * examples, so both are here at full fidelity:
 *
 *   · SIX from `apps/nanite`, each with a complete dark AND light set. Verified
 *     independently: 12 value sets, one key set, zero drift — the property that
 *     made the typed-contract argument, reproduced rather than taken on trust.
 *   · FOUR from `libs/sysop-ui`, with light companions added in CW-20261001-0498.
 *
 * The fifth sysop palette in the brief does not exist. `theme.css` has FOUR
 * `[data-theme]` selectors plus a `:root` fallback that duplicates `p4-white`
 * declaration for declaration — a fallback, not a palette.
 */
export const BUILTIN_THEMES: readonly Theme[] = [...NANITE_THEMES, ...SYSOP_PALETTES]

/**
 * What `:root` renders before anything sets `[data-theme]`.
 *
 * `dir-a` — Graphite & Ink. Decided by Chrispian, 2026-09-10, on the §12.6
 * question the contract left open.
 *
 * NOT `nanite-default`, which is Nanite's own default and the obvious
 * inheritance. Direction C is a coherent theme doing exactly what it says —
 * "cool concrete, brand red as the only signal" — and that makes it a poor
 * default for a package whose contract just promoted success/warning/info/danger
 * to first-class names. Measured across its palette: `warning` and `danger` are
 * the same red (`#d4202e`), `success` is `#c0c4c8` and `info` is `#98a0a8` —
 * both greys. So a caution, a failure, a completion and a notice are three
 * colours between four semantics. THE DEFAULT COULD NOT DEMONSTRATE THE CONTRACT
 * IT SHIPS.
 *
 * Two criteria picked the replacement, and both matter more than taste:
 *
 *   · SEMANTIC CONVENTIONALITY. `dir-a` maps green / amber / red / blue onto
 *     success / warning / danger / info in the expected roles, so the default
 *     TEACHES the contract rather than merely satisfying it. `dir-b` was the
 *     other muted candidate and its `success` is gold, which reads as a warning.
 *     `dir-d` and `dir-e` are distinct but loud — Synthwave and Hacker/Terminal
 *     are aesthetic statements, not neutral starting points.
 *   · LIGHT MODE. At the original default decision the sysop palettes were dark-only, so any as the
 *     default would make the package's out-of-box experience dark-only while
 *     `Theme.tokens.light` is optional. All six Nanite themes carry both.
 *
 * `dir-a` is the only built-in that is both conventional and unopinionated, and
 * its muted register reads as a starting point rather than as someone's choice —
 * which is what a default for six board-shaped apps should do.
 *
 * `nanite-default` remains a built-in. Nothing is wrong with it except being the
 * default. `defaultDemonstratesSemanticRange` in test/themes.test.js is the guard
 * that keeps this decision from being undone by accident.
 */
export const DEFAULT_THEME_ID = 'dir-a'

export function getBuiltinTheme(id: string): Theme | undefined {
  return BUILTIN_THEMES.find((t) => t.id === id)
}

/** Tokens computed by the exported R1–R4 helpers. Authored contrast overrides
 * (three sysop danger-hover values) remain explicit in the palette source.
 * The same plan drives built-in construction and this provenance list. */
export const DERIVED_TOKEN_VALUES: ReadonlyArray<{
  theme: string
  mode: ThemeMode
  tokens: readonly ColorToken[]
}> = BUILTIN_THEMES.flatMap(theme => modesOf(theme).map(mode => ({
  theme: theme.id, mode, tokens: derivedTokensFor(theme.id, mode),
})))
