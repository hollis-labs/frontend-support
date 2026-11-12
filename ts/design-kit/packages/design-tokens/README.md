# @hollis-labs/design-tokens

Layer 2 of the Hollis Labs frontend layering: **the token contract** — the names,
and their types — plus default values for them.

> **The one rule: a component may name a token, never a value.**
> It covers **scale** as much as colour. `text-[13px]` names a value exactly as
> much as `#1a1b26` does — and scale is the larger half, by about seventy to one.

No React. No components. No runtime dependencies; Tailwind v4 is an optional
build-tool peer for CSS consumers.

Implements the token contract (CW-20260910-0111, approved review round 2). Built
by CW-20260910-0124 as a **synthesis of two working implementations** —
`libs/sysop-ui` and `apps/nanite` — not an extraction of either.

Section references below (§3, §10, …) are to that contract, which lives at
[`docs/token-contract.md`](https://github.com/hollis-labs/design-kit/blob/main/docs/token-contract.md)
in this repo.

---

## Tailwind compatibility

The design-kit CSS pipeline requires **Tailwind CSS v4**. This package declares
`tailwindcss: ^4.0.0` as an optional peer because its nonvisual JavaScript APIs
also work without the CSS compiler. npm does not auto-install an optional peer
and produces **no warning when it is absent**; npm 11's default resolver rejects
an installed incompatible major.

When using the CSS pipeline, declare Tailwind in the app's build dependencies
and configure the matching Vite/PostCSS/CLI integration:

```sh
npm install -D tailwindcss@^4.0.0
```

A successful install alone does not verify CSS setup.

## Install and use

```bash
npm install @hollis-labs/design-tokens
```

### With Tailwind v4 — the normal case

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
```

That completes **tokens-only** setup. You now have `bg-surface`, `text-fg-muted`,
`border-border-subtle`, `rounded-panel`, `text-control`, `tracking-label`, the
shadcn alias layer, and ten themes that swap by attribute.

When adding styled components, also import
`@hollis-labs/design-components/source.css` and the chosen kit's registration
(`kit-chat/source.css`, or `kit-dashboard/theme.css` which includes it).
Tailwind does not scan dependency directories automatically. The
[adopter-path guide](https://github.com/hollis-labs/design-kit/blob/main/docs/adopter-path.md)
covers the full CSS wiring and focused production-browser verification; a green
build alone does not establish styling.

```html
<html data-theme="dir-a" data-mode="light">
```

- **`data-theme`** picks the theme. Omit it and you get the default, `dir-a`.
- **`data-mode="light"`** picks light. `class="light"` works too, because that is
  what Nanite's stylesheet already keys off.

Bring your own values instead of the built-ins:

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/tokens.css";   /* the contract, no values */
```

…then declare **all 50 base values: 48 colors plus `--hl-font-sans` and
`--hl-font-mono`**, or generate them (see *Emitting your own themes*). The
[adopter-path guide](https://github.com/hollis-labs/design-kit/blob/main/docs/adopter-path.md)
lists every declaration. `Theme.tokens` and
`emitThemeCss` cover colors only; include font declarations separately or use
`emitThemesCss`, which also emits default font stacks. Missing values have no
fallback and can silently produce transparent colors or browser-default fonts.
Run the consumer's formatter after generating its own stylesheet.

### Without Tailwind

`themes.css` is plain CSS custom properties, and `tokens.css` publishes the
contract layer as ordinary `--color-*` variables at `:root` as well as through
`@theme`. So `var(--color-fg)` works in hand-written CSS with no build step.

### From JavaScript

```ts
import {
  COLOR_TOKENS, TEXT_SCALE, BUILTIN_THEMES, getBuiltinTheme, applyTheme, readToken,
} from '@hollis-labs/design-tokens'
```

---

## What is in it

| | Count | |
|---|---|---|
| Colour tokens | **48** | §3 — 43 at landing, +5 for `syntax-*` (§3.10, review round 4) |
| shadcn aliases | **24 names, 16 generated** | §3.7 — see *Findings* |
| Font tokens | 2 | `--font-sans`, `--font-mono` |
| Type steps added | 4 | `micro` 9 · `caption` 10 · `label` 11 · `control` 13 |
| Radius steps added | 1 new + 1 alias | `panel` 10px · `control` = Tailwind's `md` |
| Tracking steps added | 2 | `tracking-label` 0.18em · `tracking-eyebrow` 0.28em |
| Spacing tokens | **0** | Tailwind's scale *is* the contract — 99.4% adherence already |
| Built-in themes | **10** | 6 from Nanite (dark + light), 4 from sysop-ui (dark + light) |

```
surfaces    bg  bg-elevated  surface  surface-hover  surface-active
text        fg  fg-secondary  fg-muted  fg-faint
borders     border  border-subtle  divider
primary     primary  primary-hover  primary-active  primary-muted  primary-fg
brand       brand  brand-hover  brand-active  brand-muted  brand-fg
selection   selection  selection-fg  ring
danger      danger  danger-hover  danger-muted  danger-fg
warning     warning  warning-muted  warning-fg
success     success  success-muted  success-fg
info        info  info-muted  info-fg
chart       chart-1 … chart-5          ← PLACEHOLDER VALUES. See below.
syntax      syntax-key  syntax-string  syntax-number  syntax-boolean  syntax-null
```

---

## The two layers

```
--hl-*       layer 3   VALUES     the ONLY layer that may name a colour
--color-*    layer 2   CONTRACT   what @theme exposes; what a component names
```

A component names `bg-surface` and touches neither. This indirection is **Nanite's
design**, not a new one — `index.css` already maps `--color-surface: var(--c-surface)`.
Only the value-layer prefix changed, from `--c-*` to `--hl-*`, decided in review
round 2: the value layer is internal, and a two-character prefix on public npm has
real collision surface.

`--color-*` is not a choice. Tailwind v4 requires that namespace to generate
`bg-*` / `text-*` / `border-*` utilities.

---

## The calls CW-0124 was asked to make, and why

### CSS-first or TS-first for values? — **Hybrid, and here is the "why"**

Neither alone, and the task asked for an argument rather than an assumption:

- **The CSS is authoritative at runtime.** One stylesheet, zero JavaScript, every
  theme. That is sysop-ui's property, it is what makes first paint correct and a
  server-rendered page themeable, and it is the only version that works for a
  consumer with no bundler.
- **The TypeScript is authoritative as a source.** It is the only form that can be
  type-checked, that a theme editor can enumerate, and that a charting library can
  read as strings.

The failure of picking one is symmetric and observable: CSS-only is what left
sysop-ui with no type contract at all, and TS-only is what makes Nanite need a
runtime step before anything is themed. **Generating one from the other gets both
properties from one source** — which is the only reason a hybrid is not just two
problems. Direction is TS → CSS (§10), the generated CSS is committed, and
`npm run generate:check` fails if the two disagree.

### One prefix or two? — **Two.** See *The two layers*.

### Dark/light as modes, or as sibling palettes? — **Modes, with dark-only allowed**

All built-ins now carry both modes (CW-20261001-0498). The sysop palettes retain
phosphor/neutral/high-contrast dark identity and add paper-and-ink light variants.
Custom themes may still omit `tokens.light` for compatibility.
See [appearance setup](../../docs/appearance.md) for controls and persistence.

### `@theme inline` for colours — **yes, and it is load-bearing**

Without `inline`, Tailwind resolves `--color-bg` at `:root`, so a `[data-theme]`
on anything below `<html>` silently changes nothing — descendants inherit an
already-resolved value. With it, the utility references `var(--hl-bg)` and
resolves at the element, so a themed *subtree* works. sysop-ui found this; Nanite
gets away without it only because its mode marker sits on the root.

Scale steps go in a plain `@theme` block: a scale step has no value layer beneath
it, and consumers benefit from `var(--text-label)` existing.

---

## `chart-1..5` ARE PLACEHOLDERS. Read this before using them.

Every built-in theme sets all five to the **same magenta**, and
`theme.chartPalette === 'placeholder'` says so in the data.

This is deliberate and it is not an oversight. The chart family is the one family
neither implementation had, and review round 2 was explicit: **the names enter the
contract; the palette is Chrispian's design pass.** Five categorical colours that
stay mutually distinguishable across ten themes — two of them phosphor palettes,
one high-contrast — and survive colourblindness is real design work.

Five identical magentas make a chart *obviously* wrong. Five plausible colours
would make it *quietly* unreviewed, and plausible-and-unreviewed is precisely how
four invented token names reached production in two separately-reviewed codebases.

```ts
import { hasDesignedChartPalette, getBuiltinTheme } from '@hollis-labs/design-tokens'
hasDesignedChartPalette(getBuiltinTheme('dir-a'))   // false, for every built-in
```

A test asserts this. When the design pass lands, that test should be updated
deliberately — not deleted in passing.

---

## Where the values came from

Both working implementations survive **whole**, because CW-0124 is explicit that
losing either costs the epic its working examples.

| Themes | From | Modes |
|---|---|---|
| `dir-a` (Graphite & Ink — **the default**), `dir-b`, `dir-d`, `dir-e`, `dir-f`, `nanite-default` (Concrete & Signal) | `apps/nanite` | dark **and** light |
| `sysop-p4-white`, `sysop-green-phosphor`, `sysop-amber-phosphor`, `sysop-hi-contrast` | `libs/sysop-ui` + new light companions | dark + light |

The original Nanite import recorded **12 value sets × 40 keys, one key set,
zero drift**. That describes the import, not the current palettes: subsequent
contrast corrections (0498) and the health-feedback decision (0035) deliberately
change authored values in this package.

### Health feedback — CW-20260913-0035

Keep the settled `success` / `warning` / `danger` names. Concrete's success keeps
the authored health green hue, and its warning keeps the health amber hue;
Flat/Mono warning also becomes amber, distinct from its orange danger. Existing
danger colors and every other palette stay unchanged. Brand red remains brand.
A quieter treatment uses the existing tint tokens, not a second health family.

The old Concrete health seeds are dark green `#6b9e8a` / amber `#b09060`, and light
green `#4a7a65` / amber `#8a6d3e`. The new values lighten/darken those seeds in
encoded sRGB to retain readable feedback text over all five surfaces, including
10% Pill/Callout fills. Flat/Mono uses the same amber seeds. This is an authored
palette correction, not a new derivation rule or a Nanite app migration.

| Theme/mode | Success | Warning | Minimum text contrast, plain / 10% fill |
| --- | --- | --- | --- |
| Concrete dark | `#cadcd5` | `#e2d6c4` | 5.68 / 4.62 |
| Concrete light | `#304f42` | `#594628` | 5.29 / 4.58 |
| Flat/Mono dark | unchanged | `#c6b08d` | 5.58 / 4.62 (warning) |
| Flat/Mono light | unchanged | `#4a3a21` | 5.28 / 4.56 (warning) |

Measured over `bg`, `bg-elevated`, `surface`, `surface-hover`, and `surface-active`;
the fill measurements use Chromium's actual alpha compositing. Matching
`success-muted` / `warning-muted` tints keep 10% alpha. Solid-fill foregrounds
remain black in dark mode and white in light mode. The four affected
`warning-fg` derivation-fixture entries remain unchanged; the fixture is preserved.

[Before/after health rows, all surfaces and contrast measurements](../../docs/screenshots/health-feedback/README.md)
are the visual review evidence. Labels and icons remain necessary; color alone
is not the indicator. Nanite adoption remains its own migration task.

### Why `dir-a` is the default, and not Nanite's own

Decided by Chrispian on the §12.6 question the contract left open. The obvious
inheritance was `nanite-default`, and at that decision it failed the one thing a default for this
package has to do — **demonstrate the contract it ships.** Direction C then set
`warning` and `danger` to the same red (`#d4202e`), and its `success` (`#c0c4c8`)
and `info` (`#98a0a8`) were both greys: three colours across four semantics. That
was Direction C working as originally designed — *"cool concrete, brand red as the
only signal"* — which makes it a coherent theme and a poor default for a package
whose contract just promoted `success`/`warning`/`info`/`danger` to first-class
names.

CW-20260913-0035 now gives Concrete distinct green/amber feedback; the default
selection remains `dir-a`. See the palette decision below.

Two criteria picked `dir-a`:

- **Semantic conventionality.** Green / amber / red / blue in the expected roles,
  so the default *teaches* the contract rather than merely satisfying it.
  `dir-b` was the other muted candidate, and its `success` is gold — which reads
  as a warning. `dir-d` and `dir-e` are distinct but loud; Synthwave and
  Hacker/Terminal are aesthetic statements, not neutral starting points.
- **Light mode.** At the original decision all four sysop palettes were dark-only, so any as the
  default would make the out-of-box experience dark-only while
  `Theme.tokens.light` is optional. All six Nanite themes carry both.

`dir-a` is the only built-in that is both conventional and unopinionated, and its
muted register reads as a starting point rather than as someone's choice.
`nanite-default` remains a built-in; nothing is wrong with it except being the
default. A test asserts the default's four feedback colours are distinct and that
it carries light, so this decision cannot be undone by accident.

### Derivation functions and provenance — `DERIVED_TOKEN_VALUES`

`DERIVED_TOKEN_VALUES` lists the tokens built from R1–R4 rather than authored
palette values. Built-in construction calls the same exported functions a custom
palette can use; their inputs remain in the theme source. The original manifest
covered 168 values. Light Sysop companions and the contrast corrections in
CW-20261001-0498 changed that worklist; it is not a frozen census.

| Rule | Function | Color space and behavior |
|---|---|---|
| **R1** | `deriveMuted(color, alpha = 0.12, representation = 'rgb')` | Keep the sRGB channels and apply alpha. `'css'` emits `color-mix(in srgb, …, transparent)`; it accepts CSS expressions. |
| **R2** | `deriveHover(color)` / `deriveActive(color)` | Mix 12% toward white / black in **gamma-encoded sRGB**, not linear-light sRGB. Round the interpolated channels once with `Math.round`. |
| **R2** | `deriveSurfaceActive(surfaceHover, foreground)` / `mixSrgb(color, toward, amount)` | Surface-active mixes 15% toward fg; the lower-level helper accepts a fraction from 0 to 1. Same encoded sRGB interpolation and rounding. |
| **R3** | `deriveForeground(fill, dark = '#000000', light = '#ffffff')` | Choose the candidate with higher WCAG contrast; ties prefer light. Luminance **linearizes sRGB**. Return the candidate's original spelling. `relativeLuminance` and `contrastRatio` are also exported. |
| **R4** | `deriveSyntax(fg, fgFaint, representation = 'css')` | Five stops at 100/75/50/25/0 between fg and fg-faint in **Oklab**. Preserve endpoints. CSS output delegates conversion to the browser; RGB output converts, clamps to the sRGB gamut, and rounds to 8-bit channels. |

```ts
import {
  deriveMuted, deriveHover, deriveActive, deriveForeground, deriveSyntax,
} from '@hollis-labs/design-tokens'

const primary = 'rgb(228 228 231)'
const interaction = {
  'primary-hover': deriveHover(primary),
  'primary-active': deriveActive(primary),
  'primary-muted': deriveMuted(primary),
  'primary-fg': deriveForeground(primary),
}
const syntax = deriveSyntax('#e8eaed', '#8e9298')
```

Numeric operations accept **opaque** `#RGB`, `#RRGGBB`, `rgb(r g b)`,
`rgb(r,g,b)`, `white` and `black`. They reject unresolved variables, translucent
colors and unsupported syntax with `TypeError`; fractions outside 0–1 or nonfinite
fractions throw `RangeError`. CSS representations preserve expressions and leave
color validation to the browser; tinting an already translucent CSS color multiplies
its alpha. Alpha and stop percentages are fractions, not
percent integers. R3 compares opaque fills/candidates; composite translucent fills
against their real background before calculating contrast.

The original R3 compared white with the theme's own bg. Pass `bg` as its second
argument to use that policy. The current built-ins choose black/white after the
contrast pass; the historical 39/48 match against Nanite's hand-authored values
was a measurement of the old policy, not a guarantee of design equivalence.
R1 defaults to the original 12% tint. Three Sysop dark danger tints retain their
10% CSS representation from the contrast pass.

Three dark **danger-hover values are authored exceptions**, excluded from the
current derivation manifest: `sysop-p4-white` (`#fa8495`),
`sysop-amber-phosphor` (`#ff7d3d`), and `sysop-hi-contrast` (`#ff776f`). They no
longer equal R2 on their corrected base fills. They remain literal and unchanged;
calling a derivation function does not overwrite a designer's authored choice.

Nanite palettes derive warning/info foregrounds and syntax; dark Sysop palettes
also derive their missing interaction/tint/feedback steps, apart from those
exceptions. Light Sysop palettes derive syntax only. Chart placeholders are not
derivations. [Oklab conversion reference](https://bottosson.github.io/posts/oklab/)
provides the numeric conversion used by R4. The committed fixture records shipped
derived outputs from main `2df729e`, and tests the exported rules against those
literal expected values for every built-in mode, without asserting counts.

Three more gaps were filled from values that **already exist** in `index.css`
outside Nanite's `TokenKey` union, so they are carried rather than derived:
`divider`, `selection-fg` (`var(--c-fg)`), and `ring` (`var(--c-primary)`). These
are exactly the names §10 identifies as having drifted out of the typed half.

### The mapping tables

**sysop-ui → contract**, applied identically to all four palettes:

| contract | from | note |
|---|---|---|
| `bg` | `bg` | |
| `bg-elevated` | `panel-2` | what shadcn `card`/`popover` already resolve to |
| `surface` | `panel-2` | what shadcn `muted`/`secondary`/`accent` already resolve to |
| `surface-hover` | `panel-hover` | value-identical to `panel-2` in every palette (§12.3) |
| `fg` / `-secondary` / `-muted` / `-faint` | `text` / `text-muted` / `text-soft` / `text-subtle` | |
| `border` | `border` | 100% — the default edge |
| `border-subtle` | `border-strong` | the 80%-alpha one, finally named for what it does |
| `divider` | `border-soft` | 70% alpha — the row separator it actually was |
| `primary` / `brand` | `accent` | the kit collapses these; a theme may set them equal (§3.4) |
| `primary-fg` / `brand-fg` | `accent-foreground` | |
| `selection` / `selection-fg` / `ring` | `panel-2` / `text` / `ring` | |
| `success` / `info` | `status-done` / `status-doing` | §3.5 evidence 4 |
| `danger` / `warning` | `danger` / `warning` | |

Dropped, because they are dead in their own codebase: all 8 `sidebar-*`,
`panel-hover-soft`, `panel-overlay`, `panel-overlay-strong`, `shadow`,
`shadow-strong`. The kit's 12 workflow status colours are **dashboard idiom** (§9.2)
and belong to `kit-dashboard`, which still has them in its own `theme.css` — nothing
was lost.

**Corrected at publish, 2026-09-11 (CW-20260910-0131):** an earlier version of this
paragraph said CW-0125 moves them under the `dash` prefix. It did not. `kit-dashboard`
names them `status-*` today, from its own theme values, and they resolve — all 28
colour names its `lib/status.ts` reaches for are declared, verified in a consumer's
compiled stylesheet. So the `dash` prefix is **reserved and unused**, and `status-*`
remains what the kit actually ships. Moving the kit onto contract values at all is
CW-20260911-0071, deliberately not in the first release.

**Nanite → contract** is nearly the identity: it already uses the contract names.
`mode-*` becomes `chat-mode-*` idiom, `status-ok/warn/danger` dissolves into
`success`/`warning`/`danger`, and the six dead `composer-*` names are not carried.

---

## Closing the type scale later — what it would cost

Chrispian chose **extend now, revisit closing later** over plain "extend", so the
closed semantic scale is *deferred, not rejected*. Two things that obliges, both
done, neither expensive:

1. The four new steps are emitted **from `TEXT_TOKENS`**, never hand-written into
   CSS.
2. Tailwind's inherited steps live in **one place** — `INHERITED_TEXT_STEPS` in
   `src/scales.ts` — and nowhere else in this package.

A test (`THE CLOSING-KEPT-ALIVE INVARIANT`) asserts that no added step shares a
name or a value with an inherited one, so the two sets stay separable.

**Cheap, already paid for:** this package (one array edit plus a regenerate — no
abstraction was built for it) and the lint config (`no-arbitrary-scale` already
merges inherited and contract steps from one object).

**Expensive, and not paid for:** every vendored shadcn component. They name
`text-sm` and `text-xs`, the registry keeps producing them, and shadcn went
tri-substrate in July 2026 with Base UI as its default — so the stream of new
vendored components naming Tailwind steps continues indefinitely. Closing means
rewriting each on arrival, forever. Measured today: `text-xs` 1,098 uses, `text-sm`
766, `text-base` 42, `lg`+ 90 — roughly 2,000 call sites, of which the vendored
ones recur with every registry pull.

**And the asymmetry that makes the door worth holding open:** extend-then-close
*breaks* every consumer that used a removed step; close-then-open is purely
*additive*. Closing is the reversible direction, and nothing here forecloses it.

---

## Findings — where this implementation disagrees with what it was handed

Reported rather than worked around, per the epic's standing rule. Five separate
measured claims in this epic have turned out to count something other than what
they named; these are re-derivations, not inherited numbers.

1. **Custom dark-only themes remain supported.** The original port made
   `tokens.light` optional to preserve sysop's dark-only palettes. CW-20261001-0498
   adds light companions to every built-in; the optional field remains for custom
   themes. Every supplied mode is still a complete `Record<ColorToken, string>`.

2. **"+18 generated shadcn aliases" is not what §3.7's table contains.** The table
   yields **24** alias names, of which **8** map a name onto itself (`primary`,
   `border`, `ring`, `chart-1..5`) and so generate nothing — leaving **16**
   actually generated. 18 is shadcn's core-name count, not a generated-alias
   count. All 24 are exported as vocabulary (that is what stops
   `primary-foreground` reading as invented); 16 are emitted.

3. **"5 `[data-theme]` palettes" in sysop-ui is 4.** `theme.css` has four
   `[data-theme]` selectors plus a `:root` fallback that duplicates `p4-white`
   declaration for declaration. A fallback, not a fifth palette.

4. **The kit's dead-name count is 16 of 56 (29%), not 12 (21%)** — worse, not
   better. The contract's twelve, plus `card`, `warning`, `shadow` and `overlay`.
   Two of those matter:
   - **`--color-warning` has zero references in the kit.** §3.5's first piece of
     evidence for promoting the feedback family is "`warning` is already in both
     implementations independently… it arrived there without coordination." True
     of the *declaration*; the kit never uses it. The promotion still stands —
     arguments 4 and 5 are the strong ones and neither depends on this — but the
     independent-convergence argument is weaker than stated.
   - **`--color-overlay` has 1 reference, not 3, and it is inside `theme.css`
     itself** (`.hud-modal-overlay`). That strengthens §8's decision to leave
     overlay untokenised.

5. **§3.3's mapping table is a component-usage migration, not a value mapping,
   and using it as one would lose data.** It sends both kit `border` and kit
   `border-strong` to contract `border`, which discards one of two distinct values
   and leaves `border-subtle` with none. For *values* this package maps
   `border`→`border` (100%), `border-strong`→`border-subtle` (80%),
   `border-soft`→`divider` (70%) — which preserves all three and puts the
   intensity ordering the right way round for the first time. The usage migration
   in `DEPRECATED_TOKENS` follows §3.3 exactly, as it should.

6. **§3.8 rule 2 does not match the token list.** The prose gives `-hover` *and*
   `-active` to `primary`, `brand`, `danger` and `surface`; the list gives
   `danger` only `-hover`. Implemented as listed (§3.5 says so explicitly), and
   the test asserts the shipped set rather than the prose.

7. **The scale values agree exactly with the lint package's fallback.** §4/§5/§6
   state them in tables, so there was no derivation freedom: `micro` 9, `caption`
   10, `label` 11, `control` 13, `panel` 10, `control` 6, `tracking-label` 0.18.
   A test pins the agreement so the day `CONTRACT_STEP_VALUES` is deleted is a
   deliberate day. **Procedural note:** I read `vocabulary.js` before deriving
   these, to learn the export names the hard requirement asked for — so this is a
   confirmation, not a blind second derivation.

8. **`@layer components` in `theme.css` is NOT tokens** — it is nine `.hud-*`
   classes, kit-dashboard idiom, and it stays there. **But `@layer base` partly
   is generic**, and both implementations wrote it independently: the same
   scrollbar suppression (`scrollbar-width: none` + `::-webkit-scrollbar
   { display: none }`) and the same document-shell lock
   (`html, body, #root { height: 100% }` + `overflow: hidden`) appear in
   sysop-ui's `theme.css` and Nanite's `index.css`, neither importing the other.
   That is the same independent-convergence evidence the contract used to justify
   the shadcn core. It is not tokens and it is not in this package — it belongs
   in `design-app-runtime`, and it is a finding for CW-0126.

9. **Confirmed, independently:** the four invented token names are live, at the
   sites reported — `status-running` ×6 (`settings-panel.tsx:97,117`),
   `status-info` ×6 (`SystemPromptsViewer.tsx`), `bg-bg-surface` ×3
   (`BooleanChoice`/`CardRadio`/`Drawer`), `warning-fg` ×1
   (`SkillDetailView.tsx:421`). `warning-fg` is now a real token, so one of the
   four is fixed by the contract rather than by a rewrite.

---

## Emitting your own themes

The generator is exported, so a consumer or a kit can produce CSS the same way
this package does.

```ts
import { emitThemeCss, emitContractCss } from '@hollis-labs/design-tokens'
emitThemeCss(myTheme)     // [data-theme="…"] { --hl-*: … }
```

### Theme-only persistence

`readStoredTheme`, `persistTheme` and `THEME_STORAGE_KEY` accompany `setTheme`
for a consumer that stores only a string theme id:

```ts
import { readStoredTheme, persistTheme, setTheme } from '@hollis-labs/design-tokens'

setTheme(readStoredTheme()) // before rendering; defaults to the built-in default
// On a user selection:
setTheme('dir-b')
persistTheme('dir-b')
```

The default key is `hollis.theme`. `readStoredTheme(storage?, options?)` accepts
`{ storageKey, defaultTheme, themes }`; omit `themes` to accept the built-ins.
`persistTheme(id, storage?, { storageKey }?)` writes just the string id. Inject
getItem/setItem storage for a custom environment, or pass null to disable it.
Unavailable/blocked storage, including a throwing localStorage getter, falls back
without preventing live switching. These helpers do not change the active mode.

For theme **and mode**, use CW-20261001-0498's `createThemeStore` from
`design-app-runtime`, with its per-app JSON appearance key and system preference
support. These theme-only helpers neither parse nor migrate that JSON preference.
The dashboard compatibility wrapper still uses `sysop.theme` and its legacy IDs.
An app deliberately migrating that wrapper should read its old id once, map it
to the canonical id, and persist it with the new appearance store. Retire the
legacy key only after that app migration; the library does not copy or delete
preferences automatically (CW-20260911-0071).

At runtime, for a user-authored theme or a live editor:

```ts
import { applyTheme, setMode } from '@hollis-labs/design-tokens'
applyTheme(myTheme)   // one <style> element, value layer only
setMode('light')
```

`applyTheme` overrides **only** the value layer, so the contract layer and every
utility keep working underneath it. Every DOM helper is a no-op outside a browser
— a tokens package gets imported during SSR and during tests and should not care.

### For a kit adding idiom tokens (§9)

An idiom extension carries an idiom prefix, may only **add**, and may never
shadow a contract name. Claim the prefix in `IDIOM_PREFIXES` — a one-line PR, so
two kits claiming the same prefix is a merge conflict rather than a silent
overlap. Then emit your own two layers in your own package:

```css
@theme inline { --color-dash-status-doing: var(--hl-dash-status-doing); }
[data-theme="sysop-p4-white"] { --hl-dash-status-doing: rgb(96 165 250); }
```

Reserved today: `dash` (kit-dashboard), `chat` (kit-chat).
**Burned:** `status` — sysop-ui uses it for 12 workflow lifecycle states and
Nanite for 3 health states; same prefix, incompatible meanings, both live, so it
is available to neither. **Retired:** `sidebar`.

---

## Working on this package

```bash
npm run build            # tsc -> dist/
npm run generate         # rewrite css/ from the TypeScript
npm run generate:check   # fail if committed css/ has drifted
npm run test:run         # 54 tests, including the drift check
npm run typecheck
```

**`css/` is generated. Do not edit it by hand.** TypeScript is the source; run
`npm run generate` and commit the result. `generate:check` runs inside the test
suite, so a hand-edit fails CI — that is the `--check` mode §10 asks for, wired
into a gate that already runs everywhere rather than into a new job.

Source imports carry `.js` extensions on purpose: TypeScript resolves them to the
`.ts` file and emits them unchanged, so `dist/` runs in Node with no rewrite step
and no bundler.

## Published

`0.1.0`, the first release, alongside the five other packages in this repo — see the
repo's [`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

Verified before release by `npm pack` and installed into a scratch project with no
other design-kit package present — no React, no transitive dependencies at all, both
palette sets demonstrable there through a real Tailwind v4 build. At publish it was
verified again from the tarball in a browser: `Metric`'s value computed to
`rgb(244, 244, 245)` against the contract's `#f4f4f5` for `fg`, its label to
`rgb(82, 82, 91)` against `#52525b` for `fg-faint`, and the four added type steps
measured 9 / 10 / 11 / 13 px with `rounded-panel` at 10px and `rounded-control` at
6px — the declared values, on a screen, through a consumer's own Tailwind build.

## Light/dark contrast pass — CW-20261001-0498

Inherited palettes had faint/muted text below 4.5:1, including chat kickers and
JSON syntax. The theme sources now raise those text floors on page, elevated,
and surface backgrounds. Feedback colors move toward each palette's foreground
until labels remain legible on tinted fills (including dashboard priority chips);
filled accents choose black or white by contrast. Syntax retains the oklab ramp
between foreground and the corrected faint endpoint. Four sysop light companions
are new appearance choices and await visual sign-off in [screenshots](../../docs/screenshots/README.md).
This does not design the chart palette: its magenta placeholders remain explicit.
