# Changelog

## 0.9.0

- Consumes the Substrate 76666fd frontend manifest (SF-11). **Breaking:** the `dockAttributes` prop and `BuildOptions.dockAttributes`
  are gone; docked regions carry their attributes natively in the catalog (`open_state`, `exclusive`, `sizes`, `dismiss_key`,
  `mobile`, `edge`, `height_px`), mapped to `DockAttributes` by `dockAttributesOfRegion` (`edge` becomes the side/bottom `anchor`,
  since the manifest's `anchor` is the inline region a dock sits under). `ManifestRegion` is `{name, docked, anchor?, ...}`.
- `FrontendManifest.bindings` is required (`{kind, version}[]`, sorted, unique, may be empty; origin optional, never written); a manifest
  without it is refused as malformed.
- `ManifestItem` gains `action {navigate?, openRegion?, tab?, call?, input?}`, `risk`, `order`, `when`, `keywords`, `group`. Types and
  validation only; `menu.item` and `command` are not rendered (SF-3d).
- New diagnostics `unknown-field` (a field this shell does not know, at manifest, region, item or action level) and `invalid-action`;
  neither skips or crashes anything. `manifestFieldDiagnostics` and `actionProblems` are exported.

## 0.8.0

- `WidgetCard` and the widgets.grid edit mode (SF-3 PR3; lifted copy-from-only from Nanite's `Widget`, `widget-order` helpers and the right rail's
  drag-reorder, with tokens and kit steps in place of raw values, text glyphs, and native drag and drop instead of dnd-kit).
- `WidgetCard`: collapsible card whose open state is remembered through the injected `LayoutStorage` (one `app-shell:widget-card:<app>:<id>` key).
- `WidgetGrid`: an "Edit widgets" mode with drag-reorder, accessible Move up / Move down buttons, Hide / Show and Reset layout. Order and
  visibility persist through plugin-host-ui's `createPluginLayoutStore` (no second persistence scheme); hidden widgets stay listed while editing.
  A saved id that no widget answers to renders a diagnostic card instead of crashing.
- `buildWidgetOrder`, `filterVisibleWidgets`, `moveWidget`, `reorderWidget`: pure helpers over ids.
- `ManifestShell` gains `widgetStorage?: LayoutStorage`; the dashboard layout now renders `WidgetGrid`. Without it order and visibility last the session.

## 0.7.0

- Bottom dock resize and `DockTabStrip` (SF-3 PR2; lifted copy-from-only from Nanite's chat drawer, with kit tokens and steps in place
  of raw values, and text glyphs instead of an icon library).
- Dock attributes gain `anchor: 'side' | 'bottom'` and `heightPx { min, default, max? }` (defaults 120 / 240 / 640; `heightPx` only with
  `anchor: 'bottom'`, otherwise refused with an `invalid-dock-attributes` diagnostic). A bottom dock is exclusive unless the host says otherwise.
  `ResolvedDockAttributes` gains `anchor` and `heightPx`.
- `useDockState` gains `height(region)` / `setHeight(region, px)`: clamped to the range and remembered through the injected `LayoutStorage`.
- `DockResizeHandle`: a separator on the dock's top edge with pointer capture (drag up grows), double-click closes, release below the
  minimum closes, and Arrow Up/Down (24px), Home and End resize from the keyboard. Esc and focus return reuse `useDockState`.
- `DockTabStrip` (`id, label, active, runningPip?, closeable?, pinnable?, pinned?`; `card` and `inline` variants; scroll controls on
  overflow; arrow keys move between tabs). The shell shows it in a bottom dock whose region has more than one tab.
- On a narrow screen a bottom-anchored dock is the existing bottom sheet (no handle).

## 0.6.0

- Panel preferences and the agent/user dismiss machine (SF-3 PR1): `createPanelPrefs({ storage, panels })`, a framework-agnostic
  observable store over an injected `LayoutStorage` (no zustand, no app stores). It holds order, enabled, default panel,
  dismissals and who opened each panel, and persists them under a `schemaVersion` (an invalid or older payload falls back to empty
  with a `panels` diagnostic; storage failures never break the store).
- Four states per panel (`closed`, `user_opened`, `agent_opened`, `user_dismissed`): an agent `open` is ignored while the user has
  dismissed the panel; a user `open` always wins and clears the dismissal. `clearDismissed` resets one or all (new conversational trigger).
- A plugin panel cannot take a built-in's id or another plugin's id (refused with a diagnostic); built-ins default enabled, plugins disabled.

## 0.5.0 — BREAKING (CW-20261102-0053)

- Binding-table consumer (SF-4): `loadBindingTable` validates a table from design-bindings' `generateBindingTable` (format,
  and its version against its content) and builds the design-bindings table; `createBindingStore` / `applyBindingTable` hold
  it in the design-app-runtime versioned store (same version is a no-op, a new one swaps in live; a table that fails to load
  leaves the current one and is reported). New dependency: `@hollis-labs/design-app-runtime`.
- BREAKING: `ManifestShell`'s `bindings` prop is now that store (was a `BindingTable`), and `createRendererSelector` takes the
  loaded bindings. The selector answers a miss for an unknown kind or version, and for an origin the profile does not permit;
  it never falls back to a renderer.
- Unresolved bindings are shell diagnostics (`unresolved-binding`, `malformed-binding-table`). `FrontendManifest.bindings`
  types the binding-table input the manifest carries.
- Fixture proof: a Hadron-shaped profile generates a table that resolves every kind in the SF-6 goldens.

## 0.4.0

- SF-6 gap components, composed from design-components and tokens only (kit-first lint at error): `SplitPane` (resizable with
  a keyboard-operable separator; at narrow widths the detail is its own page with a back link), `useSelection` /
  `SelectModeToggle` / `ListRow` (select mode), `BulkActionBar` (selection count, actions, at most one danger action, last),
  `ReviewBar` / `DiffView` / `ReviewChanges` (the "N changes, Discard, Review changes" bar; diff and Effect note, then Save;
  a field error blocks review), `OutlineNav` (`rail` and `strip`; scrolls and marks the section in view),
  `SettingsFieldRow` / `SettingsGroupCard`, `SecretRevealDialog` (shown once, Copy and Done only; Esc and outside clicks do
  not dismiss; the host drops the value on Done) and `MobileTabBar` (tabs plus a More bottom sheet of groups).
- The components are controlled and hold no data; pages submit through the action gateway. Nothing here logs, audits or stores
  a secret.
- Test fixtures follow the SF-6 golden frames (list/detail, edit, review, select) in place of the stand-in tables, and the
  Save-with-review and bulk-Remove-with-confirm flows run through them.

## 0.3.0

- Action gateway (SF-5b), the host policy point for the S0.3 action schema: `createActionGateway`, and the `actions` prop on
  `ManifestShell` with `useActionGateway()` for pages. It takes A2UI `callAgentFunction` requests and answers
  `agentFunctionResponse`-shaped values (`value` is the outcome; protocol failures use `error`).
- Closed outcome set (ok, accepted, needs_confirmation, refused, conflict, stale, canceled, expired, superseded, failed); an
  unknown or misshapen backend status becomes `failed` / `unknown-status`, never success. One terminal outcome per action id.
- Same id against a recorded outcome returns `conflict` with `recorded` and does not re-execute; a concurrent duplicate shares the
  in-flight run. Only the gateway's own step-up retry after `needs_confirmation` executes with a `confirmation`; a surface-supplied
  one is refused. A stale or refused id is spent: re-review mints a new id.
- Risk is the higher of the surface's declaration and the host `risk` policy (undeclared and no policy: high). High never
  executes before a grant: the confirmation overlay opens on top of the stack (depth 2), shows a frozen copy of the action, and
  Cancel, Esc, an edit (`cancel(id, cause)`), or ttl expiry end it as canceled / expired.
- Basis checks (`currentBasis`) return `stale` without executing, before the call and again after confirmation. Distinct visible
  messages for refused, conflict and failed; focus returns to the trigger after a terminal outcome.
- Catalog functions are navigate, openOverlay, closeOverlay, openRegion, closeRegion, toast, focus, setData; anything else is
  refused (`unsupported-action`). The shell provides all but openOverlay and setData, which the host supplies.
- Audit sink entries carry id, function, subject, risk, status, time and surface; never input, grants or results.

## 0.2.0

- Docked regions follow the SF-2 attributes: `openState`, `exclusive`, `sizes` (remembered through `dockStorage`), `dismissKey`
  and `mobile` (bottom sheet at narrow widths), supplied by the host as `dockAttributes` because the manifest's region
  catalog carries only `anchor`. New exports: `useDockState`, `resolveDockAttributes`, `DockAttributes`, `DOCK_SIZES`.
- Behaviour change: docked regions are no longer in the overlay stack (SF-2); Esc closes whichever overlay or dock opened last.
- Contributions are registered into a plugin-host-ui `PluginHostRuntime` by kind (`createShellPluginHost`); panels, dock tabs
  and widgets render through the host's components. Host refusals show in Diagnostics (`host-refused`); `onHostDiagnostic` prop.
- New diagnostic code `invalid-dock-attributes`; dock attributes for a region that is not docked report `unknown-region`.

## 0.1.0

- Initial: `ManifestShell`, `parseFrontendManifest`, `buildShellModel`, `useOverlayStack`, `createRendererSelector`.
