# @hollis-labs/design-app-runtime

The app plumbing — API client, hooks, router, storage — with **no opinion about
appearance**.

This package exists because about a third of sysop-ui was neither tokens nor
components nor kit, and the original three-package model had nowhere to put it.

It is also the lever. Nanite and Tangent both measure **zero kit imports** today, and
this is the one piece either could adopt **without taking any appearance at all**. An
API client and an SSE hook have no view on how anything looks. So the surface is built
for that consumer:

- `react` is the **only required** peer dependency; Tailwind is an optional
  peer for the consuming app's CSS pipeline.
- There are **no runtime dependencies** — verified by installing the packed
  tarball into an empty project: zero transitive deps.
- Nothing here imports a component, and the package ships no CSS except one opt-in
  file that names no color.

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

A successful install alone does not verify CSS setup. These nonvisual APIs
need no component scan by themselves. Once the app renders design-components
or an idiom kit, import those packages' `source.css` registrations (or the
dashboard `theme.css` that includes them). See the
[adopter-path guide](https://github.com/hollis-labs/design-kit/blob/main/docs/adopter-path.md)
for complete value declarations and production-browser verification.

## What's in it

| Area | Exports |
|---|---|
| api | `createApiClient`, `ApiError`, `createApiContext`, `normalizeKeys`, `toSnakeCase`, `parseMetadataJson`, `normalize*` |
| hooks | `usePoll`, `useSSE`, `useElapsed`, `refreshPolledData`, `createRefreshRegistry` |
| state / nav | `createRouter`, `createScopedStorage`, `createListCursor`, `listCursorNeighbors` |
| display | `formatRelativeTime`, `formatShortDate`, `formatCount`, `formatDuration` |
| wire types | `JsonValue`, `JsonObject`, `JsonPrimitive`, `ISODateString` |
| opt-in css | `@hollis-labs/design-app-runtime/shell-reset.css` |

## What is deliberately NOT here

Per the CW-20260910-0116 triage, which decided these against this package rather than
leaving them to be argued about later:

| Not here | Goes to | Because |
|---|---|---|
| `use-copy` | design-components | Its value is the `copied` flag holding a button-label swap for 1.5s — a UI affordance with a UI-tuned duration. |
| `use-arrow-nav` | design-components | Window keydown with editable-target guards: the same category as a focus trap. |
| `lib/toast` | design-components | It wraps the `sonner` package, but only works when `<Toaster/>` is mounted — and that component lives in base. |
| `cn()` | design-components | 24 component files import it; no transport code does. |
| `lib/status` | kit-dashboard | 130 lines of Tailwind class literals plus the Torque vocabulary. Zero runtime behaviour. |
| `lib/theme` | design-tokens / kit-dashboard | Theme application is the token layer's own runtime; the four palettes are the sysop idiom. |

The four **formatters** came here rather than to components on a measurement, not an
argument: **zero kit components use them** (verified). They are consumer-facing
display helpers, which is this package's job.

## Two things changed during the extraction

**`refreshPolledData` no longer stands on a module-global `Set`.** That was flagged by
the triage and by the same finding in Nanite's command history. It cost two real
things: two parts of an app could not refresh independently, and a test could not
isolate its subscribers. `createRefreshRegistry()` makes it an object;
`defaultRefreshRegistry` keeps the old behaviour, so `refreshPolledData()` still
refreshes everything and the change is additive.

```ts
const registry = createRefreshRegistry()
const { data } = usePoll(fetchThings, 15_000, true, { registry })
registry.refresh()   // refreshes only this registry's pollers
```

**`createApiClient` no longer requires a browser.** `buildUrl` read
`window.location.origin` as a parsing base for `new URL`, and threw
`ReferenceError: window is not defined` off-browser. Only `pathname` and `search` are
read back out, so the origin never reached the result — the fix is byte-identical in a
browser, and pinned by a test asserting with-window and without-window produce the
same path.

## Known limitation: the router needs a DOM

`createRouter`'s hook reads `window.location.pathname` from its `useState`
initialiser, so it runs during render and **cannot server-render**. That is inherent
to a pushState router rather than accidental: it needs the URL to produce a first
render. Making it SSR-safe means injecting a location source, which is an API addition
and was out of scope for an extraction.

Everything else in the package works without a DOM. `createScopedStorage` is
fail-quiet (its `try` catches the `ReferenceError` too, not just the sandboxed-frame
case), and `useSSE`/`usePoll` only touch browser APIs inside effects, which do not run
during SSR.

## `shell-reset.css` — opt-in, and why it lives here

```ts
import '@hollis-labs/design-app-runtime/shell-reset.css'
```

It locks the document shell: `html, body, #root { height: 100% }` and
`body, #root { overflow: hidden }`.

This is the one part of sysop-ui's `@layer base` that is **neither appearance nor
idiom** — it names no token, no color and no scale. It is a layout invariant about how
an SPA mounts. The rest of that layer is not this, and does not come here: the `body`
background/font rules and the `*` border/outline colors name `--color-*` tokens and
belong to the token layer; the scrollbar suppression and the `outline: none` focus-ring
rules are taste and belong to a kit.

**Both codebases wrote it independently, down to incidental details** — the legacy
`-ms-overflow-style` sibling, the redundant `width: 0; height: 0`. sysop-ui has it
inside `@layer base`; Nanite has it as plain top-level CSS at `index.css:268`. Neither
imports the other. By this epic's own standard, convergence without coordination is
what makes something everyone's rather than one kit's.

It cannot live in a kit, because every kit needs it before its shell works — put it in
kit-dashboard and kit-chat re-derives it, which is the failure mode this package exists
to stop.

**It is opt-in rather than a side-effect import** because `overflow: hidden` on `body`
is a product decision: right for an app shell, wrong for a document-shaped page. A
transport package that silently changed page scroll on install would be asserting
appearance from the plumbing layer.

> **The real fix is a component, and it is not this file.** What apps actually hit is
> the flex chain *inside* the app — `<main className="min-h-0 flex-1 overflow-hidden">`
> is a block container, so a child's `flex-1` has nothing to size against and the page
> silently stops scrolling. Cerberus shipped that bug for months. That wants an
> `AppShell` owning the whole chain, which belongs to design-components — see
> `[[sysop_ui_app_shell_layout_primitive]]`, which specifies it. This file is the
> document-level precondition that component assumes.

## Do the design rules apply here?

**Yes, and it is enforced** by the repo gate, not just asserted.

Read naively that is pointless — the package holds no color, no scale and no
`className`, so the rules find nothing (measured 2026-09-11: 18 files, 0 findings, 0
files containing a `className`). The point is the opposite. Enrolling it costs nothing
today and asserts that it **stays** that way: the day a styled helper lands here, the
gate objects instead of the boundary quietly eroding. A package whose whole pitch is
"adopt this without taking any appearance" should have that property enforced.

## Verifying the boundary

```bash
npm run build && npm run test:run     # 31 unit tests
npm run boundary-test                  # from a scratch project — see the script header
```

`scripts/boundary-test.mjs` installs this package **alone** into an empty project and
exercises the API client, the hooks, the router, storage and the formatters in a bare
Node process. It is committed because it earned it: on its first run it found both of
the defects listed above, neither of which the unit tests could have caught — they run
inside a configured jsdom workspace, and this runs with nothing else installed.

## Appearance preferences

See [theme and mode setup](../../docs/appearance.md) for the shared preference store,
ModeToggle, ThemePicker, persistence, and the system default.
