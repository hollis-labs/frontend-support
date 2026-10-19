# Unreleased — CW-20261017-0040

- Share compact view tabs, record-list compositions and detail-dialog roles;
  preserve search keyboard options and rich status filter labels.

- Add an opt-in yellow action/attention accent palette for configuration surfaces.

- Add explicit reference document scale for compact shell geometry and controls,
  with automatic restoration when released. Ensure compact button labels win
  over the generic control-size rule.

- Align configuration typography with compact dashboard roles; keep scalable
  profiles and root-relative control/layout sizing by default. Remove directory type
  overrides and keep rail width owned by the shared component.

- Extend the opt-in typography profile to page headings, summaries, filter chips,
  keycaps and header actions. FilterEntityCombobox propagates it into its portal.
  Preserve root-relative search/scope controls and default scalable consumers;
  compact chip line height now follows the audited reference.

- Add opt-in `DashboardTypographyProvider` (`compact` or `scalable`) and named
  record/menu typography roles. Compact record type uses fixed CSS pixel sizes;
  menu type, line heights and spacing remain root-relative. Portal content can
  inherit the selected profile through `useDashboardTypography`. No root font
  reset and no global change to the core text tokens.

- Reference fidelity: NavRail preserves native links with optional SPA navigation and
  an accessible name. FilterEntityCombobox accepts token-based trigger composition.
  Record selection gutters and title truncation match the compact reference.
  Workflow review tone is independent of a monochrome brand accent.
  Status labels use the reference 0.14em tracking; record dates have a named
  0.12em tracking token for consistent compact table composition.

- Add `RecordSummary` and `DataTableCell` to `/data` for shared dense record
  presentation in app-owned tables, lists and boards. `DataTableRow` now consumes
  the same cell density implementation. Navigation, data and row activation remain
  consumer-owned. Parallax exercises the pattern through a local 0.4.0 candidate
  backport; these source additions target the next release, not published 0.5.0.

# Unreleased — CW-20261010-0073

- Add data-agnostic OperationsListPage under /layout: controlled facet registry, admitted/matched/revealed/checked counts, modal or inline inspection, lifetime-fenced actions and focused-pane search.
- Add opt-in controlled selection/reset, guarded rows and Show more seams to OperationsTablePage/DataTable. Existing defaults are retained. No registry release is performed.

# @hollis-labs/kit-dashboard

## 0.5.0 — 2026-10-10

Add OperationsListPage controlled selection/projection/inspection composition and scoped search/facet seams. Upgrade the six core packages together; ^0.4.0 excludes this minor.


- Add data-agnostic OperationsListPage under /layout: controlled facet registry, admitted/matched/revealed/checked counts, modal or inline inspection, lifetime-fenced actions and focused-pane search.
- Add opt-in controlled selection/reset, guarded rows and Show more seams to OperationsTablePage/DataTable. Existing defaults are retained. No registry release is performed.

# @hollis-labs/kit-dashboard

## 0.4.0 — 2026-10-02

Requires design-components, design-tokens and design-app-runtime `^0.4.0`.

- Restore keyboard focus rings for Buttons rendered under `theme.css`, including
  kit-observe Retry/Copy controls. Suppress rings only for pointer focus and give
  keyboard-focused menu items a token-based ring alongside their existing highlight.
- Increase unsorted DataTable glyph contrast by using `text-text-subtle` without
  half opacity. Sorted glyphs retain the stronger `text-text-muted` color and
  directional arrows. Packed-consumer evidence is in
  [`dashboard-focus`](../../docs/screenshots/dashboard-focus/README.md).

## 0.3.0 — 2026-10-02

Co-released with the other core packages, alongside the first releases of kit-settings and
kit-observe. Requires `@hollis-labs/design-components`, `@hollis-labs/design-tokens` and
`@hollis-labs/design-app-runtime` `^0.3.0`.

- Add `TimestampSampleChart` to `/charts` for exact UTC gauge and cumulative-counter
  samples, visible null gaps, real zero values, and an accessible data table.
  Existing `TimeSeriesChart` keeps its day-summing behavior. Additive: nothing existing
  changes. kit-observe's `SampleSeriesView` is built on it.
- Small Buttons inside the dashboard (`xs`, `sm`, `icon-xs`, `icon-sm`) render the 6px control
  radius instead of 9px under the dashboard theme, through design-components 0.3.0. See that
  package's changelog for the full list of what changes and what does not.

## 0.2.0 — 2026-10-01

Co-released with design-tokens, design-components, design-app-runtime, eslint-config-design
and kit-chat. Requires `@hollis-labs/design-tokens` and `@hollis-labs/design-components`
`^0.2.0`: it imports the theme-storage exports that design-tokens 0.1.0 does not have.

**Behaviour changes to know before upgrading**

- **The four legacy palettes adopt the canonical contract values (CW-20260911-0071).**
  `p4-white`, `p1-green-phosphor`, `p3-amber-phosphor` and `hi-contrast` keep their ids,
  the `sysop.theme` storage key and the P4 White default, but their colours now come from
  design-tokens' `sysop-*` themes instead of a hand-authored palette, so borders, faint
  text, overlays and workflow hues visibly change (for example P4 faint text moves from
  `113 113 122` to `131 131 139`). Each also gains a light mode. The ten built-in themes
  keep their established appearance: the six shadcn compatibility mappings they relied on
  are retained, and a before/after capture of all twenty modern states is pixel-identical.
  `SettingsNotice` `info` now uses the feedback info colour; it previously used the
  indexed/success hue. Value-by-value comparison and screenshots are in
  [`docs/screenshots/theme-migration/palette`](../../docs/screenshots/theme-migration/palette/README.md).
- `tailwindcss: ^4.0.0` is now a **required** peer (CW-20260912-0097). npm 7+ installs it
  when it is missing, and an incompatible installed major fails peer resolution. The
  automatic install does not configure your CSS build; keep the explicit app dependency
  and the stylesheet imports described in the README.

**Operations density and detail navigation (CW-20261001-0500).** `OperationsTablePage`
keeps its compact default; `density="comfortable"` (the `TableDensity` type) increases row
padding. New optional props: `errorState` renders request failures apart from `emptyState`
(loading still wins), `footer` pins result or selection controls below the scrolling body,
`filterActions` holds trailing view/density/refresh controls, and `searchMatchCount`
generates the match summary when no explicit `filterSummary` is given. `FilterBar` gains
`searchMatchCount` and `actions`, wraps on narrow widths, and announces its summary with
`role="status"`. `ListPageLayout` takes a `footer`. Sortable table headers now carry
`aria-sort`. `onVisibleOrderChange` publishes the rendered ids after sorting and windowing,
and the new `useListNavigation` and `useArrowNav` hooks, exported from `/data`, give
bounded previous/next navigation through that order without wrapping or guessing a
missing cursor. Everything is additive. See *Operations density and detail navigation*
in the README.

**Success and info feedback tokens (CW-20261001-0522).** `--hl-success` and `--hl-info`
are defined for every dashboard palette.

**Opt-in themed scrollbars (CW-20260912-0031).** `show-scrollbar` draws a scrollbar in the
contract's colours, following light and dark mode. Global suppression is unchanged, and an
explicit `no-scrollbar` wins.

**Kit-owned idiom vocabulary (CW-20261001-0529, CW-20260912-0046, CW-20260911-0071).**
The package ships `idiom-tokens.json` (exported as
`@hollis-labs/kit-dashboard/idiom-tokens.json`) as the single source of its idiom names
and deprecations, and `DASHBOARD_DEPRECATED_TOKENS` is derived from it. Workflow status and
label styling moved to canonical `dash-status` and `dash-status-label` utilities, and
`PriorityBadge` to `dash-priority-*`, with the same bindings and measured colours. The old
names remain as deprecated compatibility aliases. Priority fills are preserved as
`dash-priority-p1-bg` and `dash-priority-p2-bg`.

**Theme persistence (CW-20260911-0071).** The kit's theme storage now delegates to the
theme-only helpers in design-tokens. `sysop.theme`, the legacy ids and the defaults are
unchanged, and a blocked storage getter no longer throws.

## 0.1.0 — 2026-09-11

First release under this name, alongside the five other packages in this repo. The
set shares a version number; the release record for all of it is the repo's
[`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

**The version went down, from `0.9.0` to `0.1.0`, deliberately.** `0.9.0` came from
`@hollis-labs/sysop-ui`, the package this was forked from. Nothing has ever been
published under the name `@hollis-labs/kit-dashboard`, so there is no line to
continue, and keeping the number would have claimed a continuity that does not exist.
`sysop-ui` stays published at `0.9.0`, untouched, serving its own consumers.

**The dashboard idiom, and nothing else.** Since the fork this package has been
rebased onto the extracted packages: idiom-free primitives come from
`@hollis-labs/design-components`, transport from `@hollis-labs/design-app-runtime`,
the vocabulary from `@hollis-labs/design-tokens`. Its own token names went from 256
to 43. The README's *"Moved out, and where they went"* table lists every export that
left and which package now owns it.

**It re-exports none of them, on purpose** — taking the dashboard should be a choice,
not a side effect of wanting a Button.

Fixed at publish, both invisible from inside this repo:

- **`theme.css` could not be imported by anyone outside it.** It pulled in
  `shadcn/tailwind.css` while `shadcn` is a devDependency — correctly, it is a 5.9 MB
  CLI — so a consumer following this README got `Can't resolve 'shadcn/tailwind.css'`
  and no stylesheet at all. The import is gone; the three things this repo actually
  used from it now ship from `design-components`.
- **Three shipped type declarations pointed outside the package**, at
  `../../../design-components/src/index.ts` — not published, not present in a
  consumer's tree, and carrying a `.ts` extension `tsc` rejects. `DataTable`,
  `DataTableRow` and `OperationsTablePage` were affected. The emitted JavaScript was
  always correct, so this broke types only, and `tsc` had been reporting it 65 times
  while the build exited 0.

**Still carrying its own theme values** — 434 lines across four palettes, speaking the
contract vocabulary but not yet using contract values. That is the next task
(CW-20260911-0071) and deliberately not this release.
