# Changelog

## 0.1.1 — 2026-11-14

Metadata only: `repository` (with `directory: ts/plugin-outlets`), `homepage` and `bugs` point at hollis-labs/frontend-support; the published 0.1.0 pointed at a repository that no longer exists. `LICENSE` is in the package again. No code change.

## 0.1.0 — 2026-09-30

Initial extraction; not published, not tagged.

- `.`: `readOutletMeta`, `sortByOutletPriority` (ascending `meta.priority`, ties in declared order, missing or invalid last), `outletProps`.
- `./react`: `PluginOutlet` (multi-occupant, ordered, `limit`, `fallback`, `loading`), `PluginSlot` (single-occupant, fallback told the owning plugin), `defineOutletKind`.
- Built against a structural `OutletRegistry`, not `@hollis-labs/plugin-registry`'s types, because that package is not on npm. A tarball-gated test checks the real `PluginRegistry` is assignable and agrees with the fake registry; it reports SKIPPED without `REGISTRY_TARBALL`.
- No error boundary by design; containment stays in the registry's `adopt`.
- Flux/Nanite's slot system was read for the pattern only; no equivalence is claimed.
- Source maps and declaration maps are not emitted: they would point at `../src`, which the tarball does not ship.
