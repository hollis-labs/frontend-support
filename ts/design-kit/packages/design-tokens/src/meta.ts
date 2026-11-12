import { COLOR_TOKENS } from './tokens.js'
import type { ColorToken } from './tokens.js'
import type { TokenCategory, TokenMeta } from './theme.js'

/**
 * Editor metadata for all 48 tokens.
 *
 * Typed as `Record<ColorToken, …>` rather than an array, so a token added to the
 * contract without a label is a compile error at this file rather than a blank
 * row in a theme editor. Nanite's `TOKEN_META` was an array and drifted; this is
 * the same data with the compiler holding it.
 *
 * The `description` column is where the contract's meaning table lives, because
 * that is the text an agent or a designer actually reads at the point of choice.
 */
const META: Record<ColorToken, Omit<TokenMeta, 'key'>> = {
  /* Surfaces — §3.1 */
  bg: { label: 'Background', category: 'surfaces', description: 'The app canvas. The bottom-most surface.' },
  'bg-elevated': { label: 'Elevated surface', category: 'surfaces', description: 'A raised surface — cards, popovers, modals, drawers.' },
  surface: { label: 'Surface', category: 'surfaces', description: 'Interactive chrome fill — buttons, inputs, chips, list rows.' },
  'surface-hover': { label: 'Surface hover', category: 'surfaces', description: '`surface` under the pointer.' },
  'surface-active': { label: 'Surface active', category: 'surfaces', description: '`surface` pressed, selected, or open.' },

  /* Text — §3.2 */
  fg: { label: 'Primary text', category: 'text', description: 'Primary text. Sits on any surface.' },
  'fg-secondary': { label: 'Secondary text', category: 'text', description: 'Supporting copy, inactive nav.' },
  'fg-muted': { label: 'Muted text', category: 'text', description: 'Meta text — timestamps, counts, hints.' },
  'fg-faint': { label: 'Faint text', category: 'text', description: 'Disabled text and placeholders.' },

  /* Borders — §3.3 */
  border: { label: 'Border', category: 'borders', description: 'The default visible edge of a panel or control.' },
  'border-subtle': { label: 'Border subtle', category: 'borders', description: 'A quieter edge — secondary grouping, nested containers.' },
  divider: { label: 'Divider', category: 'borders', description: 'A hairline between rows or sections. Not an outline.', allowsAlpha: true },

  /* Primary — §3.4 */
  primary: { label: 'Primary', category: 'primary', description: 'The workhorse highlight — CTAs, links, active nav, selected state.' },
  'primary-hover': { label: 'Primary hover', category: 'primary' },
  'primary-active': { label: 'Primary active', category: 'primary' },
  'primary-muted': { label: 'Primary muted', category: 'primary', allowsAlpha: true, description: 'Low-alpha primary tint used AS A BACKGROUND. Its paired text is `primary`, never `primary-fg`.' },
  'primary-fg': { label: 'Primary foreground', category: 'primary', description: 'Text and icons on a solid `primary` fill.' },

  /* Brand — §3.4. Separate from primary on purpose: it is what lets an app be
     loudly branded without a loud UI. A theme may set them equal. */
  brand: { label: 'Brand', category: 'brand', description: 'Rare identity moments — logo, brandmark, marketing accent.' },
  'brand-hover': { label: 'Brand hover', category: 'brand' },
  'brand-active': { label: 'Brand active', category: 'brand' },
  'brand-muted': { label: 'Brand muted', category: 'brand', allowsAlpha: true, description: 'Low-alpha brand tint used as a background.' },
  'brand-fg': { label: 'Brand foreground', category: 'brand', description: 'Text and icons on a solid `brand` fill.' },

  /* Selection — §3.4. The contract name for shadcn's "accent" semantic. */
  selection: { label: 'Selection', category: 'selection', description: 'Neutral hover / focus surface on menus, lists, options, command palettes.', allowsAlpha: true },
  'selection-fg': { label: 'Selection foreground', category: 'selection', description: 'Text on `selection`.' },
  ring: { label: 'Focus ring', category: 'selection', description: 'Focus indicator; render at full strength against the surrounding surface.', allowsAlpha: true },

  /* Feedback — §3.5. Contract, not idiom. */
  danger: { label: 'Danger', category: 'feedback', description: 'Destructive action, error, failure.' },
  'danger-hover': { label: 'Danger hover', category: 'feedback', description: '`danger` under the pointer. The only feedback family with a hover step — §3.8 rule 2.' },
  'danger-muted': { label: 'Danger muted', category: 'feedback', allowsAlpha: true, description: 'Low-alpha tint behind error content.' },
  'danger-fg': { label: 'Danger foreground', category: 'feedback', description: 'Text and icons on a solid `danger` fill.' },
  warning: { label: 'Warning', category: 'feedback', description: 'Caution, pending approval, rate limit, degraded.' },
  'warning-muted': { label: 'Warning muted', category: 'feedback', allowsAlpha: true, description: 'Low-alpha tint behind warning content.' },
  'warning-fg': { label: 'Warning foreground', category: 'feedback', description: 'Text and icons on a solid `warning` fill. The member whose absence got `text-warning-fg` written anyway — §3.8 rule 1.' },
  success: { label: 'Success', category: 'feedback', description: 'Completion, healthy, passed.' },
  'success-muted': { label: 'Success muted', category: 'feedback', allowsAlpha: true, description: 'Low-alpha tint behind success content.' },
  'success-fg': { label: 'Success foreground', category: 'feedback', description: 'Text and icons on a solid `success` fill.' },
  info: { label: 'Info', category: 'feedback', description: 'Neutral informational.' },
  'info-muted': { label: 'Info muted', category: 'feedback', allowsAlpha: true, description: 'Low-alpha tint behind informational content.' },
  'info-fg': { label: 'Info foreground', category: 'feedback', description: 'Text and icons on a solid `info` fill.' },

  /* Charts — §3.6. NAMES ONLY; the palette is an unfinished design pass. */
  'chart-1': { label: 'Chart series 1', category: 'chart', description: 'PLACEHOLDER — not a designed value. See PLACEHOLDER_CHART_COLOR.' },
  'chart-2': { label: 'Chart series 2', category: 'chart', description: 'PLACEHOLDER — not a designed value.' },
  'chart-3': { label: 'Chart series 3', category: 'chart', description: 'PLACEHOLDER — not a designed value.' },
  'chart-4': { label: 'Chart series 4', category: 'chart', description: 'PLACEHOLDER — not a designed value.' },
  'chart-5': { label: 'Chart series 5', category: 'chart', description: 'PLACEHOLDER — not a designed value.' },

  /* Syntax — §3.10. Derived per palette, not designed. Rule R4. */
  'syntax-key': { label: 'Syntax — key', category: 'syntax', description: 'Object keys and field names. The brightest step: `fg` itself.' },
  'syntax-string': { label: 'Syntax — string', category: 'syntax', description: 'Quoted string values.' },
  'syntax-number': { label: 'Syntax — number', category: 'syntax', description: 'Numeric literals.' },
  'syntax-boolean': { label: 'Syntax — boolean', category: 'syntax', description: 'Boolean literals.' },
  'syntax-null': { label: 'Syntax — null', category: 'syntax', description: 'Null and absent values. The faintest step: `fg-faint` itself.' },
}

/** In contract order — the order a reviewer sees in a diff. */
export const TOKEN_META: readonly TokenMeta[] = COLOR_TOKENS.map((key) => ({ key, ...META[key] }))

export const CATEGORIES: ReadonlyArray<{ id: TokenCategory; label: string; description: string }> = [
  { id: 'surfaces', label: 'Surfaces', description: 'The ladder a component stacks on' },
  { id: 'text', label: 'Text', description: 'Four descending steps' },
  { id: 'borders', label: 'Borders', description: 'Three roles, not three intensities' },
  { id: 'primary', label: 'Primary', description: 'The workhorse highlight' },
  { id: 'brand', label: 'Brand', description: 'Identity — use sparingly' },
  { id: 'selection', label: 'Selection & focus', description: 'Neutral hover, and the focus ring' },
  { id: 'feedback', label: 'Feedback', description: 'Danger, warning, success, info' },
  { id: 'chart', label: 'Charts', description: 'Categorical series — placeholder values' },
  { id: 'syntax', label: 'Syntax', description: 'Code highlighting — a lightness ramp, derived per palette' },
]

/** Metadata for one token. Total, because META is total. */
export function metaFor(key: ColorToken): TokenMeta {
  return { key, ...META[key] }
}

export function tokensInCategory(category: TokenCategory): ColorToken[] {
  return TOKEN_META.filter((m) => m.category === category).map((m) => m.key)
}
