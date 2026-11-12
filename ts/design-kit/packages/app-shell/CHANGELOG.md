# Changelog

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
