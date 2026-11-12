# The Token Contract

**Task:** CW-20260910-0111 · **Epic:** EP-20260910-0001 — Portfolio UI vNext
**Status:** **APPROVED** by Chrispian, review round 2. CW-0111 done. All three open calls decided —
see §13; §2, §3.6 and §4 were updated to match. **This file IS that document** — landed 2026-09-11
by CW-20260910-0119, byte-identical to the approved draft apart from this sentence.
**Nothing in this document is still open.** CW-0124 builds from it as written.
**Layer:** 2 — the *names*, and their types. Not the values, not the components, not the package split.
**Measured:** 2026-09-11 UTC, this session, against `libs/sysop-ui@aef2dff` and `apps/nanite@d2d82c93`,
plus `tangent`, `hadron` and `tesseract` for cross-checks.
Every count in this document was re-derived here; §11 lists where it differs from the brief.

**Consumed by:** CW-0117 (lint rules), CW-0124 (tokens package), CW-0125, CW-0127 (Nanite mapping
table), CW-0128, CW-0129.

---

## 0. What this is

This contract was **not designed**. It was read off two working implementations that had already
converged, and the places where they disagree are decided here so that nothing downstream
re-litigates them.

Both implementations independently built the same two-level structure:

| | value layer (may name a color) | contract layer (what a component names) |
|---|---|---|
| `libs/sysop-ui` | `--theme-color-*`, 4 `[data-theme]` palettes + a `:root` fallback | `--color-*` via `@theme inline` |
| `apps/nanite` | `--c-*`, `:root` + `.light` | `--color-*` via `@theme` |

That separation *is* the layer-2 / layer-3 split this epic set out to design. Neither codebase needs
to be told to adopt it; it needs writing down.

**17 of shadcn's 18 core color names appear in both.** The disagreements are narrow, and all of them
are decided below.

---

## 1. The one rule

> **A component may name a token. It may never name a value.**

Layer 3 — the theme — is the only layer permitted to name a color.

The rule covers **scale as much as color**. A component reaching for `text-[13px]`, `rounded-[10px]`
or `tracking-[0.16em]` is naming a value exactly as much as one reaching for `#1a1b26`. This is not
an analogy; it is the same defect. Measured across the two codebases there are **1,783 arbitrary-value
utilities** and **24 component-level hex literals** — scale is the larger problem by roughly
seventy to one.

Two mechanisms enforce it, and they answer different questions:

- **Types** stop you naming a token that does not exist. They fail at *authoring* time.
- **Lint** stops you bypassing tokens altogether by writing a raw value. It fails at *commit* time.

Neither substitutes for the other. §10 specifies the first; CW-0117 owns the second.

---

## 2. The two layers, named

```
--hl-*       layer 3   values      the ONLY layer that may name a color
--color-*    layer 2   contract    what @theme exposes; what components name
```

**Value layer is `--hl-*`.** *(Decided in review round 2 — see §13. The draft recommended Nanite's
`--c-*`; Chrispian chose `--hl-*`.)* The reasoning that survives: the value layer is internal, a
component never names it, and `design-tokens` is going to public npm, where a two-character prefix
has real collision surface. It is one generator constant, so the cost over `--c-*` is nil.

**Migration note for CW-0127:** Nanite's 51 `--c-*` declarations and its `apply.ts` serializer
(`--c-${key}`) become `--hl-*`. That is a rename of one template string plus the theme file — but it
is Nanite's own adoption work, not this epic's.

**Contract layer is `--color-*`.** Not a choice — Tailwind v4's `@theme` requires that namespace to
generate `bg-*` / `text-*` / `border-*` utilities. Same for `--text-*`, `--radius-*`, `--tracking-*`.

Components name **only** layer 2, and only through Tailwind utilities.

---

## 3. The color contract

**48 names.** Every one earns its place by being used in at least one of the two implementations
today, except `chart-1..5` (§3.6), which is flagged, and `syntax-*` (§3.10), which was added in
review round 4 and is derived rather than designed.

### 3.1 Surfaces

| Token | Meaning | Text on it |
|---|---|---|
| `bg` | The app canvas. The bottom-most surface. | `fg` |
| `bg-elevated` | A raised surface — cards, popovers, modals, drawers. | `fg` |
| `surface` | Interactive chrome fill — buttons, inputs, chips, list rows. | `fg` |
| `surface-hover` | `surface` under the pointer. | `fg` |
| `surface-active` | `surface` pressed, selected, or open. | `fg` |

Evidence: `surface` 417 uses, `bg-elevated` 208, `bg` 77 in Nanite.[^substr] The kit's
`panel` / `panel-2` / `panel-hover` ladder maps onto this one-to-one (§9.2) — it is not a separate
idiom, it is the kit's word for the same three steps.

### 3.2 Text

Four descending steps. Both implementations independently built a four-step ramp; only the words
differ.

| Token | Meaning | Sits on |
|---|---|---|
| `fg` | Primary text. | any surface |
| `fg-secondary` | Secondary text — supporting copy, inactive nav. | any surface |
| `fg-muted` | Meta text — timestamps, counts, hints. | any surface |
| `fg-faint` | Disabled text and placeholders. | any surface |

`fg` beats the kit's `text` decisively on use — **471 vs 24**[^substr] — and `text-text` is an unfortunate
utility name. `bg`/`fg` also pair naturally.

> **Value note for design review:** the two ramps do not align step-for-step. The kit's `text-muted`
> (`rgb(212 212 216)`) is lighter than Nanite's `fg-secondary` (`#98a0a8`), so the kit's ramp is
> effectively shifted one step brighter. Naming is settled here; *which four values* is §12.

### 3.3 Borders — and the `border-soft` / `border-strong` call

**Decision: `border-soft` and `border-strong` are retired. The contract is `border`,
`border-subtle`, `divider`.**

| Token | Meaning |
|---|---|
| `border` | The default visible edge of a panel or control. |
| `border-subtle` | A quieter edge — secondary grouping, nested containers. |
| `divider` | A hairline between rows or sections. Not an outline. |

The reasoning, because CW-0127 should not reopen it:

1. **`soft`/`strong` name intensity, not role** — and intensity is a value property. A component
   asking for "a strong border" is reaching toward a value.
2. **The names contradict their own values.** In `theme.css` the ladder is
   `border` = `rgb(39 39 42)` at 100%, `border-strong` = the *same hue at 80%*, `border-soft` = the
   same hue at 70%. `border-strong` is **weaker than `border`**. Any future reader will get this
   backwards, because the name says the opposite of what it does.
3. **They are one color at three alphas, filling three roles.** Usage shows the roles clearly:
   `border-strong` (46 uses) is the default edge on panels, dialogs, inputs and buttons;
   `border-soft` (11 uses) appears almost entirely as `border-b` / `divide-y` on table rows — a
   separator.
4. **Nanite already has the three roles as three real colors**, not alpha variants:
   `border` `#25282c` (140 uses), `border-subtle` `#1d1f22` (409), `divider` `rgba(255,255,255,.06)` (43).[^substr]
   That is the same distinction, drawn better.

**THIS TABLE IS A COMPONENT-USAGE MIGRATION, NOT A VALUE MAPPING.** *(Distinction added 2026-09-10 by
CW-0124, which hit it while carrying values across.)* The difference is load-bearing and CW-0127 must
not conflate them:

- **Usage migration** — what a component that says `border-strong` today should say tomorrow. That is
  the table below, and it is correct as written: `border-strong` is the default edge in practice, so
  its 46 uses become `border`.
- **Value mapping** — which *color* each contract token takes. Applying the usage table here loses
  data: it sends kit `border` **and** `border-strong` both to contract `border`, discarding a distinct
  value and leaving `border-subtle` with none.

For VALUES, carry the ladder across intact and let the names land in the right intensity order:
`border` → `border` (100%), `border-strong` → `border-subtle` (80%), `border-soft` → `divider` (70%).
That preserves all three values **and** fixes the inversion reason 2 identifies, rather than
propagating it. CW-0124 shipped values this way and `DEPRECATED_TOKENS` follows the usage table below
exactly.

**Usage mapping for CW-0127 and for kit adopters:**

| Old | New | Why |
|---|---|---|
| `border-strong` | `border` | It is the default control/panel edge. |
| `border-soft` | `divider` | Its real use is row separation. |
| `border` (kit) | `border` | Unchanged. |
| `border-subtle` (Nanite) | `border-subtle` | Unchanged. |
| `divider` (Nanite) | `divider` | Unchanged. |

This satisfies CW-0116 §C, which flagged the two-step border ramp as a substantive ask on the
contract: the ask is granted, as three role names rather than two intensity names.

### 3.4 Interactive and identity

| Token | Meaning | Text on it |
|---|---|---|
| `primary` | The workhorse highlight — CTAs, links, active nav, selected state. | `primary-fg` |
| `primary-hover` | `primary` under the pointer. | `primary-fg` |
| `primary-active` | `primary` pressed. | `primary-fg` |
| `primary-muted` | Low-alpha `primary` tint used *as a background*. | `primary` |
| `primary-fg` | Text and icons on a `primary` fill. | — |
| `brand` | Rare identity moments — logo, brandmark, marketing accent. | `brand-fg` |
| `brand-hover` | | `brand-fg` |
| `brand-active` | | `brand-fg` |
| `brand-muted` | Low-alpha brand tint used as a background. | `brand` |
| `brand-fg` | Text and icons on a `brand` fill. | — |
| `selection` | Neutral hover / focus surface on menus, lists, options, command palettes. | `selection-fg` |
| `selection-fg` | Text on `selection`. | — |
| `ring` | Focus indicator, used at full authored strength (no `/50` dilution). | — |

**Focus contrast — CW-20261002-0091.** The built-in `ring` values and the base
components' focus indicators reach at least **3:1 against the surrounding
surface**, measured in all ten themes and both modes, plus the dashboard's four
legacy IDs. The measurement covers page, elevated, surface, hover, active,
selection and menu/popover surrounds; translucent colors are composited before
calculating sRGB relative luminance. Custom themes must meet the same contrast
requirement on their own surrounds. A ring on a custom saturated fill or under
host opacity still needs verification in that host.

Base controls use the full-strength ring, including destructive and invalid
focus states; feedback borders/fills remain separate. `:focus-visible` follows
native browser behavior: clicked text fields can show the same indicator as Tab
focus. No input-modality JavaScript is added. Clicked buttons, toggles and the
Base UI Select trigger keep their pointer appearance.

No token is added or restored: `ring-soft` remains a retired name mapped to
`ring`. The three stronger `ring` values deliberately also change chat drag
feedback, workflow selected-edge/node/marquee and connection strokes, and the
dashboard's general outline-color mapping in those same palette/mode pairs.
Those decorative uses remain coupled to `ring`; their computed before/after
styles are recorded in the [ring-use audit](screenshots/focus-ring/ring-uses.md).
Color/style polishing is deferred. The focus change is appearance-only for the
next minor core release; no token is removed or renamed. See the committed
[before/after matrix](screenshots/focus-ring/README.md) and computed-style receipts.

**`primary` and `brand` are separate on purpose.** Nanite draws this line explicitly (brand is
"fire-engine red, rare identity moments only"; primary is "the workhorse highlight") and it is the
distinction that lets an app be loudly branded without a loud UI. The kit collapses them — its
`--color-primary` and `--color-accent` both resolve to `--theme-color-accent`. Keeping them separate
costs nothing and a theme may set them to the same value.

#### The `accent` collision — decided

`accent` is a name both implementations use and **they mean opposite things by it**:

- kit: `--color-accent: var(--theme-color-panel-2)` — shadcn's neutral hover surface. 23 uses.
- Nanite: `--color-accent: var(--c-brand)` — a legacy alias for the brand color, marked in its own
  source as a Phase-1 migration artifact. 2 uses.

**Decision: the contract name for the neutral hover surface is `selection`. `accent` survives only as
a generated shadcn alias (§3.7) and is never authored by hand.**

`accent` is a bad name for "neutral hover surface" — it reads as *the accent color*, which is
precisely the misreading that caused Nanite to repurpose it. Keeping it as the primary name would
reproduce the bug. Nanite's own `selection` token is documented as "shadcn's accent semantic" and is
the clearer word. Nanite's `accent` alias is already abandoned by its authors (2 uses against 47 for
`brand`), so retiring it costs nearly nothing.

### 3.5 Feedback — the contract-vs-idiom call

**Decision: `success`, `warning`, `info` and `danger` are CONTRACT, not idiom.**

This was flagged as the most interesting open call. Five pieces of evidence settle it, and the last
two are the strong ones:

1. **`warning` is already in both implementations independently.** It is the one member of the family
   the kit has, and it arrived there without coordination. Independent convergence is the same
   evidence that justifies the shadcn core.
2. **Both already call the value `danger` and only expose `destructive` for shadcn.**
   `theme.css`: `--color-destructive: var(--theme-color-danger)`. `index.css`:
   `--color-destructive: var(--c-danger)`. Neither codebase actually thinks in "destructive". So the
   contract name is **`danger`**, and `destructive` is a generated alias.
3. **shadcn's omission is a known gap that every consumer fills locally** — which is exactly what
   both of these did, separately. A gap that two of two implementations filled is not an idiom.
4. **The kit's own base components already need it.** CW-0116 §D measured 37 occurrences across five
   base components (`pill`, `callout`, `live-dot`, `progress-bar`, `copyable-id`, …) implementing a
   *generic five-tone severity scale* out of the twelve-value operations status palette —
   `success` via `status-done`, `danger` via `status-blocked`, `info` via `status-doing`. Three of
   those files carry a byte-identical tone map. Those components are base, not kit, and they cannot
   be expressed without this family.
5. **An app cannot render a toast, a form error or a health badge without it.** Leave it to idiom and
   every kit invents its own — which is the precise failure this epic exists to stop.

| Token | Meaning | Text on it |
|---|---|---|
| `danger` | Destructive action, error, failure. | `danger-fg` |
| `danger-hover` | `danger` under the pointer. | `danger-fg` |
| `danger-muted` | Low-alpha tint behind error content. | `danger` |
| `danger-fg` | Text and icons on a `danger` fill. | — |
| `warning` | Caution, pending approval, rate limit, degraded. | `warning-fg` |
| `warning-muted` | Low-alpha tint behind warning content. | `warning` |
| `warning-fg` | Text and icons on a `warning` fill. | — |
| `success` | Completion, healthy, passed. | `success-fg` |
| `success-muted` | Low-alpha tint behind success content. | `success` |
| `success-fg` | Text and icons on a `success` fill. | — |
| `info` | Neutral informational. | `info-fg` |
| `info-muted` | Low-alpha tint behind informational content. | `info` |
| `info-fg` | Text and icons on an `info` fill. | — |

`danger` alone carries `-hover` — see the rectangularity rule below.

### 3.6 Charts

| Token | Meaning | Text on it |
|---|---|---|
| `chart-1` … `chart-5` | Categorical series colors, in order. | `fg` |

**This is the one family in the contract that neither implementation has**, so it was flagged rather
than asserted. The justification is measured: `chart-1..5` is shadcn standard, and Nanite's
component-level hex is down to 37 occurrences of which the chart configs
(`DurationChart.tsx`, `ProviderDistributionChart.tsx`, `chartSetup.ts`) are a named share — they hold
literal colors *because no token exists*. A charting library needs real color strings, so this family
also needs a JS accessor, not only a CSS variable (§10).

> **Decided, review round 2: names only.** The family enters the contract; **the palette is
> Chrispian's own design pass.** `design-tokens` ships the five names and must **not** invent series
> colors to fill them. Until that pass lands, treat the values as unset — a built-in theme that
> cannot yet supply them should say so rather than guess. This is the one family where a plausible
> default would be worse than an obvious hole.
>
> **Reaffirmed, review round 4 (2026-09-11).** A later round reversed this without either party
> noticing it was a reversal — two different rounds had both been called "round 2", and the option
> "give `chart-1..5` real values" was put and accepted as if the question were open. It was not.
> The placeholders stand. Nothing was built, so nothing had to be unbuilt.

**Do not use this family for code highlighting.** That was the first thing it was reached for, and
§3.10 is the family that does it. The reason is measured, not aesthetic: charts paint fills at
WCAG's 3:1 and syntax paints small mono text at 4.5:1, and no single five-stop ramp clears both.

### 3.7 shadcn compatibility aliases — generated, never authored

Vendored shadcn components name shadcn's tokens. Those names stay working, as a **generated alias
layer**. A component we write never uses them.

| shadcn name | resolves to |
|---|---|
| `background` | `bg` |
| `foreground` | `fg` |
| `card`, `popover` | `bg-elevated` |
| `card-foreground`, `popover-foreground` | `fg` |
| `muted`, `secondary` | `surface` |
| `muted-foreground` | `fg-muted` |
| `secondary-foreground` | `fg` |
| `accent` | `selection` |
| `accent-foreground` | `selection-fg` |
| `destructive` | `danger` |
| `destructive-foreground` | `danger-fg` |
| `primary`, `primary-foreground` | `primary`, `primary-fg` |
| `border` | `border` |
| `input` | `border-subtle` |
| `ring` | `ring` |
| `chart-1..5` | `chart-1..5` |

That this layer is an *alias* layer rather than the primary vocabulary is not a preference — it is
what both codebases already do. Components overwhelmingly name the short semantic token:

| | short name | shadcn name | ratio |
|---|---|---|---|
| app canvas | `bg-bg` 289 | `bg-background` 9 | 32 : 1 |
| primary text | `text-fg` / `text-text` 1,952 | `text-foreground` 35 | 56 : 1 |
| muted text | `fg-muted` / `text-subtle` / `text-soft` 730 | `muted-foreground` 66 | 11 : 1 |

**`sidebar-*` is not in the contract and is not an idiom.** All 8 names are declared in the kit and
referenced **zero times** anywhere — the only file in `libs/sysop-ui/src` that mentions "sidebar" is
`theme.css` itself. It is dead shadcn boilerplate. Dropped. If a sidebar needs tokens later it claims
them under a kit prefix (§9.3).

### 3.8 Four rules that govern the color set

1. **Families are rectangular.** Every feedback family carries the same display members —
   base, `-muted`, `-fg`. This is not tidiness: `warning` was the one family missing `-fg`, and
   someone wrote `text-warning-fg` anyway (`SkillDetailView.tsx:421`). A missing member of an
   otherwise-complete family *invites* invention.
2. **`-hover` and `-active` belong only to families used as a fill you can press** — `primary`,
   `brand`, `danger`, `surface`. Adding them everywhere would create names nothing selects.
   *(INTERNAL CONTRADICTION, flagged 2026-09-10 by CW-0124. This prose gives `-active` to four
   families; **the token list in §3 gives `danger` only `-hover`.** CW-0124 implemented the LIST, which
   is the right precedence — the list is the contract, the prose is commentary. Either add
   `danger-active` to the list or narrow this sentence to three families; until then the list wins.)*
3. **`-muted` always means a low-alpha tint used as a background**, and its paired text is the
   family's base color, never `-fg`. Both implementations already use it this way.
4. **`-fg` always means "text/icons on this family's solid fill."** Not "a muted version."

### 3.9 Fonts

| Token | Meaning |
|---|---|
| `--font-sans` | UI text. |
| `--font-mono` | Code, identifiers, captions in the mono idiom. |

Both implementations declare exactly these two. No third family is in evidence.

For a consumer importing `tokens.css` without built-in values, these map to
`--hl-font-sans` and `--hl-font-mono`. The complete base value layer is therefore
**50 declarations: 48 colors plus two font stacks**. Color completeness alone
does not supply fonts; the indirections have no fallback. The
[adopter-path guide](adopter-path.md) lists every value-layer name and describes
source registration and production-browser verification.

### 3.10 Syntax — code highlighting

*Numbered after Fonts rather than beside Charts because it was added in review round 4, and
renumbering §3.7–§3.9 would have invalidated references in shipped CSS and in three packages'
source. The number is a label, not an ordering.*

| Token | Meaning | Derived as |
|---|---|---|
| `syntax-key` | Object keys and field names. | `fg` |
| `syntax-string` | Quoted string values. | 75% `fg` → `fg-faint` |
| `syntax-number` | Numeric literals. | 50% `fg` → `fg-faint` |
| `syntax-boolean` | Boolean literals. | 25% `fg` → `fg-faint` |
| `syntax-null` | Null and absent values. | `fg-faint` |

Five stops at 100/75/50/25/0 between the palette's own `fg` and `fg-faint`, mixed in oklab. This is
rule **R4** in `design-tokens`' `themes/index.ts`, and it is applied once per theme rather than at
any call site — deriving a colour from two others is theme-layer work, the same reason the derived
status labels moved out of `lib/status.ts`.

**Why this is not `chart-1..5`, which is the question this family exists to answer.** Both are
categorical: five names, no semantics, picked by position. They differ in the surface they land on,
and the difference is measured rather than felt:

| | paints | WCAG bar | wants |
|---|---|---|---|
| `chart-1..5` | fills — large areas | 3:1 | the widest separation the palette can give |
| `syntax-*` | text — small mono glyphs | 4.5:1 | every step legible against `bg` |

A ramp from `fg` all the way to `bg` — the derivation charts want — puts its bottom two stops at
**1.9 / 1.8 / 1.6 / 1.4 : 1** across the four sysop palettes. `syntax-boolean` and `syntax-null`
fail AA in all four, and `syntax-null` is invisible on high-contrast. **No single five-stop ramp
clears both bars**, which is the sentence that should stop someone merging these families later.

**Why deriving these was allowed where deriving a chart palette was not.** The endpoints are
literally `fg` and `fg-faint`, so only three middle stops are new values, and every one is a
lightness step between two colours the palette's authors already chose. Five distinguishable series
hues would be a palette. This one invents nothing.

**What it costs, recorded so a future reader does not mistake a repair for a defect.** On
high-contrast, adjacent stops land **ΔL\* 3.4** apart, because that palette spans only `#ffffff` to
`#d0d0d0` above its faint step. That is thin. It replaces a map that rendered `number` and `boolean`
at the **same colour** there — ΔL\* 0.0 — and three roles at the same colour on amber. Five distinct,
legible roles in all four palettes is the bar this clears; it is not the bar of a designed palette,
and a design pass here would still be worth having.

---

## 4. The type scale

### What was measured

Arbitrary font sizes across `sysop-ui`, `nanite`, `tangent`, `hadron` and `tesseract`:

| px | uses | | px | uses |
|---|---|---|---|---|
| 8 / 8.5 | 11 | | 12 / 12.5 | 78 |
| 9 / 9.5 | 45 | | 13 | 79 |
| 10 / 10.5 | 344 | | 14 | 8 |
| 11 | **368** | | ≥15 | 8 |

Named steps in the same files: `text-xs` 1,098 · `text-sm` 766 · `text-base` 42 · `lg`+ 90.

### The root cause, which is not laziness

**Tailwind v4 has no step below 12px.** `--text-xs: 0.75rem`. This portfolio's UI density lives at
10–11px, and 712 arbitrary uses are people reaching for a step that does not exist. A second gap sits
at 13px, between `xs` (12) and `sm` (14).

The sizes also carry **role**, not just magnitude. Co-occurrence within the same `className`:

| size | uppercase | mono | tracked |
|---|---|---|---|
| 8–9px | 44% | 54% | 34% |
| 10px | 33% | 40% | 34% |
| 11px | 13% | 33% | 14% |
| 12px | 1% | 8% | 1% |
| 13px | 0% | 3% | 0% |
| 14px | 0% | 0% | 0% |

There is a clean break: **≤10px is caption/overline territory — mono, uppercase, tracked. ≥12px is
plain body text. 11px is the label boundary.** So the new steps get role names, not `2xs`/`3xs`
ordinals — an agent choosing between `text-2xs` and `text-3xs` is guessing; choosing `text-caption`
is not.

### The contract

**Extend Tailwind's scale; do not replace it.** Four new steps, in the band Tailwind does not serve.

| Token | Value | Role | Replaces |
|---|---|---|---|
| `text-micro` | 9px | Dense metadata, mono badges, keycaps. | `text-[8px]`, `[8.5px]`, `[9px]`, `[9.5px]` — 56 |
| `text-caption` | 10px | Captions and overlines. Usually mono + uppercase + `tracking-label`. | `text-[10px]`, `[10.5px]` — 344 |
| `text-label` | 11px | UI labels, table headers, chips, tab strips. | `text-[11px]` — 368 |
| `text-xs` | 12px | *Tailwind's.* Default small body. | `text-[12px]`, `[12.5px]` — 78 |
| `text-control` | 13px | Input, button and dense-table-body text. | `text-[13px]` — 79 |
| `text-sm` | 14px | *Tailwind's.* Comfortable body. | `text-[14px]` — 8 |
| `text-base` and up | 16px+ | *Tailwind's.* Headings. Rare — 90 uses total. | — |

**Why extend rather than replace.** A fully semantic closed scale is cleaner in isolation, but every
vendored shadcn component names `text-sm` and `text-xs`, and the registry will keep producing them.
Banning Tailwind's steps means rewriting every vendored component forever. Extending costs one
inconsistency — two naming systems in one scale — which is the cheaper of the two.

> **Decided, review round 2: extend now, and closing the scale is deliberately kept alive** as a
> future option rather than rejected. So the inconsistency above is a *known, accepted, revisitable*
> cost, not a settled aesthetic. CW-0124 should keep the door open cheaply — see §13 for what that
> obliges concretely.

**The 12px and 14px arbitrary uses are not evidence of a gap.** 86 occurrences of `text-[12px]` and
`text-[14px]` restate steps that already have names. They are errors to rewrite, and CW-0117 should
treat any arbitrary value equal to a named step as an unambiguous autofix.

---

## 5. The radius scale

### What was measured

Arbitrary radii in Nanite (the only codebase with a meaningful count):

| px | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| uses | 1 | 11 | 13 | **48** | 10 | **65** | 14 | 21 | 23 | 4 | 2 |

**Eleven distinct radii from 1px to 14px.** But the decisive fact is what they are:

**149 of 212 arbitrary radius uses restate a Tailwind step exactly.** Tailwind v4 is
`xs` 2 · `sm` 4 · `md` 6 · `lg` 8 · `xl` 12 · `2xl` 16 — so `rounded-[4px]`, `rounded-[6px]`,
`rounded-[8px]`, `rounded-[2px]` and `rounded-[12px]` are all named steps written the long way.

Only **63 uses are genuinely off-scale**, and of those **10px (23 uses) is the one real gap**.

### The intended scale that already existed

`ChatComposer.tsx`'s header comment describes a deliberate two-tier system that was never written
down anywhere else:

> "Outer frame radius 2px (rounded-sm) → 10px (**outer envelope scale**)"
> "the button radius matches the new 6px **inner-chrome scale**"

That is the decision. It is named here:

| Token | Value | Meaning |
|---|---|---|
| `rounded-panel` | **10px** | The outer frame of a major surface — panel, card, drawer, composer, envelope. **New step.** |
| `rounded-control` | 6px | Controls *inside* that frame — buttons, inputs, toggles, chips. Alias of `rounded-md`. |

Everything else stays Tailwind's, unmodified: `xs` 2 · `sm` 4 · `md` 6 · `lg` 8 · `xl` 12 ·
`2xl` 16 · `full`.

**Folding the off-scale values:** 1px and 3px → `xs` (2px). 5px → `sm` (4px). 7px → `control` (6px).
14px → `xl` (12px). Each of those pairs sits 1–2px from a named step and plainly meant it.

### The divergence that has to be fixed — `rounded-sm` means two different things

**`libs/sysop-ui` overrides Tailwind's radius scale. `apps/nanite` does not.**

```css
/* theme.css */
--radius: 0.375rem;                      /* 6px  */
--radius-sm: calc(var(--radius) * 0.75); /* 4.5px — Tailwind's is 4px */
--radius-lg: calc(var(--radius) * 1.5);  /* 9px   — Tailwind's is 8px */
```

So today `rounded-sm` is **4.5px** in the kit and **4px** in Nanite; `rounded-lg` is **9px** in the
kit and **8px** in Nanite. A shared component that says `rounded-lg` renders differently depending on
which app imports it — silently, with no error anywhere.

**Decision: `design-tokens` does not override Tailwind's radius scale.** Reasons: Nanite (the larger
surface) already matches Tailwind; the kit's `0.75×` / `1.5×` derivation produces half-pixels that
do not render crisply; and any override silently changes every vendored shadcn component. The only
addition is the 10px `panel` step.

---

## 6. Letter-spacing — a fourth scale, not in the brief

Not in the task's list, but the one rule covers it and it is measurably the same defect.
Portfolio-wide: **119 uses, written as 23 distinct spellings of 17 distinct values.** The gap between
those two numbers is the finding — `.18em` and `0.18em` both appear, as do `.14em`/`0.14em`,
`.16em`/`0.16em`, `.2em`/`0.2em`, `.12em`/`0.12em` and `.28em`/`0.28em`. Six values are each written
two ways. That is the same class of finding as `text-zinc-500` sitting beside `text-zinc-400`, and
in `libs/sysop-ui` alone it is **11 spellings of 6 values**.

The 17 values cluster into two bands plus a rounding tail:

| Band | Uses | What it is |
|---|---|---|
| 0.12 – 0.20em | 86 | The uppercase micro-label. One visual idea, written eight ways. |
| 0.04 – 0.08em | 26 | Slight widening on small caps. |
| −0.01 – −0.03em | 5 | Tightening on large headings. |
| 0.28em | 2 | Outlier above the band. |

Tailwind's top step is `widest` at 0.1em — so the label band is **above** anything Tailwind offers,
the same shape of gap as the type scale.

| Token | Value | Meaning |
|---|---|---|
| `tracking-label` | 0.18em | Uppercase micro-labels. Pairs with `text-caption` and `text-label`. |
| `tracking-eyebrow` | 0.28em | The widest uppercase register — eyebrows and dense table headers. Pairs with `text-caption`. |

Everything else stays Tailwind's: the 0.04–0.08em band folds onto `wider` (0.05em) / `widest` (0.1em);
the negative tail onto `tight` / `tighter`.

**`tracking-eyebrow` was added in review round 2 (2026-09-11), during CW-20260910-0125.** It sits well
outside the 0.12–0.20em band `label` was derived from, and it earned a name the way `label` did: two
authors reached 0.28em independently — `empty-state`'s `eyebrow` prop in `design-components` and
`data-table`'s `<thead>` in `kit-dashboard`, in different packages, with the same 10px uppercase faint
construction. Convergence without coordination is this epic's standard for a role.

**`tracking-label` moved from 0.16em to 0.18em in review round 3 (2026-09-11).** It was set to the
midpoint of the 0.12–0.20em band, which §6 flagged at the time as "not a measured mode". Counting the
band rather than bracketing it gives a bimodal distribution — 8 sites at 0.2em, 7 at 0.18em, 4 at
0.14em, 1 at 0.12em (scope: `kit-dashboard` `src/` + `demo/`, `.ts`/`.tsx`, excluding `dist`). A step at
0.16 landed **between the two largest clusters and matched neither**, which is why twenty sites stayed
arbitrary rather than folding onto it: the scale was asking them to move to a value none of them had
chosen. Naming the mode makes 7 exact and brings 8 more within 0.02, and the band folds.

Name adopted from CW-0116 §F, which reached `--tracking-label` independently from the kit's side.

---

## 7. Spacing — and why it gets no tokens

**Spacing is already solved and needs nothing from this contract.**

Measured across all five codebases: **6,751 named-step spacing utilities against 39 arbitrary ones —
99.4% adherence.** No other scale comes close.

The 39 exceptions are not a missing scale. `py-[7px]` ×11 is optical centering against a fixed-height
row; the rest are one-off gaps of 2–5px and a few odd paddings.

> **Tailwind's 4px-based spacing scale is the spacing contract.** It is inherited, not redefined, and
> `--spacing` is not overridden.

This is the clearest result in the document, and it is worth stating positively: when a scale exists
and fits, people use it. The type and radius scales are abused *because they have holes*, not because
developers are careless.

---

## 8. What is not a token

| Not a token | Why | Where it goes instead |
|---|---|---|
| **Spacing** | Tailwind's scale already serves it at 99.4%. | §7 |
| **Layout dimensions** — `w-[480px]`, `h-[80vh]`, `max-w-[calc(100vw-2rem)]` | One-off geometry, not a repeated design decision. A rail that is 200px wide is a layout fact. | Component-local. CW-0117: **do not** lint arbitrary `w`/`h`/`min`/`max`. |
| **Icon-sized boxes** — `h-[18px]`, `size-3.5` | Sized to the glyph inside, not to a scale. | Same. This is the false-positive surface CW-0117 was warned about. |
| **z-index** | Layering *order*, not appearance. Not themeable — no theme wants a different stacking order. | A small named ladder in `design-app-runtime` alongside the overlay primitives. Measured: mostly `z-50`/`z-10`, plus `z-[9999]` ×7 and `z-[60]` ×3 — small enough to fix when the shell lands. |
| **Shadows** | Tailwind's `shadow-*` scale serves it. The kit's `--color-shadow-strong` has **zero references** outside its own declaration. | Tailwind's scale. Drop `shadow`/`shadow-strong`. |
| **The inset accent stripe** — `shadow-[inset_3px_0_0_0_var(--color-success)]` ×9 | This is a *component*, not a token. It already names its color correctly; the 3px geometry is the component's own. | `<Envelope accent="success">` in `kit-chat` (CW-0129). |
| **Opacity, transition duration, easing, animation timing** | No evidence of drift; Tailwind's scales unused-but-adequate. | Tailwind's. Revisit only with measured need. |
| **Overlay / scrim color** | The kit has `--color-overlay` (3 uses); Nanite has none and uses `bg-black/50`. Too thin to promote. | Note for §12. Not contract until a second consumer wants it. |

### Dead names in both implementations — do not transcribe either set

A name earns its place by being used. Measured, referenced nowhere but their own declaration:

- **kit:** all 8 `sidebar-*`; `panel-hover-soft`, `panel-overlay`, `panel-overlay-strong`;
  `shadow-strong`. **16 of 56 declared names — 29% dead.**
  *(CORRECTED 2026-09-10 by CW-0124. This read "12 of 56 — 21% dead". Worse, not better. **Two of the
  four extra matter beyond the count:** `--color-warning` has **ZERO references in the kit**, which
  weakens §3.5's FIRST argument for promoting warning to the contract — "already in both
  implementations independently" is true of the *declaration* and not the *usage*. The promotion still
  stands on arguments 4 and 5, but not on that one. And `--color-overlay` has **1** reference, not 3,
  and it is inside `theme.css` itself — which strengthens §8's decision to leave it out.)*
- **Nanite:** 6 of 9 `composer-*` names.

Two further kit names are *value-identical duplicates*: `--theme-color-panel` equals
`--theme-color-bg`, and `--theme-color-panel-2` equals `--theme-color-panel-hover`. (CW-0116 §C
independently flagged the first, noting it makes `Card` render flush with the page.)

---

## 9. Idiom extensions

### 9.1 The rule

> **An idiom extension carries an idiom prefix: `--color-<idiom>-<name>`.**
> One vocabulary, named layers. An idiom may only *add*; it may never shadow a contract name.

Contract names are unprefixed. Anything a single kit needs, and only that kit, is prefixed. This makes
the question "is this ours or everyone's?" answerable by looking at the name.

### 9.2 The idioms that exist today

| Today | Verdict | Becomes |
|---|---|---|
| kit `panel-*` (6 declared, 3 used) | **Not idiom.** It is the kit's word for the contract surface ladder — and `panel` is value-identical to `bg`. | Collapses into `bg` / `bg-elevated` / `surface-hover`. The 3 dead names are dropped. |
| kit `sidebar-*` (8 declared, **0 used**) | **Not idiom. Dead boilerplate.** | Dropped entirely. §3.7. |
| kit `status-*` (12 names, 121 uses) | **Dashboard idiom.** A work-item lifecycle vocabulary — `backlog`, `queued`, `doing`, `review`, `done`, `blocked`, `paused`, `archived`, `inbox`, `routed`, `indexed`, `todo`. | `--color-dash-status-*` in `kit-dashboard`. |
| Nanite `status-ok` / `-warn` / `-danger` (30 uses) | **Not idiom — it is the feedback triad at lower saturation.** | Maps onto contract `success` / `warning` / `danger`. The saturation difference is a *value* question → §12. |
| Nanite `mode-*` (4 names, 14 uses) | **Chat/agent idiom.** Agent-mode identity colors. | `--color-chat-mode-*` in `kit-chat`. |
| Nanite `composer-*` (9 declared, 3 used) | **Chat idiom** — a deliberately always-dark surface. | `--color-chat-composer-*` in `kit-chat`, **carrying only the 3 names in use**. |

#### `status-` is a burned prefix

The two implementations use `--color-status-*` for **different things** — 12 workflow lifecycle states
in the kit, 3 health states in Nanite. Same prefix, incompatible meanings, both live.

> **`status-` is not available to the contract and not available unprefixed to any idiom.** The
> dashboard vocabulary becomes `dash-status-*`. Nanite's triad dissolves into the contract.

### 9.3 How a new idiom claims a prefix

So that `kit-chat` and every later kit do not each invent a convention:

1. **One prefix per kit package, and it is registered, not assumed.** The prefix is declared in a
   single file in `design-tokens` — `idioms.ts`, exporting `IDIOM_PREFIXES` as a `const` array.
   Claiming a prefix is a one-line PR to that list. Two kits claiming the same prefix is then a merge
   conflict rather than a silent overlap.
   Reserved today: `dash` (kit-dashboard), `chat` (kit-chat).
   **Burned:** `status` (§9.2). **Retired:** `sidebar`.
2. **An idiom token may not shadow a contract name.** If the segment after the prefix equals a
   contract name, it is an error — `--color-chat-primary` is banned, because a chat component wanting
   the primary color should name `primary`. Mechanically checkable, and CW-0117 should own the rule.
3. **A name is promoted to the contract when a second idiom needs it — not before.** This is the
   epic's "a saved composition is a component when a second app assembles it," applied to tokens.
   Promotion is a deliberate edit to the contract list, and the idiom keeps an alias for one release.
4. **Demotion is allowed and expected.** A contract name that turns out to serve one kit moves down
   and gains a prefix. `sidebar-*` would have been caught years earlier by this.

---

## 10. The type surface, and how it stays in sync

**Recommendation: yes, types — and the CSS is generated from the TypeScript.**

This follows [[prefer_type_safety]], and the record asks for a real argument rather than deference.
Here is the measured one.

### The failure mode is not hypothetical — it is in production, in both codebases, today

Scanning every color-bearing utility in both implementations against the set of tokens each actually
declares, there are **four invented token names across 16 use sites**, every one of them rendering no
color at all:

| Invented name | Where | Uses | What happened |
|---|---|---|---|
| `status-running` | `sysop-ui/components/settings-panel.tsx:97,117` | 6 | The kit declares 12 statuses. `running` is not one of them. |
| `status-info` | `nanite/settings/SystemPromptsViewer.tsx:116,120` | 6 | Nanite declares `status-ok/warn/danger` only. |
| `bg-bg-surface` | `nanite/chat/composer/{BooleanChoice,CardRadio,Drawer}.tsx` | 3 | The token is `--color-surface`. `bg-surface` is used correctly 461 times elsewhere. |
| `warning-fg` | `nanite/settings/agents/SkillDetailView.tsx:421` | 1 | `brand`, `primary`, `danger` and `success` all have `-fg`. `warning` does not. |

Every one is **plausible**. `status-running` sits beside eleven real statuses. `warning-fg` is the
missing corner of an otherwise complete family. `bg-bg-surface` is a correct token with one extra
word. This is exactly the mistake that survives a skim — and all four did, in two separately
reviewed codebases. (CW-0116 §A1 found `status-running` independently from the kit's side.)

A `ColorToken` union turns all sixteen into compile errors.

### Nanite already proved the mechanism works — and proved what happens without it

The strongest evidence is a controlled experiment that already ran inside one file tree:

- `TokenValues = Record<TokenKey, string>` forces every theme to carry every key. Across **6 built-in
  themes × dark and light = 12 complete value sets × 40 keys**, there is **zero drift**. Not one
  missing key, not one extra. The compiler holds it.
- The names that live **only in CSS** — `divider`, `selection-fg`, and the 9 `composer-*` — are
  exactly the ones that drifted out of the type. `types.ts`'s own comment says the excluded set is
  "composer chrome, status-ok/warn/danger pair helpers", but `status-*` **is** in `TokenKey`, and
  `divider` and `selection-fg` are excluded without being mentioned. The comment describing the
  untyped boundary is itself wrong.

Same repository, same authors, same week. The typed half did not drift; the untyped half did, and its
own documentation of the boundary is inaccurate.

### Direction of generation: TypeScript → CSS

Two hand-maintained lists that must agree will drift, and nothing will tell you. One source generates
the other. **TS is the source.** Four reasons:

1. **The values must exist in TS anyway.** `apply.ts` writes themes at runtime and the theme editor
   reads `TOKEN_META`. If CSS were canonical you would need a CSS parser in the browser, or a second
   copy — which is the drift you were avoiding.
2. **A typo in CSS becomes a valid token.** Going CSS → types means the compiler learns the
   vocabulary *from* the file that can contain mistakes; `--color-bg-surfcae` would become a legal
   `ColorToken`. Going TS → CSS, a typo is a compile error at the definition site.
3. **One edit adds a token.** The generator emits the `@theme` block, the shadcn alias block, and the
   `:root` / `.light` value blocks from one array. Today adding a token to Nanite means four edits in
   three files.
4. **Charts need real color strings in JS** (§3.6). A CSS-canonical design cannot serve them without a
   second export.

**The generated CSS is committed and reviewable**, and CI runs the generator in `--check` mode — the
build fails if the committed file differs from the generated one. So the CSS stays readable in diffs
and cannot drift.

### The surface

```ts
// design-tokens/src/tokens.ts — the single source

export const COLOR_TOKENS = [
  'bg', 'bg-elevated', 'surface', 'surface-hover', 'surface-active',
  'fg', 'fg-secondary', 'fg-muted', 'fg-faint',
  'border', 'border-subtle', 'divider',
  'primary', 'primary-hover', 'primary-active', 'primary-muted', 'primary-fg',
  'brand', 'brand-hover', 'brand-active', 'brand-muted', 'brand-fg',
  'selection', 'selection-fg', 'ring',
  'danger', 'danger-hover', 'danger-muted', 'danger-fg',
  'warning', 'warning-muted', 'warning-fg',
  'success', 'success-muted', 'success-fg',
  'info', 'info-muted', 'info-fg',
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
] as const
export type ColorToken = (typeof COLOR_TOKENS)[number]

export const TEXT_TOKENS   = ['micro','caption','label','control'] as const
export const RADIUS_TOKENS = ['panel','control'] as const
export type TextToken   = (typeof TEXT_TOKENS)[number]
export type RadiusToken = (typeof RADIUS_TOKENS)[number]

export type TokenValues = Record<ColorToken, string>

export interface Theme {
  id: string; name: string; description?: string; author?: string; version?: string
  /** Shipped with the package — read-only, duplicate to edit. */
  builtin?: boolean
  tokens: { dark: TokenValues; light: TokenValues }
}

/** Editor metadata. Nanite's TokenMeta, kept — it is what makes a theme editor possible. */
export interface TokenMeta {
  key: ColorToken
  label: string
  description?: string
  category: 'surfaces'|'text'|'borders'|'primary'|'brand'|'selection'|'feedback'|'chart'
  /** Typically authored as rgba — the `-muted` variants. */
  allowsAlpha?: boolean
}
```

**Scales get types too**, and the reason is the same as for color: a typed radius tier stops
`rounded-panel` being written `rounded-pannel`.

### Component props typed against the contract

The epic named the concrete case: Nanite's `Envelope` `accent` and `StatusPill` `tone` are **local
string-literal copies** of the token vocabulary today, and CW-0116 §E found nine kit exports with a
prop typed `string` applied as a color. Both become:

```ts
export type Tone = Extract<ColorToken, 'success'|'warning'|'danger'|'info'>
export type Accent = Tone | Extract<ColorToken, 'primary'|'brand'>
```

Derived with `Extract`, not restated — so removing a token from the contract breaks the prop type
rather than leaving it pointing at nothing.

### The honest limit — and why lint is not optional

**TypeScript cannot type a substring of a `className`.** `<div className="bg-surfcae">` is a valid
string and always will be. Types cover **props and theme authoring**; they cannot cover utility
strings.

Two things narrow the gap:

1. **`cva` variant maps keyed by token type.** `design-components` will use `cva` anyway; typing the
   variant keys as `Record<Tone, string>` puts the compiler back in the loop for the tone-to-class
   mapping, which is where the kit's three byte-identical tone maps (CW-0116 §D) live.
2. **The lint gate (CW-0117)** catches the rest — both raw values and unknown token names. It can
   import `COLOR_TOKENS` directly, so the lint rule and the type share one source and cannot disagree.

This is the [[prefer_type_safety]] corollary exactly: **types for what exists, lint for what should
not.** The four invented names in §10 would be caught by *either* — which is the argument for
building both, not for choosing.

---

## 11. What I measured, and where it differs from the brief

Re-measured 2026-09-11 UTC against both trees at HEAD. Reported as findings rather than worked
around, per the epic's standing rule.

**Confirmed exactly:** `text-[10px]`×73, `text-[11px]`×55, `text-[13px]`×38, `text-[12px]`×31,
`rounded-[4px]`×39, `rounded-[6px]`×36 in Nanite's chat directory; **68 distinct arbitrary values**
there; 6 built-in themes with complete dark and light sets; hex concentration in the theme layer
(627 in `lib/theme`, **37** at component level — the brief's 24 was low; corrected 2026-09-12,
`ui/src` excluding `lib/theme`, 37 hex across 7 files).

**Differs:**

| Brief | Measured |
|---|---|
| "21 color names shared, exactly the shadcn standard set" | **19 shared.** Of shadcn's **18** core names, **17** are in both — `accent-foreground` is kit-only, `destructive-foreground` Nanite-only. The shared 19 also includes two **non**-shadcn names, `bg` and `warning`. And `accent` is shared *as a name* while meaning opposite things (§3.4). |
| "405 arbitrary-value utilities" in chat | **466.** The 68-distinct-values figure reproduces exactly; the total does not — most likely variant-prefixed classes (`hover:`, `sm:`) excluded earlier. |
| "seven distinct radii between 2px and 10px" | **Eleven distinct radii, 1px to 14px** in chat alone (1,2,3,4,5,6,7,8,10,12,14). Eight of them fall in the 2–10px band. Worse than reported, not better. |
| Type sizes 8,9,10,11,12,13,14 | **Twelve distinct sizes in chat**, including **half-pixel values** — `8.5px`, `9.5px`, `10.5px`, `12.5px`. Not previously counted, and the sharpest instance of "two values that clearly meant the same thing." |
| "`--color-panel-*` (5 variants), `--color-sidebar-*` (7 names) are dashboard idiom" | **6** panel names (3 used, 3 dead; 2 value-identical to other tokens) and **8** sidebar names, **referenced zero times anywhere**. Neither is dashboard idiom — panel is the contract surface ladder, sidebar is dead boilerplate (§9.2). |

**New, not in any prior pass:**

1. **Four invented token names in production, 16 use sites, all rendering no color** (§10) — in both
   codebases. `status-running` corroborates CW-0116 §A1 independently.
2. **`sysop-ui` overrides Tailwind's radius scale; Nanite does not.** `rounded-sm` is 4.5px in the kit
   and 4px in Nanite; `rounded-lg` is 9px vs 8px. Same token name, different rendering, no error (§5).
3. **`status-` is a colliding prefix** — 12 workflow states vs 3 health states (§9.2).
4. **Letter-spacing is a fourth unmeasured scale** — 23 distinct values, several differing only in
   leading-zero notation (§6).
5. **Spacing is 99.4% clean** — 6,751 named against 39 arbitrary (§7). The strongest single argument
   that holes in a scale, not carelessness, cause arbitrary values.
6. **The kit has a real scale defect — smaller than Nanite's, not larger.**
   *(CORRECTED 2026-09-10 by CW-0117, which re-measured before building the lint rules. The original
   claim here — "the kit's density EXCEEDS Nanite's, 5.8 vs 4.2 per 100" — was an artifact and is
   withdrawn. It counted arbitrary VARIANT SELECTORS as arbitrary values: of the kit's 415 bracket
   utilities, **192 are selectors** like `data-[side=right]:`, `group-data-[size=sm]:`, `has-[>svg]:`
   — the vendored shadcn primitives' state syntax. `data-[state=open]:bg-surface` names a selector
   and a token; it is categorically not a component naming a value. Nanite's chat directory has
   **zero** of them.)*
   Stripping the selectors leaves **223 real arbitrary values** in the kit against **467** in Nanite's
   chat. Narrowing further to the three dimensions that actually have tokens — which is what the lint
   rules report — gives **kit 2.0 per 100 (154 / 7,801 lines), Nanite chat 3.1 per 100 (355 / 11,311)**.
   *(Denominators stated deliberately. A reader cannot check "2.0 per 100" but can check "154 / 7,801",
   and both errors this paragraph has carried were JOIN errors — correct numbers divided by or paired
   with the wrong thing. Note Nanite's rate rounds to 3.1 or 3.2 depending on whether the denominator
   is ESLint's file set (11,311) or a `find` over `*.ts,*.tsx` (11,245); the numerator is identical and
   the ordering is unaffected. That is measurement noise, not a third error.)* The kit's
   154 include `text-[10px]`×38, `text-[11px]`×32, `text-[9px]`×12 plus tracking in four spellings. So
   the kit is **cleaner than Nanite on scale but not clean**, which is the claim that survives — and it
   survives on either measure, since 2.9 vs 4.2 across all real values orders the same way.
   *(Second correction, same day, by CW-0119: this paragraph originally paired the three-dimension
   RATES with the all-real-value COUNTS — "2.0 per 100 (223 real values)". Each number was right alone
   and the pairing was wrong, which is the identical failure mode this paragraph exists to document.
   Worth fixing on principle even though the conclusion never moved.)*
   The original error is itself the fourth instance of this epic's recurring shape — a headline number
   counting something that is not the thing it names. See [[verify_capability_claims_against_write_path]].
   **What this still supports:** the scale problem is not Nanite-specific, which §11.5 and the Tether
   measurement below establish more strongly than the kit ever did. What it does NOT support, as
   originally stated, is the kit being the worse offender.
   **Tether — the epic's reference implementation — is the portfolio's densest type-scale offender**
   (measured by CW-0117): 328 arbitrary scale uses across 15 files, `text-[11px]`×129, `text-[12px]`×114,
   `text-[10px]`×30, plus tracking in five spellings. 114 of those restate `text-xs` exactly. Tether is
   genuinely the colour reference — 0 hex, 3 raw — and nobody had ever measured its scale.

**Reconciled with CW-0116**, which measured the kit's scale defect independently and reached the same
conclusion. Its numbers and mine differ slightly by scan scope, and neither is wrong:

| | CW-0116 | This pass | Why |
|---|---|---|---|
| kit `text-[Npx]` | 112 uses, 6 sizes | 105 uses, **8** sizes | I include `theme.css`'s `@layer components` and count `text-[16px]` / `text-[20px]`, which fall outside the 8–13px band CW-0116 was characterising. |
| kit `tracking-[…]` | 27 uses, 9 values | 31 uses, **11 spellings of 6 values** | Same, plus I separate spelling from value — the sharper form of CW-0116's own `.18em`/`0.18em` observation. |

The conclusion is identical either way, and CW-0116's framing is adopted directly: the scale problem
is **not Nanite-specific**, the kit has it too, and `--tracking-label` is its name (§6).

**Process finding, routed to sysop-ui-33:** the boot document states that *every* task in this epic
carries a 2026-09-11 scope-correction comment and that the comment wins over the description. **My
task, CW-0111, has no comments at all** (`CommentsMeta.total = 0`). Of the nine epic tasks I checked,
four carry one (0140, 0127, 0129, 0115) and five do not (0111, 0117, 0124, 0125, 0128). The boot
document carried the three corrections inline, so no work was blocked — but any session told to
"read the comment, it wins" and finding none may assume its description is current when it is not.

---

## 12. Value notes for Chrispian's design review

Scope fence respected: these are *values*, changed by nobody here. Recorded because they surfaced
while reading, and the review is yours.

1. **The two text ramps do not align.** The kit's four steps are brighter than Nanite's at the same
   position — its `text-muted` (`rgb(212 212 216)`) is close to `fg` rather than to a secondary. Which
   four values the contract ships is a design call.
2. **`--theme-color-panel` equals `--theme-color-bg`** in the default palette, so kit `Card` and
   `Dialog` render flush with the page. Deliberate dense-ops look, or drift? (CW-0116 §C raised the
   same.)
3. **`--theme-color-panel-2` equals `--theme-color-panel-hover`** — one value, two names, in all five
   palettes.
4. **Nanite's `status-ok/warn/danger` are lower-saturation than its `success/warning/danger`** —
   `#6b9e8a` vs `#c0c4c8`, `#b09060` vs `#d4202e`. Folding them into the contract feedback family
   (§9.2) is right on *naming*; whether a health dot should be quieter than an error banner is a
   values call. If yes, the answer is a `-muted`-style variant, not a second family.
5. **`warning` and `danger` are the same color in Nanite's default theme** (`#d4202e` both) — so a
   caution and a failure are visually identical today. Probably an artifact of Direction C's
   restricted palette rather than intent.
6. **Direction C collapses `primary` toward `fg`** (`#e8eaed`) and `success` to a near-grey
   (`#c0c4c8`). Deliberate for that direction, but it means the default theme cannot demonstrate the
   contract's semantic range — worth a second built-in that does.
   **CW-20260913-0035, 2026-10-01:** retain the settled feedback names. Concrete now
   uses its authored health green/amber hues, adjusted for readable text; Flat/Mono
   also gets amber warning distinct from danger. Danger and other palettes stay
   unchanged. Quiet treatment uses existing tints, not a second health family.
   This resolves the value questions in items 4–6 without changing the selected
   default (`dir-a`) or migrating Nanite. See design-tokens README and
   [before/after feedback proof](screenshots/health-feedback/README.md).
7. **`--color-overlay` exists in the kit (3 uses) and not in Nanite**, which writes `bg-black/50`.
   Left out of the contract as too thin (§8); promote it if you want scrims themeable.

---

## 13. The three open calls — DECIDED, review round 2

All three were put to Chrispian and all three came back. Recorded here so CW-0124 builds the decided
contract rather than the draft's recommendation.

*(Relayed via sysop-ui-33. If any reading below is off, correct it here — this section is the
authority for the three, and §2/§3.6/§4 were updated to match.)*

| Call | Decision |
|---|---|
| **1. Type scale — extend or replace?** | **Extend now, with closing deliberately kept alive as a future option.** `micro`/`caption`/`label`/`control` are added and Tailwind's `xs`/`sm`/`base` stay. The one-way-door concern is acknowledged rather than dismissed: the closed semantic scale is not rejected, it is deferred. |
| **2. Value-layer prefix** | **`--hl-*`.** §2 updated. Collision safety on public npm wins; the cost is one generator constant. |
| **3. `chart-1..5`** | **Names only. The palette is Chrispian's own design pass.** The family enters the contract; `design-tokens` must not ship invented series colors. §3.6 updated. |

**What "kept alive" obliges CW-0124 to do.** Extending is the decision, but it is explicitly not
final, so the implementation should not foreclose the other option. Concretely: emit the four new
steps from `TEXT_TOKENS` rather than hand-writing them into the CSS, and keep Tailwind's inherited
steps listed in one place. Closing the scale later then means banning six names in the lint config
and adding their replacements to one array — not re-authoring every component. If that turns out to
cost real complexity, say so rather than building an abstraction nobody asked for.

---

## Appendix — the contract at a glance

**48 color tokens**

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
chart       chart-1 … chart-5
syntax      syntax-key  syntax-string  syntax-number  syntax-boolean  syntax-null
```

**+16 generated shadcn aliases** · **+2 font tokens**
*(CORRECTED 2026-09-10 by CW-0124, which implemented it. This read "+18". §3.7's table holds 24 names;
8 of them map onto themselves — `primary`, `border`, `ring`, `chart-1..5` — and generate nothing.
**16 are generated.** 18 was shadcn's own core-name count, which is a different quantity than the one
this line names. Same shape as §11.6's withdrawn density figure.)*

**Scales**

```
text      micro 9   caption 10   label 11   [xs 12]   control 13   [sm 14]   [base 16+]
radius    [xs 2]  [sm 4]  control/[md] 6  [lg 8]  panel 10  [xl 12]  [2xl 16]  [full]
tracking  tracking-label 0.18em   tracking-eyebrow 0.28em   (everything else Tailwind's)
spacing   Tailwind's, unmodified — no tokens
```

`[bracketed]` = Tailwind's own step, inherited unmodified.

**Idiom prefixes** — `dash` (kit-dashboard) · `chat` (kit-chat) · burned: `status` · retired: `sidebar`

---

[^substr]: **Corrected 2026-09-12 (CW-20260910-0127).** The figures in §3.1, §3.2 and §3.3 were
originally **inclusive-substring** counts — `grep -o 'text-fg'` also matches `text-fg-muted`,
`-secondary` and `-faint`. They are now **token-exact**: the utility is split on its colour slot and
the token read out of it, so `text-fg-muted` counts toward `fg-muted` and not toward `fg`, and
`bg-bg-surface` counts toward neither.

**No ordering in this document changes, and §3.2 gets stronger** — its `1,829 vs 123` was substring
on *both* sides (`text-text*` returns 124 in frozen sysop-ui), so token-exact the ratio moves from
about 15:1 to **20:1**.

The correction is not a uniform deflation, which is why it needed re-measuring rather than scaling:

| Token | Substring | Token-exact | |
|---|---|---|---|
| `surface` | 461 | **417** | inflated — caught `surface-hover`, `surface-active` |
| `bg` | 275 | **77** | inflated — `bg-bg-elevated`, `bg-bg-subtle` |
| `fg` | 1,829 | **471** | inflated — three longer `fg-*` names |
| `border` | 518 | **140** | inflated — `border-subtle` |
| `bg-elevated` | 201 | **209** | **deflated** — `bg-bg-elevated` misses the other colour slots |

`bg-elevated` is the one to remember: a substring grep *under*-counts whenever you anchor it to one
utility slot. Neither direction is safe.

**And the token-exact instrument has its own blind spot, which found this figure twice.** It splits a
utility on its colour slot and drops anything whose slot it does not recognise — so a slot missing
from the list vanishes *silently*, with no error and no zero row. `bg-elevated` is 209, not 208,
because `ring-offset-bg-elevated` fell out of a slot list that had `ring` but not `ring-offset`. The
full breakdown, since it is the whole lesson in six lines:

```
201  bg-bg-elevated          4  text-bg-elevated         1  ring-bg-elevated
  1  ring-offset-bg-elevated  1  border-bg-elevated       1  border-b-bg-elevated
```

So: **the substring instrument fails loudly and the token-exact one fails quietly.** Prefer the
second, print the per-slot breakdown, and treat a slot list as something to verify rather than
assume. This is the same instrument error as the withdrawn §11.6
density figure and the `lucide-react` file count (16 importers, 18 mentions) — third occurrence,
so: **state the instrument beside the number, always.**
