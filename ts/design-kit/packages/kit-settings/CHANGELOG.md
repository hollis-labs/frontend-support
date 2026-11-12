# Changelog

## 0.2.0 — 2026-10-02

- Add optional `readOnlyContext` to SettingsRenderer and SettingsProvenanceRenderer
  for labelled text output of nonwritable fields. Omitting it preserves the
  existing control presentation. Provenance and apply state stay visible.
  This additive feature takes a minor version on the 0.x line. Requires
  design-components and design-tokens `^0.4.0` to share the new core set.

## 0.1.0 — 2026-10-02 — first release

First published release. Requires `@hollis-labs/design-components` and
`@hollis-labs/design-tokens` `^0.3.0`; Tailwind v4 is a required peer.

- Controlled flat-schema settings groups, scalar/enum validation, effective read-only permissions, dirty/save/discard and explicit override removal.
- Blank secret replacements with presence-only snapshots and host-owned drafts, values and transport.
- Both approved example manifests in the demo; local behavior tests and browser verification.

- Opt-in provenance renderer: source kind/label (including presence-only secrets), restart declarations, snapshot apply state, and explicit host-owned apply/restart intent.
- Reconciled host apply projection, visible disagreements and missing-target explanations; failed apply cannot clear pending state in the kit (CW-20261001-0506).
- Controlled setup wizard: static required-first group/field ordering, dynamic completion, host-supplied connectivity/save results, resume via props and an ordered per-group final intent; no network/storage or app onboarding (CW-20261001-0507).
