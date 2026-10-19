# Changelog

The six **core packages** (`design-tokens`, `design-components`, `design-app-runtime`,
`kit-dashboard`, `kit-chat` and `eslint-config-design`) release together at one number. Folio
scaffolds them with a single version input, and a mixed set would let one `^0.x` range resolve a
second copy of `design-tokens`. A core package with no code change still takes the new number and
its entry says so. `design-bindings`, `kit-settings`, `kit-observe` and `kit-account` version on
their own. This file is the release record; each package also carries its own `CHANGELOG.md` for
anything specific to it.

---

## kit-admin 0.1.0 — 2026-10-03 — first release (independent version)

`kit-admin` releases controlled manifest-driven admin navigation and page
composition, including the read-only settings text fix. It requires core
`^0.4.0`, kit-settings `^0.2.0` and kit-observe `^0.1.1`, and ships an MIT LICENSE.
The packed Chromium proof covers one Nanite backend in a read-only configuration.
Real-backend writes and Tachyon remain unproven.

---

## 0.4.0 — 2026-10-02 — six core packages, independent settings and observe updates

The six core packages move together to `0.4.0`. design-app-runtime and
eslint-config-design take the number with no code change. kit-settings `0.2.0`
adds readOnlyContext on its 0.x line; kit-observe `0.1.1` fixes heading typography
and documents controlled clock handling. design-bindings remains `0.1.0`. kit-account, kit-admin,
kit-code, kit-voice and kit-workflow remain private `0.0.0` and are not published.

**Upgrade the set together.** All workspace core ranges, including private kits,
move to `^0.4.0`; a `^0.3.0` range excludes the next 0.x minor and would install
registry copies. kit-observe's optional dashboard peer and kit-admin's settings
range also move to compatible versions. Folio adoption follows registry publication
in its own change.

- **design-tokens:** Tailwind `dark:` utilities match the default dark palette when
  no explicit mode marker is present, fixing first paint; explicit light scope
  behavior and zero-specificity matching remain intact. Strengthen the existing
  ring values for Graphite dark, Hacker light and P4 dark; no token is added and
  ring-soft remains retired. Decorative strokes follow the stronger ring in those
  three combinations.
- **design-components:** add ButtonGroup, Collapsible, HoverCard and the shared
  useControllableState hook; correct inherited shadcn MIT attribution. HoverCard
  is supplementary by default, with an opt-in accessible-content override. Replace
  ring-ring/50 with full-strength ring-ring on ten controls, including destructive
  and invalid focus states; native text-field click focus strengthens too.
- **kit-dashboard:** restore keyboard Button/menu focus rings under theme.css,
  retain quiet pointer focus and increase unsorted DataTable glyph contrast.
- **kit-chat:** add Message actions/branching, CSS Shimmer, Reasoning, ChainOfThought,
  Sources, Plan, Tool, Confirmation content, Queue, Attachments/intake, ModelSelector,
  Suggestions, Context, Question, Image, InlineCitation, OpenIn and expanded Artifact.
  Data, content and application actions remain host-owned. The range now requires
  the design-components release containing Collapsible and HoverCard.
- **kit-observe:** StatCollection/demo headings use the defined control size and
  semibold weight; Clock documentation covers correct sampling, strict future-time
  warnings, receipt/source provenance and keeping observations off DOM elements.
- **kit-settings:** optional readOnlyContext renders nonwritable fields as labelled
  text while retaining provenance/apply state and the existing default controls.

**License metadata:** kit-chat's license expression is now `MIT AND Apache-2.0`,
matching its shipped MIT notice, AI Elements attribution and full Apache terms.
The private kit-code, kit-voice and kit-workflow fields use the same expression.
All other package license fields remain `MIT`; design-components' shadcn sources
carry MIT notices.

---

## 0.3.0 — 2026-10-02 — the six core packages move together; two packages are released for the first time

The six core packages move to `0.3.0`. Three have changes: `design-components`, `kit-dashboard`
and `kit-chat`. Three take the number with **no code change** so one number selects a compatible
set: `design-tokens`, `design-app-runtime` and `eslint-config-design` (the last also gains
documentation). `kit-settings` and `kit-observe` are published for the first time, at `0.1.0`.
`design-bindings` is not in this release and stays at `0.1.0`: it has not changed.

**Upgrade the set together.** Every internal range is now `^0.3.0` (and the two new packages
require the core set at `^0.3.0`). A caret range on a `0.x` package does not reach the next
minor, so a `0.2` package will not resolve against a `0.3` one.

**Behaviour change to read before upgrading: small controls are squarer.**
`design-components`' `cn()` did not know the contract's `rounded-control` / `rounded-panel`
names, so a class a component declared was kept beside the base `rounded-lg` and the base won.
`cn()` now registers them, and the declared radius applies.

- **Changes** (`rounded-control`, the 6px control radius, now applies): `Button` sizes `xs`,
  `sm`, `icon-xs` and `icon-sm`, and any caller passing `rounded-control` to a primitive. Before:
  8px under the contract CSS, 9px under `kit-dashboard`'s theme. After: 6px in both. Where it
  shows in the kits: the dashboard gallery and Operations buttons, `kit-account` access actions,
  `kit-chat` card actions and the composer's Send and Stop, and `kit-observe` retry and copy actions.
- **Does not change:** `Button` `default`, `lg` and the bare `icon` size (still 8px, 9px under the
  dashboard theme); surfaces using the panel radius (10px) and a card given the control radius (6px); grouped small Buttons; native small
  Select and ThemePicker; and `kit-settings`, whose explicit override already rendered 6px.
- Evidence: 92 paired before/after captures, 240 changed elements, all of them carrying a radius
  alias class and landing on the declared radius (one deliberately constructed
  `rounded-panel rounded-lg` case proves the last argument wins). See
  [`radius-aliases.md`](https://github.com/hollis-labs/design-kit/blob/main/packages/design-components/docs/radius-aliases.md).

**What is new**

- **`kit-dashboard`**: `TimestampSampleChart` on `/charts`, for exact UTC gauge and cumulative
  counter samples with visible gaps for missing samples. The existing day-summing
  `TimeSeriesChart` is unchanged.
- **`kit-settings`** (first release): controlled, schema-driven settings forms for the approved
  admin manifest scalar profile, with provenance and restart-required handling, explicit
  host-owned apply intent, and a setup wizard. No fetching, transport or storage.
- **`kit-observe`** (first release): controlled health, stats, exact sample series and diagnostics
  for the same manifest. `@hollis-labs/kit-dashboard` is an *optional* peer, needed only for the
  `/charts` entry.
- **`kit-chat`**: an internal refactor onto the shared `cn()`; the visible radius change above is
  the only user-facing effect.

Both new packages require Tailwind v4 as a peer. Each package's `CHANGELOG.md` has its own entry.

---

## 0.2.0 — 2026-10-01 — six packages

`design-tokens`, `design-components`, `design-app-runtime`, `eslint-config-design`,
`kit-chat` and `kit-dashboard` move to `0.2.0` together (`design-components` realigns from
`0.1.1`). `design-bindings` is not in this release: since `0.1.0` it gained only an
optional `tailwindcss` peer declaration and documentation, so it stays at `0.1.0` and
ships with its next change.

**Upgrade the set together.** The internal ranges are now `^0.2.0`, and a caret range on a
`0.x` package does not reach the next minor, so a `0.1` package will not resolve against
a `0.2` sibling. `kit-dashboard` and `kit-chat` need `design-components` and
`design-tokens` `^0.2.0`.

**Behaviour changes to read before upgrading**

- **Tailwind v4 is a required peer** of `design-components`, `kit-dashboard` and
  `kit-chat`, and an optional peer of `design-tokens`, `design-app-runtime` and
  `eslint-config-design`. npm 7+ installs a missing required peer; an incompatible
  installed major (Tailwind 3) fails peer resolution instead of installing silently
  unstyled. The automatic install does not configure your CSS build.
- **All ten built-in themes now carry light and dark.** The four sysop palettes gain light
  sets, and text and feedback contrast was corrected across the built-ins, so some values
  shift slightly from `0.1.0`. `setMode` now also toggles the `.dark` class.
- **`kit-dashboard`'s four legacy palettes adopt the canonical contract values.** Their
  ids, the `sysop.theme` key and the P4 White default are unchanged; borders, faint text,
  overlays and workflow hues visibly change. The built-in themes keep their appearance.
- **`design-components`**: the outline and destructive `Button` variants no longer carry
  dark-only background and border overrides; they follow the active mode's tokens.
- **`kit-chat`**: `ChatInput` draws its own frame with a visible **Send** action. A host
  that supplies its own submit control passes `showSubmitButton={false}`.

**What is new**

- **Appearance**: `createThemeStore` and `useTheme` (design-app-runtime), `ModeToggle`,
  `ThemePicker` and `OverlaySidebar` (design-components), theme-only storage helpers and
  the colour-derivation rules as functions (design-tokens).
- **Operations tables**: density, error and footer slots, a generated match summary, and
  bounded previous/next navigation hooks (kit-dashboard).
- **Chat**: the interactive card set, `ArtifactCard`, `DocumentCard` and `PromptCard`,
  windowed history with `useChatHistory`, and composer and transcript polish (kit-chat).
- **Lint**: baseline/ratchet mode, a Biome path, and kit-owned idiom vocabularies
  (eslint-config-design).

Each package's `CHANGELOG.md` has the full entry and the task ids behind it.

**`@hollis-labs/sysop-ui` is deprecated on npm** as of this release, pointing at
`kit-dashboard`. Existing installs keep working; removal follows later and is not part of
this release.

---

## 0.1.1 — 2026-10-01 — `design-components` only

A hotfix to one package, so for this release the shared version number is suspended:
`design-components` is `0.1.1` and every other package stays at `0.1.0`. The numbers
realign at the next full release.

`cn()` in `@hollis-labs/design-components` dropped the contract's font-size tokens when
merging beside a text colour, which made a small primary `Button` unreadable and left
`Pill` at the wrong size. Fixed; no API change. The details and the tests are in
[`packages/design-components/CHANGELOG.md`](./packages/design-components/CHANGELOG.md).

Not in this release, on purpose: `kit-dashboard`, `eslint-config-design` and `kit-chat`
have unreleased changes on `main` (Operations density and keyboard navigation, the lint
ratchet and Biome path, kit-chat's typography fix). Some of them change rendering or add
API, so they ship as a deliberate minor release rather than inside a patch.

---

## 0.1.0 — 2026-09-11

**First release. Six packages appear on npm at once, none of which existed under
these names before.** If you have never seen this project, read this section top to
bottom — it is written for you rather than for someone who followed the work.

### What this is

One rule, enforced mechanically:

> **A component may name a token, never a value.**

It covers **scale** as much as colour — a component reaching for `text-[13px]` is
naming a value exactly as much as one reaching for `#1a1b26`. The point is that
appearance has exactly one authority instead of being re-decided in every component.

Four layers, in dependency order:

| Layer | | Package |
|---|---|---|
| 1 | **headless behaviour** — no appearance | Base UI (`@base-ui/react`), a peer |
| 2 | **the token contract** — the names and their types, a vocabulary with no values | `@hollis-labs/design-tokens` |
| 3 | **the theme** — the values. The only layer permitted to name a colour. | `design-tokens`' ten built-ins, or your own |
| 4 | **components** — styled compositions of (1) that reference only (2) | `@hollis-labs/design-components`, and the kits |

Tokens come before components on purpose: a component authored with no token contract
available does not avoid drift, it just relocates it somewhere harder to see.

### The packages

| Package | What it is | Take it if |
|---|---|---|
| **`@hollis-labs/design-tokens`** | The contract — 48 colour token names and their types — plus ten built-in themes. No React, no framework, no dependencies. | you want the vocabulary, with or without anything else here |
| **`@hollis-labs/design-components`** | The idiom-free base: 23 shadcn primitives on Base UI, plus 21 components. Names tokens, never values. | you want components and your own layout |
| **`@hollis-labs/design-app-runtime`** | API client, polling and SSE hooks, storage, list cursors. **No opinion about appearance** — zero runtime dependencies, zero class strings. | you want the plumbing without taking a look |
| **`@hollis-labs/kit-dashboard`** | The dashboard idiom: nav rail, page header, `DataTable`, filter bar, twelve widgets, charts. A **kit** is layers 3 + 1 bundled. | you are building a dense operations UI |
| **`@hollis-labs/design-bindings`** | The binding contract — which component draws a wire kind, and at what trust. Names a component identity, never an appearance. | you render server-described UI |
| **`@hollis-labs/eslint-config-design`** | The gate. Six rules that enforce the one rule, including `no-undefined-token`. | you want the rule enforced rather than agreed to |

### What an adopter does first — and it is not optional

**Tailwind v4 emits a utility only for a class string it has seen, and it does not
scan `node_modules`.** Every package here ships its class strings inside `dist`. So
unless your build is pointed at them, the components render, render *mostly
unstyled*, and **nothing errors**.

One import fixes it, and each package ships the file:

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";   /* ← without this, no colour */
```

Using `kit-dashboard`? Its theme covers both:

```css
@import "tailwindcss";
@import "@hollis-labs/kit-dashboard/theme.css";
```

`source.css` is shipped rather than documented as a glob you write yourself, because
`@source` paths resolve relative to the CSS file that declares them — so the path is
written once, by the package, against a layout the package controls. A hand-written
`@source "../node_modules/…"` breaks with hoisting, with the package manager, and
inside a monorepo, and it fails exactly as silently as leaving it out.

### Versioning — why all six are `0.1.0`

They are released as a set and depend on each other, so a shared number makes "same
number, same release" true, which is the property you actually need when six packages
arrive at once and three of them are linked. `0.x` keeps pre-1.0 latitude while this
is still developing in the open; `0.1.0` rather than `0.0.1` says these were designed
and reviewed rather than scaffolded. Sibling ranges are pinned at `^0.1.0` — never
`*` — so a published manifest can only ask for versions that exist.

**`kit-dashboard` goes down, from `0.9.0` to `0.1.0`, and that is deliberate.** It
carried `0.9.0` from `@hollis-labs/sysop-ui`, the package it was forked from. Nothing
has ever been published under the name `@hollis-labs/kit-dashboard`, so there is no
line to continue, and keeping `0.9.0` would have asserted a continuity that does not
exist — while putting the least contract-conformant package in the set eight minors
ahead of the contract it depends on.

### Relationship to `@hollis-labs/sysop-ui`

`sysop-ui` is **not deprecated, not moved, and not affected by this release.** It
stays published at `0.9.0` serving its eight consumers, untouched. `design-kit` is a
**fork**, not a rename — which is exactly what lets it change freely without breaking
anything live. `kit-dashboard` carries sysop-ui's real git history.

Each project migrates on its own schedule, in its own session. Nothing here requires
anyone to move.

### What is deliberately NOT in this release

- **`@hollis-labs/kit-chat` does not ship.** It is reserved and empty; the chat kit is
  separate work. Holding five finished packages for it was considered and rejected.
- **`chart-1` … `chart-5` are names with placeholder values** — every built-in theme
  sets all five to the same magenta, and `theme.chartPalette === 'placeholder'` says
  so in the data. This is not an oversight. Five categorical colours that stay
  distinguishable across ten themes and survive colourblindness is real design work,
  and it is pending. *Five identical magentas make a chart obviously wrong; five
  plausible colours would make it quietly unreviewed.*
- **`kit-dashboard` speaks the contract vocabulary but still carries its own theme
  values** — 434 lines across four palettes. It works, and it is the next task rather
  than this one.
- **The 88 derived colour values** exported as `DERIVED_TOKEN_VALUES` have not been
  through design review. The list is exported precisely so that stays visible.

### Fixed on the way out the door

Four defects that broke nothing in this repo and would each have broken a consumer.
They are listed because every one of them is the same shape — *a failure that looks
like success* — and that shape is worth recognising.

- **Components shipped without a way to be styled.** No package documented `@source`
  and none shipped one. The repo's own demo had the identical bug, so the one place
  it would have shown up was broken in the same way. Fixed by shipping `source.css`
  from every package that has class strings. Measured in a scratch consumer built
  from the published tarballs: **11 of 19 probed utilities existed only because of
  that import**, and the compiled stylesheet went from 28,924 to 94,518 bytes.
- **`kit-dashboard/theme.css` could not be imported at all.** It pulled in
  `shadcn/tailwind.css` while `shadcn` was a devDependency — correctly so, it is a
  5.9 MB CLI — so a consumer following the README got `Can't resolve
  'shadcn/tailwind.css'`. The import is gone. Of its 629 lines this repo used two
  custom variants and one utility; `design-components` now ships those three itself.
- **Two of those variants were load-bearing and nearly lost.** `data-horizontal:` and
  `data-vertical:` have no Tailwind equivalent — Tailwind's bare `data-x:` compiles to
  `[data-x]`, and Base UI sets `data-orientation="horizontal"`. Dropping the shadcn
  import alone silently retargeted 23 selectors at an attribute that is never present.
  Caught by diffing the compiled stylesheet rather than by reasoning about it.
- **Three of `kit-dashboard`'s shipped type declarations pointed outside the
  package** — `import { ColumnDef } from '../../../design-components/src/index.ts'`,
  a path a consumer does not have, naming a directory that is not published, with a
  `.ts` extension `tsc` rejects. `DataTable`, `DataTableRow` and `OperationsTablePage`
  were affected; the emitted JavaScript was always correct, so this broke types only.
  `tsc` had been reporting it 65 times as `TS6059` while the build exited 0.

### Verified before release

Every package packed with `npm pack` and installed from the tarballs into a scratch
app carrying only React, `react-dom`, `@base-ui/react` and `lucide-react`, then
compiled with a real Tailwind v4 build and **rendered in Chromium**:

- Eleven components on screen, zero console errors, both consumer paths.
- Seven colour probes read back from `getComputedStyle` and compared against the
  contract's own exported values — `fg` `#f4f4f5`, `fg-faint` `#52525b`, `primary`
  `#6e8aa8`, `surface` `#27272a`, `bg-elevated` `#18181b`, `bg` `#0e0e10` — **7 of 7
  exact.**
- The four added type steps measured 9 / 10 / 11 / 13 px, `rounded-panel` 10px,
  `rounded-control` 6px.
- Zero nested `node_modules` in any tarball, so no dependency is bundled — which
  matters most for `sonner`, whose toast queue is module state.
