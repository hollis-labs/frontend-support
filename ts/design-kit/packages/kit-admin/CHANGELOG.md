# Changelog

- Align configuration typography with compact dashboard roles; keep scalable
  profiles and root-relative control/layout sizing. Remove directory type
  overrides; restore configuration avatar dimensions through named theme roles.

## Unreleased

- Add controlled record directories, theme-colored identity avatars, activity
  rows, inspectors, facts, timelines and sparklines. Hosts own observations,
  calculations, selection and commands.
- Add configuration sections, definition pairs, badges, action buttons, tabs,
  fields and native form controls for Builder-style workspaces. Reuse base
  dialog/button/input/tab behavior and dashboard typography/control tokens.
- Directory layouts support balanced, wide and compact navigation panes with
  bounded mobile lists. Existing defaults remain unchanged.

## 0.1.0 - 2026-10-03 - first release

- Render callback-free Settings as read-only text even for writable declarations,
  using a presentation copy without changing host data or backend capabilities.

- Controlled admin navigation/content/standalone composition per the
  [admin shell spec](../../docs/admin-shell-spec.md), over existing dashboard
  layouts, settings provenance/setup and observation components. Host-owned
  data, routes and commands remain controlled inputs.
- Require design-components, design-tokens and kit-dashboard `^0.4.0`,
  kit-settings `^0.2.0` and kit-observe `^0.1.1`.
- Keep Dashboard a declaration directory and enforce canonical resource sections,
  unavailable discovery/group states and host-owned context.
- Include opt-in `/charts` delegation, fixture demos and behavioral/browser evidence.
- Use optional settings text presentation when the host supplies no settings
  callbacks, so read-only preferences render labelled values without disabled
  editor affordances. Keep source, locks and apply state in canonical Settings.
