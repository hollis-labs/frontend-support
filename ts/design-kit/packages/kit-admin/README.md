# @hollis-labs/kit-admin

**0.1.0** is the first release of controlled admin composition, implemented
from the approved [admin shell spec](../../docs/admin-shell-spec.md). The host
owns data, routes and commands.

`AdminNavigation` projects declared destinations through dashboard `NavRail`.
`AdminContent` supplies the inner page region for an existing host shell.
`AdminShell` combines those with the existing base `AppShell`, dashboard
`PageHeader` and `ListPageLayout`. Use one viewport shell and one page scroll
owner; embedded apps use `AdminContent` rather than nesting `AdminShell`.

| Page | Composition |
| --- | --- |
| Dashboard | App identity, declaration revision and links to canonical pages/groups; no config values or runtime KPIs. |
| Settings | One `SettingsProvenanceRenderer` for the host-selected group; source, locks, scope and pending application stay here. |
| Settings, `mode: 'setup'` | Existing `SettingsWizard` over the same groups/drafts, replacing the normal editor. Host controls step/checks/results; optional `setupContext` supplies provenance summaries beside it. Group links return to normal Settings. |
| Status | Existing `HealthSummary` and `StatCollection`; no configuration mutation controls. |
| Diagnostics | Existing `DiagnosticPanel`; an explicitly supplied series renderer receives existing `SampleSeriesViewProps`. |

## Controlled host inputs

```tsx
import { AdminShell } from '@hollis-labs/kit-admin'
import type { AdminContentProps } from '@hollis-labs/kit-admin'

// The application supplies validated projections and its own adapters.
export function AppAdmin({ state }: { state: AdminContentProps }) {
  return <AdminShell {...state} />
}
```

The host supplies `contextKey`, discovery phase/manifest, page/group/mode
selection, `destination(target)` returning either an `href` or `onSelect`,
per-group settings read states, optional settings callbacks, observation maps
and `nowMs`. `AdminManifest` is a minimal **presentation projection**, not a wire
registry or complete manifest validator. Transport fields/endpoints and wire
identity remain with the host and go-envelopes. `adminManifestProblem` fences
presentation identity, required arrays, contract version, resource placement
and observation age; supported settings schemas/provenance are checked by
kit-settings. The host validates all wire schemas, units, bounds, capabilities,
auth and diagnostic payloads before supplying these projections.

Keep all supplied data scoped to the current authorized `contextKey`; a discovery
context mismatch hides old content globally. Clear old snapshots/drafts and
cancel requests on auth/context changes. Host-owned routes/history, fetching,
retry/poll schedules, clocks, effective permissions, per-group revisions/ETags,
409/412 reconciliation and uncertain write outcomes never move into this kit.
Accept and clear only successful group drafts. Reset means host resolution,
not a browser-computed fallback. Secret replacements remain transient in host
memory; never persist/log them or infer their values from declarations.

No writes occur on mount. Callbacks receive existing controlled settings intents.
`onApply` is omitted by default; an authorized host may explicitly supply its own
workflow. Save/setup completion never implies restart, readiness or health. The
host preserves per-field pending state independently of this command's
`restart_required` metadata, including no-op outcomes.

Failed initial discovery is globally unavailable. Retained declarations during
refresh/error are labelled and disable editing and command callbacks. A failed
individual group read disables only that group; sibling destinations remain
available. Contradictory sections are rejected, never relocated. Missing arrays
are malformed; empty arrays omit optional nav items and explain unsupported deep
links. All-empty Dashboard says “No admin resources declared”. Missing observation
snapshots stay unavailable, never fabricated healthy or zero values.

## Direct directory and editor compositions

For application-owned records, use `AdminDirectory`, `AdminRecordButton`,
`AdminFacts` and `IdentityAvatar` without an admin manifest. Directory `layout`
can be `balanced` (default), `wide` or `compact`; `size="comfortable"` on a row
uses the larger named type steps. The host owns filtering, selection and data.

`AdminSection`, `AdminHeading`, `AdminFact`, `AdminBadge`, `AdminActionButton`,
`AdminTabs`, `AdminField`, `AdminInput`, `AdminSelect` and `AdminTextarea` compose
configuration workspaces. Tabs are controlled and use the base keyboard
behavior; disabled tabs remain discoverable by keyboard but cannot activate.
The host renders the selected content and retains draft lifetime. Buttons
default to `type="button"`; form submission must be explicit. Fields accept
host-computed validation messages, never calculate policy or send requests.

Activity surfaces use `ActivityGroup`, `ActivityRecord`, `ActivityMetric`,
`ActivityStatus`, `ActivityDialog`, `ActivityFacts`, `ActivitySection` and
`ActivityActionButton`. `ActivityTimeline` and `ActivityBars` accept normalized
observations and nullable samples; they do not invent history or run a clock.
The inspector delegates focus, dismissal and scrolling to the base dialog.

These compositions use the shared token contract and dashboard typography.
Import `@hollis-labs/kit-dashboard/theme.css` and `@hollis-labs/kit-admin/source.css`
in the consumer's stylesheet. Parallax exercises captured activity; Tachyon's
isolated Builder frontend exercises live reads and preserves host-owned commands.

## Optional charts and CSS

Root imports no chart library and re-exports no sibling components.
Opt in explicitly, or supply another renderer with the same existing props:

```tsx
import { renderAdminSeries } from '@hollis-labs/kit-admin/charts'
// <AdminShell {...state} renderSeries={renderAdminSeries} />
```

The adapter delegates to kit-observe `/charts`, which delegates to dashboard
`TimestampSampleChart`; it does not copy chart code or synthesize history.
Dashboard remains a dependency for navigation/layout even without series.
A host using Tailwind v4 imports the theme and each composition's class sources:

```css
@import '@hollis-labs/kit-dashboard/theme.css';
@import '@hollis-labs/kit-settings/source.css';
@import '@hollis-labs/kit-observe/source.css';
@import '@hollis-labs/kit-admin/source.css';
```

Set the host's theme and document shell reset as usual. Style evidence uses
`sysop-p4-white` and includes dashboard CSS. Internal ranges are components and
dashboard `^0.4.0`, settings `^0.2.0`, observe `^0.1.1`, tokens `^0.4.0`; React 19,
Tailwind 4, Base UI and lucide use the workspace's existing peers.

## Local fixture review

```bash
npm run build --workspace=@hollis-labs/kit-admin
npm run demo:build --workspace=@hollis-labs/kit-admin
npm run demo --workspace=@hollis-labs/kit-admin -- --host 127.0.0.1
```

Package-local `prebuild` builds dashboard/settings/observe prerequisites because
npm's root workspace order visits kit-admin first. No root build script changes.
The demo imports the built kit-admin entrypoints. Both approved manifest examples
render all four pages; `?app=nanite|tachyon|tether&page=...` chooses a fixture.
`mode=setup`, `failure=first|refresh|group` and `embedded=yes` exercise alternate
composition/failure modes. The separate `settings-only.html` entry imports root
only. Build emits a manual module inventory for reviewing chart isolation.
Fixture settings snapshots are explicit existing kit-settings fixtures, not
manifest-derived defaults. Command callbacks record intent only, without saved
outcomes, persistence, actual validation, secret logging or restart.

[Browser evidence and reproduction](docs/evidence.md) covers the approved
examples at 1280/390 and a Tether-style desired-config/runtime split. Unit tests
exercise fail-closed behavior, controlled callbacks, alternate setup, field
focus and canonical placement. Fixtures establish page/state mapping,
independently of the real-backend proof below. App-owned wire adapters, Folio
wiring and application adoption remain separate work.

## Proof and limits

Packed consumers have been exercised in Chromium against fixtures and against
one real Nanite backend in a **read-only configuration**: the page issues only
GET requests. The real-backend proof used an isolated scratch instance built
from production code, not a deployed production instance.

Not proven: writes through kit-admin against a real backend; production Tachyon rollout;
secret, wizard or conflict flows on a real backend; other browsers; or a shared
typed read client. Backend atomicity and two-app acceptance are not established
by the read-only Nanite proof.

## Configuration typography

Editor headings, facts, badges, tabs and field messages consume the compact
roles from kit-dashboard. AdminInput and AdminTextarea use the same dashboard
control type as native selects, including mobile breakpoints. Directory rows
use shared record title/metadata typography; their legacy `size` prop remains
accepted but no longer bypasses the typography profile. Font family and domain
layout remain separate choices. Use dashboard roles for host-supplied copy too:
core `text-*` utilities choose a different, root-relative scale.

IdentityAvatar configuration sizes (`small`, `definition`, `large`) follow shared
compact dimensions of 28/36/64px, with spacing-relative values in the scalable
profile. Activity `default` and `detail` sizes retain their existing scaling.
