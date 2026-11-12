# Changelog

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
