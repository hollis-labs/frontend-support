# @hollis-labs/design-components

Layer 4 of the Hollis Labs frontend layering: **the idiom-free base.** Styled
compositions of Base UI primitives that name tokens from
`@hollis-labs/design-tokens` and carry no idiom of their own.

[`OverlaySidebar`](docs/overlay-sidebar.md) adds a host-controlled modal sidebar
on the existing Sheet, with pinned chrome and a scrolling body.

[`InspectionDialog`](docs/inspection-dialog.md) adds controlled bounded inspection
chrome with host-owned focus, navigation, and arbitrary content (local candidate,
unreleased).

> **The one rule: a component may name a token, never a value.**
> It covers **scale** as much as colour. `text-[13px]` names a value exactly as
> much as `#1a1b26` does.

---

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

## Install — and the line that is not optional

```bash
npm install @hollis-labs/design-components @hollis-labs/design-tokens
npm install @base-ui/react react react-dom lucide-react     # peers
```

```css
/* your app's stylesheet */
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";   /* ← THIS ONE */
```

**Leave out that third line and styling silently fails.** A greenfield app may
look mostly unstyled; an app already using the same token utilities can look
almost correct while package-only widgets break. Tangent's LiveDot measured
0 × 0 without registration and 8 × 8 with it, while both production builds
succeeded. See the
[adopter-path guide](https://github.com/hollis-labs/design-kit/blob/main/docs/adopter-path.md)
for the measured comparison and a focused computed-style probe. Restart the
dev server after import changes before verifying a fresh production build.

Tailwind v4 emits a utility only for a class string it has *seen*, and it does not
scan `node_modules`. This package's class strings ship inside `dist`, so without
something pointing Tailwind at them, package-only utilities are never generated.
Your own source may already cause shared utilities such as `bg-surface` to be
emitted, masking the missing scan. There is no error to read, because the defect
is in what your build did not produce rather than in anything the code says.

`source.css` contains an `@source` directive pointing at this package's own `dist`,
plus the Base UI orientation variants and `no-scrollbar` utility its components
use. A handwritten glob does not supply those definitions.
It ships as an importable stylesheet rather than as a glob you write yourself
because **`@source` paths resolve relative to the CSS file that declares them** —
so the path is written once, here, against a layout this package controls, instead
of every consumer hand-writing
`@source "../node_modules/@hollis-labs/design-components/dist/**/*.js"` against a
layout that changes with hoisting, with the package manager, and inside a monorepo.
A wrong glob fails exactly as silently as a missing one.

Verified 2026-09-11 against `tailwindcss` 4.3.3: a package-shipped stylesheet's
`@source` resolves against its own location and emits the utilities.

### If you are using `@hollis-labs/kit-dashboard`

The dashboard theme supplies these registrations for you.
`@hollis-labs/kit-dashboard/theme.css` imports both its own
`source.css` and this one. A custom-theme dashboard must import the registrations
directly instead.

### How this was found, which is the reason to trust the line above

The repo's demo was this package's only consumer, and **the demo had the identical
bug** — its `@source` globs still pointed at `../src`, where these components no
longer live after the extraction. So the base components had been rendering
substantially unstyled in the one place anyone would have noticed. Adding the glob
took the demo's compiled stylesheet from 57 kB to 120 kB; that delta is the size of
what was missing. "It worked in the demo" was not evidence.

---

## Does this package ship compiled CSS? No — decided, not overlooked

There is a second possible answer to the problem above: ship a prebuilt stylesheet
containing every utility these components use, so styling does not depend on your
Tailwind configuration at all. **Rejected, by CW-20260910-0131, for two reasons.**

**It would fight your own build rather than replace it.** Any consumer who has
Tailwind — which is all of them today — would get both the prebuilt sheet and their
own build's output for the same class names. Duplicate declarations whose winner
depends on `@import` order is a worse failure than the one it fixes, because it is
intermittent and looks like a specificity bug.

**And it cannot tree-shake.** A prebuilt sheet carries the utilities for every
component in the package whether you import one or forty. The `@source` route emits
exactly the utilities your app actually renders, which is the property that makes
`preserveModules` in the build worth having in the first place.

The population a prebuilt sheet would serve — a consumer with no Tailwind build — is
empty across this portfolio, which is Tailwind v4 end to end.

**The door stays open and costs nothing to keep open.** A prebuilt sheet is purely
additive: a new `./styles.css` subpath, no change to anything documented here. If a
non-Tailwind consumer ever turns up, that is a small task rather than a migration.

---

## What is in it

| | |
|---|---|
| shadcn primitives (`ui/`) | 26 files — button-group, collapsible, hover-card, table, button, badge, card, checkbox, input, textarea, label, dialog, alert-dialog, dropdown-menu, popover, command, input-group, scroll-area, select, separator, sheet, switch, tabs, tooltip, skeleton, sonner |
| Components | 21 — `Pill` · `LiveDot` · `Callout` · `CopyableId` · `CopyButton` · `ConfirmDialog` · `DetailDialog`/`DetailSection` · `FormDialog` · `JsonViewer` · `JsonModal`/`PayloadActions`/`PayloadSummary` · `MetaList` · `Metric` · `ProgressBar` · `AppShell` · `DetailPageLayout` · `OverflowMenu` · `CollapsibleSection` · `Combobox` · `EmptyState` · `SearchInput` · `TransferList` |
| Hooks | `useCopy` · `useArrowNav` · `useControllableState` (0.4.0) |
| Contracts | `ColumnDef`/`SortState`/`alignClass`/`compareBy` · `Tone`/`TONE_CLASSES` · `IconComponent` · the row-activation protocol |

**The test every export passed: "would `kit-chat` take this unchanged?"** Anything
that answered no is dashboard idiom and lives in `@hollis-labs/kit-dashboard`. The
column *contract* is here; the `DataTable` that renders it is not.

## Peers, and why each one is a peer

| Peer | Why not a dependency |
|---|---|
| `@base-ui/react` | Two installed copies of a headless library means two portal roots and two context trees. The symptom is a Popover inside a Dialog misbehaving in a way nobody traces back to a manifest. |
| `react`, `react-dom` | The app owns these. |
| `lucide-react` | This package ships an icon **shape** (`IconComponent`), not an icon set, so you pick the library and its major version. |

`@hollis-labs/design-tokens` is a real `dependency`, not a peer: the token contract
is what these components are compiled against, and a component paired with the wrong
contract version names tokens that do not exist.

### The bundler externalises `dependencies` as well as peers, and that is load-bearing

`vite.config.ts` derives `external` from `package.json` rather than from a
hand-written list. This is not an optimisation. This package's first build inlined
`sonner` into `dist/`, and **`sonner` keeps its toast queue in module state** — so an
app calling `toast()` from its own installed copy would push onto a different queue
than the `<Toaster/>` rendered from the bundled one. The toast never appears, and
nothing in the stack points at a bundler config. `tailwind-merge` is the milder
version of the same thing: two configs, two caches, 80 kB paid twice.

Deriving the list from the manifest is what makes the two impossible to disagree. A
hand-kept list is a second place to remember, and its failure is silent.

---

## Subpaths

| Import | For |
|---|---|
| `@hollis-labs/design-components` | everything above |
| `@hollis-labs/design-components/source.css` | registers this package with your Tailwind build — see the top of this file |
| `@hollis-labs/design-components/keyframes.css` | opt-in, only if you use `<ProgressBar indeterminate>` |

`keyframes.css` is a separate import on purpose: a keyframe is a global name, and a
package should not install one into your document because you imported a Button.

## Toast

`notifySuccess` / `notifyError` need `<Toaster/>` mounted once, from this package's
`ui/sonner`. Its theming names contract tokens through sonner's own CSS-variable
surface (`var(--color-bg-elevated)`, `var(--color-fg)`, `var(--color-border)`,
`var(--radius-control)`) rather than through classNames — still the one rule, just
expressed in the only place sonner reads.

Worth knowing, because it is the kind of thing that stays broken for a year: in
`libs/sysop-ui` this component named `var(--popover)`, `var(--popover-foreground)`
and `var(--border)`, **none of which were ever declared** in either tree. An invalid
custom property makes the whole declaration invalid at computed-value time, so
sonner silently fell back to its own defaults. The toast rendered; it had simply
never been themed. Repaired here.

## Working on this package

```bash
npm run build       # tsc -p tsconfig.build.json && vite build
npm run typecheck
npm run test:run
npm run lint        # the design rules, enforced at zero
```

`prepack` runs the build, deliberately **not** `prepare` or `prepublishOnly`.
`prepare` runs during install, and npm does not order workspace installs by
dependency — which is what turned CI red once. `prepublishOnly` does not run for
`npm pack`, so a tarball could be cut with an **empty `dist/`** and nothing would
say so. `prepack` is the only hook that is right on both counts. Do not tidy it.

`vite-plugin-dts` emits declarations under `dist/src/` while `preserveModules`
flattens the JS to `dist/`, which is why `types` points at `./dist/src/index.d.ts`.
`rollupTypes: true` was tried in sysop-ui and produced an empty `export {}` bundle —
see `[[sysop_ui_build_quirks]]` before "fixing" it.

## Appearance preferences

See [theme and mode setup](../../docs/appearance.md) for the shared preference store,
ModeToggle, ThemePicker, persistence, and the system default.

## Vendored source

AI Elements ports follow the [vendoring convention](docs/vendoring.md), with
per-file provenance, a [version inventory](docs/upstream-versions.md), and upstream
licence reference texts. Each source-taking PR carries the applicable attribution
and licence in the receiving package’s shipped `LICENSE`.

### Added primitives — design-components 0.4.0

ButtonGroup, Collapsible and HoverCard are added in **design-components 0.4.0**.
Registry `0.3.0` does not contain them; consumers need `^0.4.0`.

- `ButtonGroup`, `ButtonGroupText`, `ButtonGroupSeparator`: labelled independent
  controls in horizontal/vertical layout. Base UI 1.8.0 has no ButtonGroup export;
  this is a semantic `role="group"` layout with normal Tab order, not a toolbar.
  `ButtonGroupText` uses Base UI `render` composition, replacing upstream `asChild`.
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`: Base UI Root/Trigger/
  Panel, with controlled `open`/`onOpenChange` or uncontrolled `defaultOpen`,
  `disabled`, `keepMounted` on content, and Base UI `render` composition.

- `HoverCard`, `HoverCardTrigger`, `HoverCardContent`: Base UI PreviewCard with
  a link trigger, portal and positioned preview. Set `delay`/`closeDelay` on the
  trigger (upstream Radix used root `openDelay`/`closeDelay`). Popup content is
  supplementary by default (`aria-hidden="true"`) per Base UI guidance; pass
  `aria-hidden={false}` on `HoverCardContent` when accessible content or controls
  are needed. Put essential information at the link destination. See [Base UI guidance](https://base-ui.com/react/components/preview-card).
- `Alert` is omitted: existing `Callout` already supplies `role="alert"`, title,
  rich children, configurable icon, tone and actions. Use `tone="neutral"` or
  `tone="danger"` for the upstream default/destructive cases; another notice
  surface would duplicate that contract without adding needed behavior.

Run the [primitive demo](demo/index.html) with
`npx vite --config packages/design-components/demo/vite.config.ts` from the repo root.

HoverCard popup behavior is checked by
[the Chromium proof](demo/scripts/hover-card-proof.mjs). With the demo running,
set `PROOF_OUTPUT` to a scratch directory and run the script with an optional
`PLAYWRIGHT_MODULE` pointing to a separately installed Playwright `index.mjs`.
Playwright is verification tooling; it is not a new package runtime dependency.

### Controllable state (0.4.0)

`useControllableState({ value, defaultValue, onChange })` returns
`[state, setState]`. `defaultValue` is required and used only to initialize
uncontrolled state. A defined `value` keeps the host in control: the setter
requests changes via `onChange`, and state follows the host's next value.
Pass `null` for an empty controlled selection; `undefined` selects uncontrolled
mode. Keep the mode fixed for the lifetime of the component.

The stable setter accepts a value or a functional update. Uncontrolled updates
in one event compose in order; controlled updates resolve against the current
host value. `onChange` fires only when `Object.is(next, current)` is false,
never merely because the host changes props. This hook contains no transport or
store behavior. It is exported in `0.4.0`; registry `0.3.0` does not contain it.

### Inherited primitive attribution

[The provenance audit](docs/primitive-provenance.md) verifies the 23 earlier
shadcn-derived primitives inherited through sysop-ui. Their file headers and the
package LICENSE now retain the shadcn MIT notice alongside the newer ports.
This attribution correction ships with the next lockstep release; published
tarballs and the workspace version are unchanged.

### Optional modal and search behavior

All public modal wrappers accept optional fullscreen and admitted focus-return
policy. `SearchPalette`, `CycleModeToggle` and `SearchAddToggle` compose controlled
local behavior. See [the API and compatibility contract](docs/nil-dialogs.md).
