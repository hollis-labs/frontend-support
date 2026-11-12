# Changelog

All notable changes to `@hollis-labs/sysop-ui` are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-1.0: minor bumps for additive surface, patch bumps for fixes — breaking changes can land in any minor. Backfilled from the git tags and log; good-faith, not exhaustive. The `v0.3.0` tag was never cut.

## [Unreleased]

### Changed

- Project AGENTS.md added and later genericized for outside readers; `CLAUDE.md`
  removed.

### Deprecated

- The package is deprecated and scheduled for removal once GUI vNext is ready (no
  date). DEPRECATED banners now sit at the top of `README.md`, `SYSOP_V2_ROADMAP.md`
  and `AGENTS.md`, and the new `docs/DEPRECATION.md` records the status, the
  replacement (`@hollis-labs/kit-dashboard`), the removal plan and the nine
  remaining consumers. Documentation only: no code, version or publish change.

## [0.9.0] - 2026-05-25

### Added

- A reusable transfer list component.

## [0.8.0] - 2026-05-25

### Added

- `createRouter`, and panel primitives promoted into the public surface.

### Fixed

- The demo gallery.

## [0.7.2] - 2026-05-24

### Changed

- Release/publishing preparation for public npm.

## [0.7.1] - 2026-05-24

### Added

- Observability and settings defaults absorbed from a downstream app.

## [0.7.0] - 2026-05-24

### Changed

- **Breaking:** the public surface is split into `ui` and `api` entrypoints.

## [0.6.5] - 2026-05-24

### Added

- Settings panel primitives and a demo of them; standardized dialog sizing.

## [0.6.4] - 2026-05-18

### Changed

- Scrollbars are hidden app-wide.

## [0.6.3] - 2026-05-18

### Added

- `Checkbox`, `useArrowNav`, `useSSE`, and toast helpers.

## [0.6.2] - 2026-05-18

### Added

- `FilterEntityCombobox` `onCreate` and state controls.

## [0.6.1] - 2026-05-18

### Fixed

- Source uses relative imports so the published package resolves.

## [0.6.0] - 2026-05-18

### Added

- Live/cursor primitives and a generic widget and chart layer.

## [0.5.0] - 2026-05-18

### Added

- Select, sheet and alert-dialog primitives; `useCopy` and `CopyButton`.

## [0.4.0] - 2026-05-17

### Added

- Layout primitives, `OperationsTablePage`, and a component gallery.

## [0.2.0] - 2026-05-17

### Changed

- The document shell is locked in `theme.css`.

## [0.1.0] - 2026-05-15

### Added

- Initial release: the System Operations React kit, licensed under MIT.

