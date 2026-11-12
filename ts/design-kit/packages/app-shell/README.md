# @hollis-labs/app-shell

The manifest-driven app shell. It consumes the Substrate generated `frontend.manifest.json` (manifest_version 0, v0.3
vocabulary) and places each contribution in the host's regions. The manifest is a build-time artifact: the app build
imports it as static JSON and passes the loaded value in. The shell fetches nothing.

```tsx
import manifest from './frontend.manifest.json'
<ManifestShell manifest={manifest} admin={adminManifest} apiBase="/api" path={path} onNavigate={navigate}
  views={{ activity: ActivityPanel }} pages={{ items: ItemsPage }} bindings={bindingTable} />
```

## What it does

- Refuses an unknown `manifest_version` with a visible error; there is no fallback shape.
- Places `nav.item`, `nav.group`, `settings.region`, `surface`, `panel`, `dock.tab`, `widget` and `slot` by region.
  Docked regions and their anchors come from the manifest's `regions` catalog.
- Applies the SF-2 dock attributes to docked regions (`dockAttributes`, by region name): `openState`, `exclusive`
  (opening a tab closes the region's others), `sizes` (token options and default; the user's pick is remembered through
  `dockStorage`), `dismissKey` (`Esc`) and `mobile` (`bottom-sheet`: at narrow widths, max-width 1023px or `isNarrow`,
  docked tabs open as bottom sheets). A region with nothing supplied gets the vocabulary defaults; an invalid set is
  refused with a diagnostic. Docked regions are not in the overlay stack.
- Registers every placed contribution into a plugin-host-ui `PluginHostRuntime` by kind (registry v2 entries, a slot
  catalog built from the shell model) and renders `panel`, `dock.tab` and `widget` through the host's own components.
  What the host refuses is listed in Diagnostics; `onHostDiagnostic` receives everything the host reports. plugin-host-ui
  reserves the owner `core`, so a contribution whose `module` is `core` is refused.
- Derives page routes from `surface` items. A route that is a backend path (`/api/`, `/admin/`) or is claimed twice is skipped.
- Renders `settings.region` from the runtime admin manifest (groups by reference, scope kind `app` only). Until the admin
  manifest is passed, sections show as loading.
- Selects renderers through `@hollis-labs/design-bindings` (`kind@version`, origin, isolation-only trust); the host owns the table.
- Owns overlay state (modal, drawer, popover, toast; depth 2). Esc (or a region's `dismissKey`) closes the most recently opened overlay or docked region and focus returns to its trigger.
- Skips anything it cannot place and lists it in the Diagnostics drawer; the shell still starts.
- Hosts supply page bodies (`pages`, by surface key) and views (`views`, by `view` name). A failing view is contained by
  plugin-host-ui's render boundary.

## Action gateway

Pass `actions` to `ManifestShell` and call `useActionGateway().handleCall({ surfaceId, functionCallId, callFunction: { '@call': 'items.save', hollis_action: { id, subject, risk, basis }, input } }, { trigger })`.
The result is `{ functionCallId, value: <outcome> }`. `actions` supplies the backend, the agent function names it routes, the
audit sink, the step-up grant issuer (`issueGrant`; auth is the host's) and optionally `risk`, `currentBasis`, `describe`, `undo`,
`catalog` (overrides and `openOverlay` / `setData`) and `onReview`. Semantics and statuses: see CHANGELOG 0.3.0. The core
(`createActionGateway`) has no React dependency.

## Not here

Backend action endpoints, auth and key handling, page content, and any app change. The manifest's region
catalog (`{name, docked, anchor}`) does not yet carry `openState`, `exclusive`, `sizes`, `dismissKey` or `mobile`, so the host
supplies them through `dockAttributes`; when Substrate adds them, the shell should read them from the catalog instead.
