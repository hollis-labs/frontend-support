/**
 * THE COLOR CONTRACT — 48 names.
 *
 * The one rule: a component may name a token, never a value. This file is the
 * list of names it may name. It holds no colors; `themes/` holds those, and the
 * theme layer is the only layer permitted to name a color.
 *
 * Implements docs/token-contract.md §3 (CW-20260910-0111, approved review round 2).
 * Nothing here is a fresh design decision — every name earns its place by being
 * used in `libs/sysop-ui` or `apps/nanite` today, except `chart-1..5`, which is
 * flagged everywhere it appears.
 *
 * ORDER IS PART OF THE CONTRACT. The generated CSS, the editor metadata and the
 * lint vocabulary all iterate this array, so the grouping below is what a
 * reviewer sees in a diff.
 */
export const COLOR_TOKENS = [
  // Surfaces — §3.1. The ladder a component stacks on.
  'bg', 'bg-elevated', 'surface', 'surface-hover', 'surface-active',
  // Text — §3.2. Four descending steps; both implementations built this ramp.
  'fg', 'fg-secondary', 'fg-muted', 'fg-faint',
  // Borders — §3.3. Three ROLES, replacing `border-soft`/`border-strong`, whose
  // names named intensity and then contradicted it (`border-strong` was 80%
  // alpha of `border` — weaker than what it claimed to strengthen).
  'border', 'border-subtle', 'divider',
  // Interactive and identity — §3.4. `primary` and `brand` stay separate so an
  // app can be loudly branded without a loud UI. A theme may set them equal.
  'primary', 'primary-hover', 'primary-active', 'primary-muted', 'primary-fg',
  'brand', 'brand-hover', 'brand-active', 'brand-muted', 'brand-fg',
  'selection', 'selection-fg', 'ring',
  // Feedback — §3.5. CONTRACT, not idiom. The contract name is `danger`;
  // `destructive` exists only as a generated shadcn alias.
  'danger', 'danger-hover', 'danger-muted', 'danger-fg',
  'warning', 'warning-muted', 'warning-fg',
  'success', 'success-muted', 'success-fg',
  'info', 'info-muted', 'info-fg',
  // Charts — §3.6. NAMES ONLY. Every built-in theme ships an obvious placeholder;
  // the palette is a design pass that has not happened. See CHART_TOKENS.
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
  // Syntax — §3.10. Five roles for highlighting code, DERIVED per palette rather
  // than designed. Separate from charts on purpose; see SYNTAX_TOKENS.
  'syntax-key', 'syntax-string', 'syntax-number', 'syntax-boolean', 'syntax-null',
] as const

export type ColorToken = (typeof COLOR_TOKENS)[number]

/**
 * The one family neither implementation has, and the one place this package
 * deliberately ships a value nobody chose.
 *
 * Decided in review round 2: the names enter the contract so chart widgets stop
 * hardcoding hex, but five categorical colors that stay distinguishable across
 * five themes — two of them phosphor palettes, one high-contrast — and survive
 * colorblindness is real design work and it is Chrispian's. Every built-in theme
 * sets all five to PLACEHOLDER_CHART_COLOR, which is loud on purpose: five
 * identical magentas make a chart obviously wrong rather than quietly plausible.
 * Plausible-and-unreviewed is how four invented token names reached production.
 */
export const CHART_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const
export type ChartToken = (typeof CHART_TOKENS)[number]

/**
 * THE SYNTAX FAMILY — §3.10. Five roles for highlighting code.
 *
 * WHY THIS IS NOT `chart-1..5`, which is the first thing anyone will ask. Both
 * are categorical: five names, no semantics, a component picks by position. The
 * difference is the surface they land on, and it is not a preference.
 *
 *   charts paint FILLS  — large areas, WCAG's 3:1 bar, and they want the widest
 *                         separation the palette can give
 *   syntax paints TEXT  — small mono glyphs, WCAG's 4.5:1 bar, and every step
 *                         must stay legible against `bg`
 *
 * MEASURED, NOT ASSERTED. A five-stop ramp from `fg` to `bg` — the obvious
 * derivation, and the right one for fills — puts its bottom two steps at
 * 1.9 / 1.8 / 1.6 / 1.4 : 1 across the four sysop palettes. `syntax-boolean` and
 * `syntax-null` would fail AA in all four and `syntax-null` is invisible on
 * high-contrast. No single five-stop ramp clears both bars, so one family cannot
 * serve both roles. That is why these are five more names rather than five reused
 * ones, and it is the sentence that should stop someone merging them later.
 *
 * The values ARE derived (rule R4 in `themes/index.ts`) rather than designed:
 * 100/75/50/25/0 between each palette's own `fg` and `fg-faint`. That is a
 * deliberate difference from `chart-1..5`, which stays unfilled — a lightness
 * ramp between two steps the palette already chose invents no colour, whereas
 * five distinguishable series hues would.
 */
export const SYNTAX_TOKENS = [
  'syntax-key', 'syntax-string', 'syntax-number', 'syntax-boolean', 'syntax-null',
] as const
export type SyntaxToken = (typeof SYNTAX_TOKENS)[number]

/**
 * Not a design choice. A marker. Grep for it; it is meant to be found.
 *
 * Annotated `: string` rather than left to infer a literal type, on purpose:
 * nothing should be able to depend on WHICH placeholder this is, because it
 * changes the day the palette is designed. Compare against this constant, never
 * against the magenta.
 */
export const PLACEHOLDER_CHART_COLOR: string = '#ff00ff'

/** Every color token that is NOT part of the unreviewed chart family. */
export type ContractColorToken = Exclude<ColorToken, ChartToken>

/**
 * THE VALUE-LAYER PREFIX — `--hl-*`. Decided in review round 2 over `--c-*`.
 *
 * Two levels, and this is Nanite's design, not a new one:
 *
 *   --hl-*      layer 3  VALUES    the only layer that may name a color
 *   --color-*   layer 2  CONTRACT  what `@theme` exposes; what a component names
 *
 * A component names `bg-surface` and touches neither. `--color-*` is not a
 * choice — Tailwind v4 requires that namespace to generate `bg-*`/`text-*`
 * utilities. `--hl-*` is a choice, and it is namespaced because this package
 * goes to public npm where `--c-` would collide with any consumer using it for
 * "color" or "component".
 */
export const VALUE_PREFIX = 'hl'

/** Fonts — §3.9. Both implementations declare exactly these two. No third family
 * is in evidence anywhere in the portfolio. */
export const FONT_TOKENS = ['sans', 'mono'] as const
export type FontToken = (typeof FONT_TOKENS)[number]

/**
 * Default font stacks, at the VALUE layer — `--hl-font-sans` / `--hl-font-mono`.
 *
 * System stacks, and deliberately so: a tokens package that ships a webfont
 * makes every consumer pay for a network request and a licence decision it never
 * asked for. sysop-ui already made this call ("System font — no Geist"). Nanite
 * wants Inter and JetBrains Mono, and gets them by overriding one variable each
 * — the same two-level indirection the colours use, for the same reason.
 */
export const FONT_STACKS = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
} as const satisfies Record<FontToken, string>

/**
 * shadcn compatibility aliases — GENERATED, never authored by hand. §3.7.
 *
 * Vendored shadcn components name shadcn's tokens, and the registry will keep
 * producing them. Those names keep working as an alias layer; a component we
 * write never uses them. The evidence that this is an alias layer rather than
 * the primary vocabulary is that both codebases already treat it that way —
 * components name the short token 32:1 for the app canvas, 56:1 for primary
 * text, 11:1 for muted text.
 *
 * THIS MAP IS PART OF THE EXPORTED VOCABULARY, not an afterthought. CW-0117's
 * first pass omitted the alias layer and reported nine legitimate uses of
 * `primary-foreground` in Nanite as undefined tokens.
 *
 * Eight rows map a name onto itself (`primary`, `border`, `ring`, `chart-1..5`).
 * They are listed because they are part of shadcn's surface, and skipped by the
 * generator because there is nothing to alias.
 */
export const SHADCN_ALIASES = {
  background: 'bg',
  foreground: 'fg',
  card: 'bg-elevated',
  'card-foreground': 'fg',
  popover: 'bg-elevated',
  'popover-foreground': 'fg',
  muted: 'surface',
  'muted-foreground': 'fg-muted',
  secondary: 'surface',
  'secondary-foreground': 'fg',
  accent: 'selection',
  'accent-foreground': 'selection-fg',
  destructive: 'danger',
  'destructive-foreground': 'danger-fg',
  primary: 'primary',
  'primary-foreground': 'primary-fg',
  border: 'border',
  input: 'border-subtle',
  ring: 'ring',
  'chart-1': 'chart-1',
  'chart-2': 'chart-2',
  'chart-3': 'chart-3',
  'chart-4': 'chart-4',
  'chart-5': 'chart-5',
} as const satisfies Record<string, ColorToken>

export type ShadcnAlias = keyof typeof SHADCN_ALIASES

/** The aliases the generator actually emits — the ones that rename something. */
export const GENERATED_SHADCN_ALIASES = (
  Object.entries(SHADCN_ALIASES) as Array<[ShadcnAlias, ColorToken]>
).filter(([alias, target]) => alias !== target)

/**
 * RETIRED NAMES — a migration, never a void.
 *
 * Every name here renders correctly in the codebase it came from today. It is
 * being retired, not deleted, and a tool that reports it as "undefined" is
 * wrong: Tesseract reported 106 "renders nothing" errors that were all retired
 * names. `@hollis-labs/eslint-config-design` reads this map to say
 * "`border-strong` is retired — use `border`" instead of "unknown token".
 *
 * The left column is the old name as a component would have written it after the
 * utility prefix (`border-border-strong` → `border-strong`).
 */
export const DEPRECATED_TOKENS = {
  // §3.3 — the border call. These two are the substantive retirement.
  'border-strong': 'border',
  'border-soft': 'divider',
  // §9.2 — `panel-*` was never idiom; it is the kit's word for the surface ladder.
  panel: 'bg',
  'panel-2': 'bg-elevated',
  'panel-hover': 'surface-hover',
  // §3.2 — the kit's text ramp. `fg` beats `text` 1,829 to 123, and `text-text`
  // is an unfortunate utility name.
  text: 'fg',
  'text-muted': 'fg-secondary',
  'text-soft': 'fg-muted',
  'text-subtle': 'fg-faint',
  // §3.4 — the `accent` collision. Two implementations, opposite meanings.
  // The contract name for the neutral hover surface is `selection`; `accent`
  // survives only as a generated shadcn alias and is never authored.
  accent: 'selection',
  'accent-hover': 'surface-hover',
  'accent-active': 'surface-active',
  'accent-muted': 'brand-muted',
  'accent-fg': 'selection-fg',
  // §3.5 — Nanite's health triad is the feedback family at lower saturation.
  'status-ok': 'success',
  'status-warn': 'warning',
  'status-danger': 'danger',
  // §8 — the kit's danger-soft was one hue at 80% alpha doing a tint's job.
  'danger-soft': 'danger-muted',
  'ring-soft': 'ring',
  'toggle-on': 'primary',
} as const satisfies Record<string, ColorToken>

export type DeprecatedToken = keyof typeof DEPRECATED_TOKENS

/**
 * DROPPED, with no replacement — §3.7, §8, §9.2.
 *
 * Separate from DEPRECATED_TOKENS because there is nothing to migrate TO. Every
 * name here is either dead in its own codebase or deliberately left untokenised,
 * and pointing a migration at a token that does not exist would be worse than
 * saying so.
 */
export const DROPPED_TOKENS = {
  // 8 names, referenced zero times anywhere. Dead shadcn boilerplate.
  sidebar: 'Dead in sysop-ui — declared, never referenced. §3.7.',
  'sidebar-foreground': 'Dead in sysop-ui. §3.7.',
  'sidebar-primary': 'Dead in sysop-ui. §3.7.',
  'sidebar-primary-foreground': 'Dead in sysop-ui. §3.7.',
  'sidebar-accent': 'Dead in sysop-ui. §3.7.',
  'sidebar-accent-foreground': 'Dead in sysop-ui. §3.7.',
  'sidebar-border': 'Dead in sysop-ui. §3.7.',
  'sidebar-ring': 'Dead in sysop-ui. §3.7.',
  // Declared, referenced nowhere but their own declaration.
  'panel-hover-soft': 'Dead in sysop-ui. §8.',
  'panel-overlay': 'Dead in sysop-ui. §8.',
  'panel-overlay-strong': 'Dead in sysop-ui. §8.',
  shadow: "Tailwind's shadow-* scale serves this. §8.",
  'shadow-strong': "Tailwind's shadow-* scale serves this. §8.",
  // Deliberately not tokenised.
  overlay:
    'Scrim colour, left out as too thin — 1 reference in sysop-ui and it is inside ' +
    'theme.css itself; Nanite writes bg-black/50. Promote when a second consumer ' +
    'wants scrims themeable. §8, §12.7.',
} as const satisfies Record<string, string>

export type DroppedToken = keyof typeof DROPPED_TOKENS

/**
 * IDIOM PREFIXES — §9.3. Claiming one is a one-line PR to this array, so two
 * kits claiming the same prefix is a merge conflict rather than a silent overlap.
 *
 * An idiom token is `--color-<prefix>-<name>` and may only ADD. If the segment
 * after the prefix equals a contract name it is an error — a chat component that
 * wants the primary colour names `primary`.
 *
 * BURNED: `status`. The two implementations use `--color-status-*` for different
 * things — 12 workflow lifecycle states in sysop-ui, 3 health states in Nanite —
 * so it is available to neither. The dashboard vocabulary is `dash-status-*`.
 * RETIRED: `sidebar`.
 */
export const IDIOM_PREFIXES = ['dash', 'chat'] as const
export type IdiomPrefix = (typeof IDIOM_PREFIXES)[number]

/** Prefixes nobody may claim, and why. §9.2. */
export const UNAVAILABLE_IDIOM_PREFIXES = {
  status:
    'Burned. sysop-ui uses --color-status-* for 12 workflow lifecycle states and ' +
    'Nanite for 3 health states. Same prefix, incompatible meanings, both live.',
  sidebar: 'Retired. 8 names, zero references anywhere.',
} as const
