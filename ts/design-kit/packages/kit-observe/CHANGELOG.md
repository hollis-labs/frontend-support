# @hollis-labs/kit-observe

## 0.1.1 — 2026-10-02

Requires design-components and design-tokens `^0.4.0`; the optional dashboard
peer (charts only) is now `^0.4.0` to share the new core set.

- Fix StatCollection and demo headings to use the existing `text-control`
  size and semibold weight instead of the undefined `text-heading` utility.
  The browser check verifies the StatCollection heading computes to 13px / 600.
- Document controlled clock sampling, strict future-time warnings, timestamp
  provenance and keeping observation objects off DOM elements.

## 0.1.0 — 2026-10-02 — first release

First published release. Requires `@hollis-labs/design-components` and
`@hollis-labs/design-tokens` `^0.3.0`; Tailwind v4 is a required peer.
`@hollis-labs/kit-dashboard` `^0.3.0` is an OPTIONAL peer, needed only for the `/charts`
entry (`SampleSeriesView`); the root entry does not import it.

- Initial controlled ObservationStatus, HealthSummary, StatCollection and
  DiagnosticPanel, with SampleSeriesView behind `/charts` using the shared
  dashboard timestamp-sample surface. Host-owned data, time and transport.
- Manifest fixture demo and presentation/browser evidence; no app integration.
