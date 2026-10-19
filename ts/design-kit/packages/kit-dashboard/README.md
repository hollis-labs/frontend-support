# @hollis-labs/kit-dashboard

**Kit Dashboard** — the dashboard idiom. A package of generic shell
components, shadcn/ui primitives, the `[data-theme]` palette, and data hooks,
extracted from the most-evolved app frontends (Torque's GUI and Fragments
Engine's Sysop).

Forked from `@hollis-labs/sysop-ui` 0.9.0 and **since rebased onto the extracted
packages**: the idiom-free primitives, the transport hooks and the token contract now
come from `@hollis-labs/design-components`, `@hollis-labs/design-app-runtime` and
`@hollis-labs/design-tokens`. What is left here is the dashboard idiom. A KIT is
layers 3 + 1 of the design-kit layering: which components exist and how pages lay out.

`sysop-ui` itself is untouched and still published at `0.9.0` for its existing
consumers. This is a fork, not a rename.

- React 19 · Vite 5 · Tailwind v4 · shadcn/ui (`base-nova` style)
- The `[data-theme]` + Tailwind `@theme` token system is **canonical** — the
  single styling lineage every Hollis Labs app converges to. The hand-rolled
  "HUD" CSS in older apps is retired in favour of it.

## Tailwind compatibility

Styled components require **Tailwind CSS v4**, declared as a required
`tailwindcss: ^4.0.0` peer. npm 7+ installs a missing required peer automatically;
npm 11's default resolver rejects an installed incompatible major. An automatic
peer install does not add Tailwind to your app's manifest or configure its CSS
build. Declare it explicitly and configure the matching Vite/PostCSS/CLI
integration:

```sh
npm install -D tailwindcss@^4.0.0
```

A successful install alone does not verify styling. Follow this package's usage
instructions for the CSS imports and source registration as well.

## What's in the kit

| Area | Exports |
| --- | --- |
| Theme | `theme.css` (4 palettes + tokens), `applyTheme`, `THEME_OPTIONS`, `ThemeSwitcher`, … |
| Shell | `NavRail`, `PageHeader`, `SummaryCards`, `EmptyState`, `DetailDialog`/`DetailSection` |
| Layout | `ListPageLayout`, `DetailPageLayout`, `DetailHeader`, `TabStrip`, `OperationsTablePage` preset, `CollapsibleSection` |
| Data table | `DataTable<T>` + `ColumnDef<T>` (sortable, windowed, selectable), `RowActionMenu` |
| Filters | `FilterBar` shell + `FilterSearchInput`, `FilterCycleToggle`, `FilterChipGroup`, `FilterEntityCombobox` |
| Idiom primitives | `StatusBadge`, `PriorityBadge`, `Metric` |
| Widgets | `TimeSeriesChart` (stacked bar/area, day-bucketed), `DonutChart`, `BarMeter`, `ActivityHeatmap` (calendar heatmap), `HourlyPulse` (last-24h strip), `RecentList` |
| Status vocabulary | `statusClass`, `statusLabel` and the Torque workflow states |

**Moved out, and where they went.** These used to be exported from here and are not
any more — take them from the package that owns them:

| You used to import | Now |
|---|---|
| `Button`, `Card`, `Dialog`, `Popover`, `Command`, … and the rest of shadcn `ui/` | `@hollis-labs/design-components` |
| `CopyableId`, `CopyButton`, `Pill`, `LiveDot`, `Callout`, `Combobox`, `MetaList`, `ProgressBar`, `JsonViewer`, `FormDialog`, `ConfirmDialog`, `EmptyState`, `SearchInput` | `@hollis-labs/design-components` |
| `useCopy`, `useArrowNav` | `@hollis-labs/design-components` |
| `usePoll`, `useSSE`, `useElapsed`, `createApiClient`, `createApiContext`, `normalizeKeys` | `@hollis-labs/design-app-runtime` |
| `createScopedStorage`, `createListCursor`, `listCursorNeighbors` | `@hollis-labs/design-app-runtime` |
| `formatDuration`, `formatRelativeTime`, `formatShortDate`, `formatCount` | `@hollis-labs/design-app-runtime` |
| `notifySuccess`, `notifyError` | `@hollis-labs/design-components` |

This package re-exports **none** of them, deliberately: taking the dashboard should
be a choice, not a side effect of wanting a Button. Depend on the package you
actually want.

App-specific domain code (fragment/route/task models, app dialogs) is **not**
in the kit — it stays in each app. The kit is the generic shell.

The dashboard widgets pull in **`recharts`** (a bundled dependency) — it backs
`TimeSeriesChart`'s stacked bar/area rendering. The other widgets
(`DonutChart`, `BarMeter`, `ActivityHeatmap`, `HourlyPulse`, `RecentList`) are
dependency-free hand-rolled SVG/markup.

## Import surfaces

The root entrypoint is intentionally narrow and mirrors `ui`:

```ts
import { Button, PageHeader, applyTheme } from '@hollis-labs/kit-dashboard'
```

Optional domains live behind explicit subpaths:

| Entry | Use for |
| --- | --- |
| `@hollis-labs/kit-dashboard/ui` | Theme helpers, shell chrome, idiom primitives |
| `@hollis-labs/kit-dashboard/layout` | Page skeletons such as `ListPageLayout`, `DetailPageLayout`, `TabStrip` |
| `@hollis-labs/kit-dashboard/data` | `DataTable`, `RowActionMenu`, filter-bar pieces |
| `@hollis-labs/kit-dashboard/widgets` | Lightweight SVG/markup widgets that do not use `recharts` |
| `@hollis-labs/kit-dashboard/charts` | `TimeSeriesChart` and `TimestampSampleChart` backed by `recharts` |

Recommended rule:

- treat the root entrypoint as `ui`
- import app transport/client plumbing from `@hollis-labs/design-app-runtime`
- import page layouts from `layout`
- import table/filter features from `data`
- import `charts` only inside pages that actually render charts
- import `widgets` explicitly for dashboard-only SVG widgets

## Consuming the kit

**Release version `0.4.0`.** `@hollis-labs/kit-dashboard` is a workspace package inside
`hollis-labs/design-kit`, released alongside the other five — see the repo's
[`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

The version went **down** from `0.9.0`, on purpose: that number came from `sysop-ui`,
nothing has ever been published under this name, and carrying it would have claimed a
continuity that does not exist.

```bash
npm install @hollis-labs/kit-dashboard
npm install @base-ui/react react react-dom      # peers
```

### In this monorepo

It is an npm workspace, so it is already linked — depend on it by name and root
`npm install` wires it up. `npm install` at the root also builds `dist/` via this
package's `prepare` script.

### In an app outside the monorepo

Apps consuming the kit today still use the frozen `@hollis-labs/sysop-ui` 0.9.0.
Nothing has migrated onto `kit-dashboard` yet, and adoption is each project's own
work, on its own schedule. To try a working copy against an app without publishing:

```bash
# from the consuming app
npm install file:../../libs/design-kit/packages/kit-dashboard
```

Run `npm run build` in `packages/kit-dashboard` after changes (or `npm run build
-- --watch`) so the linked `dist/` stays fresh.

### Wire it up

```ts
// 1. Import the canonical theme once (e.g. in main.tsx)
import '@hollis-labs/kit-dashboard/theme.css'

// 2. Apply the persisted palette before first paint
import { applyTheme, getInitialTheme } from '@hollis-labs/kit-dashboard/ui'
applyTheme(getInitialTheme())
```

**That one import is also what makes the components have colour, and it is easy to
miss why.** Tailwind v4 emits a utility only for a class string it has *seen*, and it
does not scan `node_modules` — and this package's class strings, along with those of
`@hollis-labs/design-components`, ship inside `dist`. `theme.css` therefore imports
both packages' `source.css`, each of which points Tailwind at its own built output.
Without it styling fails silently. An app already using similar utilities may
look almost correct while package-only widgets break. See the
[adopter-path guide](https://github.com/hollis-labs/design-kit/blob/main/docs/adopter-path.md)
for the measured Tangent comparison, complete
custom value declarations and focused computed-style verification. Restart the
dev server after stylesheet import changes; verify a fresh production build.

If you supply your own theme values and never import ours, import the registration
directly instead:

```css
@import "@hollis-labs/kit-dashboard/source.css";
@import "@hollis-labs/design-components/source.css";
```

The kit's components name semantic Tailwind tokens (`bg-panel-2`, `text-text-subtle`,
`border-border-subtle`, `text-status-*`, …) that `theme.css` declares, so the
consuming app's Tailwind build must process it.

`theme.css` also locks the document shell — `html`, `body`, and `#root` are
pinned to the viewport with overflow disabled, so the fixed NavRail + PageHeader
chrome never scrolls. Apps mount into `#root` and let page regions scroll
internally; no per-app `index.css` reset is needed.

## Legacy theme preference compatibility

`readStoredTheme` / `persistTheme` delegate to design-tokens' theme-only helpers.
The kit still uses `sysop.theme`, defaults to `p4-white`, and accepts the same four
legacy IDs; its switcher and exported signatures are unchanged. Blocked storage
also falls back if accessing localStorage itself throws.

New theme+mode apps use `createThemeStore` from design-app-runtime with their own
JSON appearance key (see [appearance setup](../../docs/appearance.md)). When an
app migrates, read the legacy theme once, map it to the canonical ID and persist
it through the new store. Only then retire that app's legacy key. This library
step neither migrates nor deletes stored preferences; CSS/ID migration follows
in separate CW-20260911-0071 PRs.

## Priority and workflow tokens

Priority fills are **dashboard idiom**, not general feedback tints. P1 and P2 keep
the existing 22% Oklab mix of blocked/queued into the page background. A general
`danger-muted` or `warning-muted` replacement would change that treatment and can
be undefined in the legacy palettes. Components name the result; `color-mix()`
stays in the theme layer.

| Previous utility token | Canonical token | Disposition |
| --- | --- | --- |
| `priority-p1-bg` | `dash-priority-p1-bg` | Deprecated compatibility alias, still resolves to the same fill |
| `priority-p2-bg` | `dash-priority-p2-bg` | Deprecated compatibility alias, still resolves to the same fill |

`PriorityBadge` uses `bg-dash-priority-p1-bg` / `bg-dash-priority-p2-bg`.
The kit-owned `src/styles/idiom-tokens.json` manifest is exported as
`@hollis-labs/kit-dashboard/idiom-tokens.json`; it owns the vocabulary and
deprecation map, and the design gate checks its bindings against `theme.css`.
The gate enrolls these names only within this kit. Consumer apps explicitly
register the manifest with `designConfig({ idiomManifests })` or ratchet/Biome
`--idiom-manifest` (see eslint-config-design's README).
`DASHBOARD_DEPRECATED_TOKENS`, exported from the root and `/ui`, records these
migrations. The base contract's `DEPRECATED_TOKENS` intentionally maps base names
to base replacements; dashboard-specific retirements belong to this kit.

**Workflow utilities use the dashboard namespace.** `dash-status-*` carries the
lifecycle color and `dash-status-*-label` carries its derived readable label step.
Both families cover backlog, todo, queued, doing, review, done, blocked, paused,
archived, inbox, routed and indexed. Their CSS bindings and label mixes are
unchanged. For example, replace `bg-status-doing/10` with
`bg-dash-status-doing/10` and `text-status-doing-label` with
`text-dash-status-doing-label`. The old utility names remain CSS compatibility
aliases and are deprecated in the same kit-owned manifest; kit components and
examples use the canonical names. Unknown names in either family are checked by
the kit's existing design-rule registration.

Workflow colors describe lifecycle state, rather than general feedback severity.
The label family comes from moving component mixing into the theme layer. These
workflow names are separate from Nanite's retired health-triad names. The palette migration consumes canonical base values; the naming split preserved
colors before that migration. See the [24-state workflow proof](../../docs/screenshots/theme-migration/workflow/README.md).

Decision: CW-20260912-0046. Before/after screenshots and computed styles are in
[priority proof](../../docs/screenshots/priority-tokens/README.md).

## Visible scrollbars (opt-in)

The kit keeps scrollbars hidden by default. Add `show-scrollbar` to the element
that owns overflow when a region should show a themed bar:

```tsx
<div className="show-scrollbar h-64 overflow-auto" tabIndex={0} role="region" aria-label="Task history">
  {/* scrollable content */}
</div>
```

The thumb uses contract `fg-muted`, with `fg` for the WebKit hover state;
transparent track and thin sizing follow the browser. WebKit fallback dimensions
and radius use the spacing/radius tokens. Contract colors follow the active theme
and light/dark mode, including explicit `data-mode`; no extra light-mode class is
needed. `no-scrollbar` takes precedence if both classes are supplied. Both axes
still scroll when their bars are hidden.

The opt-in lives beside the dashboard's suppression policy. Nanite's
`chat-scroll` and `provider-scroll` merely repeat suppression and are not portable
kit vocabulary, so they are not exported. No app is changed. The theme gallery
includes an opt-in region; [24-state before/after proof](../../docs/screenshots/scrollbar-opt-in/README.md)
shows the deliberate visible-bar change (CW-20260912-0031).

## App structure

Default Sysop app shape:

- eager shell: nav, page header, providers, theme boot, route state
- lazy routes: each page loaded through `React.lazy(() => import('./pages/...'))`
- page-local feature code: charts, dialogs, tables, and heavy inspectors stay with the page that uses them
- shared shell imports: `ui` and `layout`
- transport/client imports: `@hollis-labs/design-app-runtime`
- optional heavy domains: `charts` only where needed

Minimal shell example:

```tsx
import { Suspense, lazy } from 'react'
import { NavRail, PageHeader } from '@hollis-labs/kit-dashboard/ui'

const OperationsPage = lazy(() =>
  import('./pages/operations').then((module) => ({ default: module.OperationsPage })),
)

export function AppShell() {
  return (
    <>
      <NavRail items={[]} />
      <PageHeader title="Operations" />
      <Suspense fallback={<div>Loading...</div>}>
        <OperationsPage />
      </Suspense>
    </>
  )
}
```

## Adding a page

A page is generic kit chrome + app-specific content:

```tsx
import {
  PageHeader, SummaryCards, EmptyState, StatusBadge,
} from '@hollis-labs/kit-dashboard/ui'
import { DataTable, type ColumnDef } from '@hollis-labs/kit-dashboard/data'

interface Widget { id: string; name: string; status: string }

const columns: ColumnDef<Widget>[] = [
  { key: 'name', header: 'Name', width: 'fill', cell: (w) => w.name,
    sortValue: (w) => w.name },
  { key: 'status', header: 'Status', cell: (w) => <StatusBadge status={w.status} /> },
]

export function WidgetsPage({ widgets }: { widgets: Widget[] }) {
  return (
    <>
      <PageHeader title="Widgets" />
      <SummaryCards cards={[{ label: 'Total', value: widgets.length }]} />
      {widgets.length === 0 ? (
        <EmptyState variant="empty" title="No widgets" description="Nothing here yet." />
      ) : (
        <DataTable items={widgets} columns={columns} getRowId={(w) => w.id} />
      )}
    </>
  )
}
```

### Page layouts are full-bleed — chrome divides, content blocks frame

Reach for a layout component instead of hand-assembling the skeleton:

- `OperationsTablePage` — the whole list/operations page (header + summary +
  filters + table) as one preset.
- `ListPageLayout` / `DetailPageLayout` — slot-based shells for bespoke pages.

These fill the viewport edge-to-edge. Their structure comes from the **pinned
region dividers** — `PageHeader`, `SummaryCards`, `FilterBar`, and `TabStrip`
each carry a bottom border — plus the `NavRail`'s edge. *That* is the frame.
Do **not** wrap a layout, or the `DataTable` inside it, in a bordered panel:
the scroll body and table sit flush, exactly as Torque's and Fragments
Engine's `/operations` routes do.

Borders belong to **content blocks** — a card, a callout, a grouped section
*inside* the scroll body. Those opt in via the `hud-panel` class
(`rounded-md border bg-panel`). Rule of thumb: page chrome *divides* with
bottom borders; content blocks *frame* with `hud-panel`.

For the API layer, build a concrete client on `createApiClient` and a typed
context with `createApiContext`:

```ts
import { createApiClient, createApiContext } from '@hollis-labs/design-app-runtime'

const http = createApiClient({ baseUrl: '' })
export const apiClient = {
  listWidgets: () => http.get<Widget[]>('/v1/widgets'),
}
export const { ApiProvider, useApi } = createApiContext(apiClient)
```

## Bundle inspection

Use route-level lazy imports first. If a Sysop app still has a large initial
chunk, inspect the app build rather than guessing:

```bash
npm run analyze
```

Questions to answer in the report:

- which modules are in the entry chunk
- which pages moved into route chunks after `React.lazy`
- whether `recharts` appears only in the page chunks that import `@hollis-labs/kit-dashboard/charts`

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check + emit `dist/` (ES module + `.d.ts`) |
| `npm run demo` | Component gallery — every export, live theme switch (visual reference) |
| `npm run typecheck` | Type-check only |
| `npm run lint` | ESLint |
| `npm test` | Vitest (watch) |
| `npm run test:run` | Vitest (single run) |

## License

MIT — see [LICENSE](./LICENSE).

### Record presentation in app-owned tables

`RecordSummary` and `DataTableCell` are available from `@hollis-labs/kit-dashboard/data`.
Use `RecordSummary` for the dense title/metadata hierarchy in a table, list or board.
Its title accepts an app-owned link; metadata accepts inline facts. The kit owns the
type scale, tracking, truncation and metadata rhythm. The app owns link behavior,
field labels and values. Omit metadata when there is no secondary information.

`DataTableCell` supplies the same compact/comfortable padding as `DataTable` without
taking over sorting, selection or row activation. It renders a native `td`, forwards
native props, and accepts `kind="selection"` for the checkbox gutter. Apps can use
these presentation pieces while retaining an existing table's behavior.

```tsx
<DataTableCell className="w-full max-w-0">
  <RecordSummary
    title={<a href={record.href}>{record.title}</a>}
    metadata={<><span>{record.id}</span><span>{record.owner}</span></>}
  />
</DataTableCell>
```

Import `theme.css` as usual; it supplies `--tracking-dash-record-title` alongside
the existing type and spacing tokens. This additive pattern does not assign
domain status meanings or silently choose a priority for missing data.

### Operations density and detail navigation

`OperationsTablePage` keeps Torque's compact two-row filter band and dense table
as its default. `density="comfortable"` increases row padding using the spacing
scale. `filterActions` holds density/refresh/view controls; `searchMatchCount`
generates the filter/match summary (an explicit `filterSummary` takes precedence).
`footer` pins result/selection controls below the scrolling body. `errorState`
renders request failures separately from `emptyState`; loading takes precedence.
All of these are optional additions to the existing props.

`onVisibleOrderChange` publishes the rendered ids after sorting and windowing.
Keep that order in app state when opening a detail view, then use the `/data`
hooks for bounded previous/next navigation:

```tsx
import { useListNavigation } from '@hollis-labs/kit-dashboard/data'

// The app decides which rows are errors and whether the detail view is active.
const navigation = useListNavigation({
  ids: orderedErrorIds,
  currentId: openErrorId,
  onNavigate: openError,
  enabled: detailOpen,
})
// Bind navigation.onPrev/onNext to buttons, disabling them when the
// corresponding previousId/nextId is undefined. ArrowLeft/ArrowRight use
// the same handlers. Boundaries do not wrap; a missing cursor does not jump.
```

`useArrowNav` accepts callbacks directly when the app owns its own cursor.
Both hooks preserve editing, modifiers, already-consumed events and arrow-key
widgets. A custom widget can opt out with `data-arrow-nav-ignore`. Enable only
one navigation owner at a time. Cursor persistence, error classification,
fetching further pages, and auto-advance after mutations remain app behavior.

The Operations demo exercises compact/comfortable rows, errors-only filtering,
and keyboard detail navigation. Torque's primary `BoardPage`, domain filter bar,
`TaskTable` and `use-arrow-nav` informed this composition; Cerberus's resource
attention filter informed the app-owned errors-only facet. Atlas Register and
Audit Board were not present as identifiable authored views in the available
checkouts, so this change makes no claim to reproduce those surfaces.

Visual check for CW-20261001-0500 (2026-10-01): `npm run demo`, Playwright
headless Chromium, 1440 × 900 and 640 × 900. Captures live in
[`docs/screenshots`](../../docs/screenshots): compact, comfortable, errors-only,
error detail navigation and narrow layout. Browser assertions exercised both
arrow directions through two blocked fixtures with no page errors. The fixture
classification is a demo policy, not a status model supplied by the kit.

A separate, disposable Tachyon worktree rendered the built `/layout` and `/data`
entrypoints with the kit's theme CSS and mocked API responses. Its screenshot is
`tachyon-operations-consumer.png`. The preview was temporary consumer wiring;
it is not a Tachyon migration or a check against a live backend.

## Canonical palettes and legacy IDs

The theme layer imports the design-tokens contract and built-in palettes; it no
longer authors a second base palette or reverse-maps dashboard values onto
`--hl-*`. Base utilities come directly from that contract. Six shadcn mappings
retain the dashboard's established control treatment: input uses border,
secondary/muted/accent use bg-elevated, muted foreground uses fg-faint, and accent
foreground uses fg. These mappings consume contract-backed compatibility roles,
so modern themes keep their appearance while legacy palettes adopt canonical values.
The remaining layer supplies dashboard workflow tones, label/priority mixes,
sidebar roles, and old utility compatibility aliases.

`src/styles/legacy-themes.json` maps `p4-white`, `p1-green-phosphor`,
`p3-amber-phosphor`, and `hi-contrast` to their `sysop-*` counterparts.
`npm run generate:themes -w @hollis-labs/kit-dashboard` reuses the exported
`emitThemeCss` generator with those legacy IDs; the committed `legacy-themes.css`
contains generated output, never hand-authored values. Regenerate it after a
design-tokens palette change and review the diff. The kit's no-attribute default
remains P4 White; both ID spellings support light/dark selectors and nested themes.
`sysop.theme`, `THEME_OPTIONS`, `applyTheme`, and their legacy ID values are kept.
New apps should choose canonical IDs through `createThemeStore` and ThemePicker.

Adopting canonical values visibly changes legacy borders, overlays, faint text,
and workflow colors. This is a migration to the reviewed contract, not a new
palette design. The [pre-migration value comparison](../../docs/screenshots/theme-migration/palette/legacy-contract-comparison.md)
and [before/after proofs](../../docs/screenshots/theme-migration/palette/README.md)
show the changes for visual review. `SettingsNotice` now uses base danger/info
feedback colors; `SettingsStatusPill` retains doing/done lifecycle tones.

## Exact timestamp samples (unreleased)

`TimestampSampleChart` is an additive `/charts` export for one gauge or cumulative
counter series. It uses the existing Recharts dependency. It never sums by day,
fills missing values, joins across nulls, smooths, or derives rates. A finite zero
is plotted; even all-zero samples are observations. An always-visible UTC data
table includes “No sample” rows and supplies the text alternative. Animation is
disabled for all users, including reduced-motion users.

```tsx
import { TimestampSampleChart } from '@hollis-labs/kit-dashboard/charts'

<TimestampSampleChart
  label="Execution duration"
  unit="milliseconds"
  kind="gauge"
  points={[
    { t: '2026-10-01T00:00:00Z', value: 0 },
    { t: '2026-10-01T00:01:00Z', value: null },
    { t: '2026-10-01T00:02:00Z', value: 12 },
  ]}
/>
```

Hosts provide finite numbers or null, ascending unique valid UTC timestamps,
and the declared unit (`count`, `bytes`, `seconds`, `milliseconds`, `ratio`, or
`percent`) and kind (`gauge` or `counter`). Ratio and percent remain different
scales; counter resets are plotted as provided. The horizontal axis uses exact
timestamp spacing; ticks show UTC time and the table shows full UTC timestamps.
The vertical axis includes zero. The host owns fetching, requested-window bounds,
freshness and truncation notices. No samples is distinct from a null sample.

The existing `TimeSeriesChart` continues to sum events into zero-filled calendar-day
buckets. Choose it for event aggregates; choose the new surface for samples.
Heavy chart exports remain confined to `/charts`.

This surface is not in published 0.2.0. It ships in the next coordinated minor;
kit-observe cannot publish until that dashboard release is available. The demo
fixture is `/samples.html` under `npm run demo`. Geometry evidence and its
negative controls are described in [the sample proof](docs/sample-chart-proof.md).

## Generic operations list candidate

See [OperationsListPage](docs/operations-list.md) for the additive /layout composition, caller admission/projection responsibilities, lifetime-fenced action scope and local consumption status.

### Dashboard typography profiles

`DashboardTypographyProvider` and `useDashboardTypography` are exported from
`/ui`. Choose a profile at the app or preview boundary. `compact` is the dashboard default and preserves the fixed type sizes of the legacy Operations reference.
Neither changes `html`, `--spacing`, or the core `--text-*` tokens. Cell density
remains the separate `DataTableCell`/`DataTable` compact/comfortable option.

```tsx
<DashboardTypographyProvider profile="compact">
  <AppShell>{/* record tables */}</AppShell>
</DashboardTypographyProvider>

// In a descendant that opens a portal:
const typography = useDashboardTypography()
<DropdownMenuContent {...typography} className="dash-menu">
  {/* shared menu items */}
</DropdownMenuContent>
```

Apply the hook to every independently portalled surface, including submenus.
React context crosses the portal; inherited CSS variables do not. Nested
`scalable` providers reset the compact record sizes; sibling previews are isolated.

| Role class | Compact size | Other typography |
|---|---|---|
| `dash-record-body` | 13px | mono, normal, record line height |
| `dash-record-title` | 13px | body + 0.02em tracking |
| `dash-record-metadata` | 10px | mono, normal; inline buttons/code/badges inherit |
| `dash-table-heading` | 10px | mono, medium, 1.5 line height, eyebrow tracking |
| `dash-record-number` | 11px | mono, normal, record line height |
| `dash-record-date` | 11px | number + uppercase and date tracking |
| `dash-record-status` | 11px | number + uppercase and status tracking |
| `dash-record-priority` | 10px | mono, bold, uppercase, label tracking |
| `dash-menu` | `text-sm` (root-relative) | sans, normal, menu line height |

Scalable record sizes resolve through `text-control`, `text-caption`, and
`text-label`. Record line height remains four spacing units; menu line height
remains five. Browser zoom scales either profile. Browser default text size scales
only the root-relative roles; this difference is intentional and must be reviewed
when migrating a reference. A fixed `13px` and `0.8125rem` are equal only at a
16px root, not interchangeable behavior. Verify at 16/20/24px roots and enlarged
zoom, including inline metadata controls and menus, before accepting parity.

The same profile covers header and filter chrome. Use `dash-page-heading` for the
page title (compact 11px, 1.5 line height), `dash-summary-label` and
`dash-summary-value` for metric strips (11px/13px, line height 1),
`dash-filter-chip` for facet labels/buttons (10px, 4/3 line height),
`dash-filter-caption` for counts and search summaries (10px), and `dash-shortcut`
for keycaps (9px, 1.5 line height). PageHeader, SummaryCards and FilterChipGroup
consume these roles themselves. These are separate from record roles: a sans
filter chip must not inherit mono record typography merely because both are 10px.

`dash-header-action` uses 12.8px in compact typography; scalable uses the
existing control token. Shared controls use the 12px dashboard control role.
FilterEntityCombobox carries the profile into its portal: its search and state
controls use `dash-filter-search` (compact 11px), count badges use
`dash-filter-caption`, while option text uses the dashboard menu role (14px by default).
The scalable profile resets all these size variables. Compact is the default.
The theme also supplies reference spacing and control geometry; it does not
change the browser root font size or disable zoom. During browser
measurement allow CSS transitions to settle or temporarily disable them; an
immediate read of a transitioning button can report the previous root's size.


### Application-wide dashboard defaults

Import `theme.css` once for the dashboard idiom. It owns compact native headings,
body/table typography and native form defaults in the base layer, plus flat
shared Card surfaces. Panel uses the same surface without Card's outer padding.
Menus and dialogs remain elevated. A deliberately raised Card uses
`data-dashboard-surface="raised"`; do not recreate card chrome per route.

Apps can override `--dash-body-size`, `--dash-support-size`,
`--dash-section-size`, `--dash-page-padding`, `--dash-section-gap`,
`--dash-header-padding-inline` and `--dash-header-padding-block` at their root.
Shared palette roles and `--spacing` continue to govern color and scale.
`dash-page-content`, `dash-section-stack` and `dash-page-header` consume those
layout roles. `dash-form-stack` supplies a padded content/form stack with
content-width actions; use it instead of page-local grid wrappers. Use the
existing OperationsTablePage for list composition.
Custom layouts still need to use these roles; explicit local font/padding rules
are overrides, not a second set of defaults. Native-element defaults in apps
belong in `@layer base` so component utilities can win.

The default needs no per-page provider. Use DashboardTypographyProvider only
for explicit profile selection, carried through React portals. The CSS default is also compact
at the document root, covering overlays mounted outside the application element.
The scalable record profile remains available for deliberate previews.


### Shared control and focus treatment

Dashboard selectors use one control height, padding, type and arrow alignment.
Native single selects retain native form/ref/change/keyboard behavior; browsers
with `appearance: base-select` also render the themed picker, separators and
selected marker. Other browsers retain their platform picker behind the themed
closed control. Multi-select listboxes are not converted to dropdowns.

FilterEntityCombobox uses the same trigger treatment and a bounded, internally
scrolling menu. Command/combobox/select options share separators and menu type.
FilterBar adapts the base SearchInput to the dashboard search field; custom
controlled searches use `dash-search-field`. Only the wrapper draws a surface,
border and padding. Focus dims that wrapper; the inner editor stays transparent.

Dashboard rings and focus outlines are off by explicit owner direction.
Focus itself, keyboard behavior, selection and return targets are preserved;
interactive keyboard focus uses background/foreground feedback instead. This is
an idiom-level policy and does not change the neutral components' ring tokens.
`--dash-control-height`, `--dash-control-padding`, `--dash-control-bg`,
`--dash-control-active-bg`, `--dash-search-bg`, `--dash-search-active-bg`, and
`--dash-menu-divider` are the shared tuning points. Do not add route-local rings
or a second border to a composed search editor.

### Shared control layouts and evidence tables

`DashboardToolbar` and `DashboardField` are light exports from `/layout`.
Toolbar wraps whole fields and aligns adjacent controls. A field keeps its label
and one labelable control together; its default inline orientation is for filter
bands. Use `orientation="stacked"` for forms and long record selectors so the
label has a deliberate gap above the control. Preserve native labels/events and
use `htmlFor` when the control lives outside the label. Do not add local select
padding, display, background, or arrow rules. The theme owns
`--dash-toolbar-gap` and `--dash-field-gap`.

FilterBar consumes DashboardToolbar for both its search and facet rows. For an
embedded table, compose FilterBar and DataTable directly; use OperationsTablePage
when the kit should also own the page header and scroll layout. DataTable accepts
`caption` and `footer` for accessible descriptions and full-width totals/evidence
coverage, using the shared support typography. Apps retain their column content,
widths, wrapping and data behavior. A bounded evidence table can supply a pageSize
covering its supplied rows to retain full native scrolling rather than windowing.

Use `dash-selectable-row` for a selectable record button outside a table, with
`aria-pressed` or `aria-selected` as appropriate to its actual semantics. Selection
uses `--dash-selection-bg`, never a bright border; keyboard focus remains intact.

### Configuration typography

Builder-style consumers use the dashboard idiom throughout the page, including
nested editors and states. Size-only `dash-body`, `dash-support`, `dash-label`,
`dash-caption`, `dash-detail-title` and `dash-metric-value` roles retain the
consumer's semantic markup/font family. Compact values are 13/11/11/10/18/20px;
`scalable` resolves them through the core text scale. Nested compact scopes reset
these roles. `dash-control` uses the dashboard control role (12px by default), including
native editor inputs/textareas at every breakpoint. Browser zoom still enlarges
the complete interface; a root-relative document scale remains an explicit option.

Using a named core utility such as `text-control` or `text-sm` is token compliant,
but does **not** adopt compact dashboard typography. Use the idiom roles when
porting compact application surfaces. NavRail owns its non-shrinking width;
consumers should not duplicate that rule in app CSS.

### Application-wide geometry; no route requirements

Import `theme.css` once at the application entry. This is sufficient for the
reviewed reference geometry: 4px spacing steps, fixed named container widths,
12px controls, 12.8px header actions and 14px menus. Common palette, typography,
spacing, surfaces, controls and focus rules apply to every route and to portals
under the document. No route name, page wrapper, provider or JavaScript scale
hook is required. Components still need their shared slots/classes; local
utilities can intentionally override those defaults.

This changes the previous default, which combined compact record text with
root-relative spacing and controls. The old reference hook is still supported
for compatibility, but new apps should omit it. A consumer deliberately retaining
the former geometry can set `data-dashboard-scale="root-relative"` on `html`
or call `useDashboardDocumentScale('root-relative')` once at the application
boundary. Never switch that setting with the route. The hook restores the host's
previous setting on cleanup; undefined leaves the host untouched.

Document scale and typography profile are distinct: the optional
`DashboardTypographyProvider` selects compact or scalable type for a deliberate
surface variant and carries it through supported portals. It does not enable the
common stylesheet. Compact is already the default. The scalable profile uses
root-relative type; nested compact scopes restore compact roles.

App-wide customizations belong at the document theme boundary, so portals inherit
them as well. Unique page compositions and explicit component variants can remain
local. Do not copy shared styles into a route stylesheet or gate common imports on
navigation. This theme does not set html font-size, CSS zoom or transforms;
browser zoom remains available. Verify at 16/20/24px roots and narrow viewports.

### Yellow action accents

Apply `data-dashboard-accent="yellow"` to a configuration surface to use the
shared warm-yellow action, attention, focus and notice palette. It uses Tachyon's
amber-300 reference yellow in dark mode and a darker ink in light mode. Components
continue using semantic primary/warning tokens. The profile is independent of
layout scale; portalled surfaces must receive the attribute on their portal
content or inherit it from a document-level owner.

### Compact Planner-style lists

`DashboardViewTabs` (`/layout`) provides compact colored navigation with counts;
`DashboardSearchToolbar` now forwards slash focus and layered Escape options.
`FilterChipGroup` (`/data`) accepts rich labels and an accessible group name.
`RecordListContent`, `RecordListHeader`, `RecordTag` and `RankBadge` (`/data`) reuse
the Operations record typography in linked or sortable lists. Hosts retain their
routing, data and drag behavior; `dash-record-grid`, `dash-record-list-row` and
`dash-record-section-header` own shared responsive layout. `dash-detail-dialog`
applies compact copy and form roles to a portalled detail/create surface. They
inherit the theme's reference document geometry automatically.


### Evidence tables and square triage surfaces

`DataTable` supports `ariaLabel`, table `className` and
`headerVisibility="sr-only"` for accessible record lists without a visible header.
Use `density="comfortable"` for evidence rows with secondary metadata. Hosts can
supply one externally paged slice; leave sorting unset to retain its order.

`data-dashboard-shape="square"` scopes square corners to a deliberate surface;
carry it onto portalled dialog/menu content too. Native select arrows and pickers
retain the shared layout. `DashboardViewTabs variant="segments"` supplies square
segmented navigation, and `FilterChipGroup variant="outline"` supplies full-contrast
outlined filter chips. Existing defaults stay unchanged.

`BarMeter` accepts `onSelect` for a keyboard-accessible filter distribution and
`formatValue` for counts. The caller owns grouping/filter state. Kpi uses compact
dashboard typography. Categorical series can use `--color-dash-series-1` through
`--color-dash-series-3`, keeping palette choices in the shared theme.
