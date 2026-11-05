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
  Docked regions and their anchors come from the manifest's `regions` catalog. At narrow widths (max-width 1023px, or
  `isNarrow`) docked tabs open as bottom sheets.
- Derives page routes from `surface` items. A route that is a backend path (`/api/`, `/admin/`) or is claimed twice is skipped.
- Renders `settings.region` from the runtime admin manifest (groups by reference, scope kind `app` only). Until the admin
  manifest is passed, sections show as loading.
- Selects renderers through `@hollis-labs/design-bindings` (`kind@version`, origin, isolation-only trust); the host owns the table.
- Owns overlay state (modal, drawer, popover, toast; depth 2). Esc closes the topmost entry and focus returns to its trigger.
- Skips anything it cannot place and lists it in the Diagnostics drawer; the shell still starts.
- Hosts supply page bodies (`pages`, by surface key) and views (`views`, by `view` name). A failing view is contained by
  plugin-host-ui's render boundary.

## Not here

The action gateway (risk, confirmation, outcome policy; SF-5b), page content, and any app change. SF-2 dock attributes
beyond `anchor` (`openState`, `exclusive`, sizes, `dismissKey`) are not in the manifest's region catalog yet and are not applied.
