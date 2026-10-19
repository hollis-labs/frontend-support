/**
 * @hollis-labs/design-tokens — layer 2 of the Hollis Labs frontend layering.
 *
 * THE ONE RULE: a component may name a token, never a value. This package is
 * the list of names it may name, the types that stop it naming one that does not
 * exist, and default values for both. It covers SCALE as much as colour —
 * `text-[13px]` names a value exactly as much as `#1a1b26` does.
 *
 * Implements docs/token-contract.md (CW-20260910-0111), approved review round 2.
 * No React, no components, no framework. See README.md.
 */

/* The contract — names, types, and the two-level layer model. */
export {
  COLOR_TOKENS, CHART_TOKENS, PLACEHOLDER_CHART_COLOR, SYNTAX_TOKENS,
  FONT_TOKENS, FONT_STACKS, VALUE_PREFIX,
  SHADCN_ALIASES, GENERATED_SHADCN_ALIASES,
  DEPRECATED_TOKENS, DROPPED_TOKENS,
  IDIOM_PREFIXES, UNAVAILABLE_IDIOM_PREFIXES,
} from './tokens.js'
export type {
  ColorToken, ChartToken, SyntaxToken, ContractColorToken, FontToken,
  ShadcnAlias, DeprecatedToken, DroppedToken, IdiomPrefix,
} from './tokens.js'

/**
 * The scales — NAMES AND VALUES.
 *
 * `TEXT_SCALE` / `RADIUS_SCALE` / `TRACKING_SCALE` are name → value maps, and
 * exporting the values rather than only the names is a hard requirement from
 * CW-20260910-0117. Its `no-arbitrary-scale` rule cannot tell `text-[13px]`
 * ("restates `text-control`" — an autofix) from `text-[10.5px]` ("off the scale"
 * — a real violation) without them, and those two need different messages. Until
 * these shipped, that package carried its own copy of the values as a documented
 * fallback, flagged in its source as the one place it restates the contract.
 * These exports delete it.
 */
export {
  TEXT_TOKENS, TEXT_SCALE,
  RADIUS_TOKENS, RADIUS_SCALE, RADIUS_ALIASES,
  TRACKING_TOKENS, TRACKING_SCALE,
  INHERITED_TEXT_STEPS, INHERITED_RADIUS_STEPS, INHERITED_TRACKING_STEPS,
  SPACING_IS_TAILWINDS, remOf,
} from './scales.js'
export type { TextToken, RadiusToken, TrackingToken } from './scales.js'

/* Theme types, and the prop types derived from the contract. */
export { modesOf, hasDesignedChartPalette, TONES, ACCENTS } from './theme.js'
export type {
  Theme, ThemeMode, TokenValues, TokenMeta, TokenCategory, Tone, Accent,
} from './theme.js'

/* Editor metadata. */
export { TOKEN_META, CATEGORIES, metaFor, tokensInCategory } from './meta.js'

/* The ten built-in themes, and the list of values in them that nobody chose. */
export {
  BUILTIN_THEMES, DEFAULT_THEME_ID, getBuiltinTheme, DERIVED_TOKEN_VALUES,
  NANITE_THEMES, SYSOP_PALETTES,
} from './themes/index.js'

/* The optional runtime layer. Nothing above needs it. */
export {
  applyTheme, clearThemeOverride, setTheme, setMode,
  currentTheme, currentMode, readToken, themeCss,
} from './apply.js'
export { THEME_STORAGE_KEY, readStoredTheme, persistTheme, type ThemeStorageOptions } from './storage.js'

/* The generator, exported so a consumer can emit CSS for its own themes. */
export { emitContractCss, emitThemeCss, emitThemesCss, emitBundleCss, emitAll } from './generate/css.js'

/* Theme-layer colour derivation rules (R1–R4). */
export { deriveMuted, mixSrgb, deriveHover, deriveActive, deriveSurfaceActive,
  relativeLuminance, contrastRatio, deriveForeground, deriveSyntax } from './derive.js'
export type { ColorRepresentation } from './derive.js'
