# @hollis-labs/kit-observe

Five controlled, read-only compositions for the
approved [observation spec](../../docs/kit-observe-spec.md) and
[admin manifest contract](../../docs/admin-manifest-contract.md). This package
renders presentation inputs; hosts normalize and validate wire responses.

## Install

```sh
npm install @hollis-labs/kit-observe @hollis-labs/design-components @hollis-labs/design-tokens
```

`@hollis-labs/kit-dashboard` `^0.4.0` is an **optional peer**, needed only for the `/charts`
entry (`SampleSeriesView`, which uses the dashboard's `TimestampSampleChart`, first released in
kit-dashboard 0.3.0). The root entry never imports it, so a host that renders only status, stats and
diagnostics does not need kit-dashboard or its chart engine. If you use `/charts` without it
installed, the import fails at build time; install it.

## Exports

| Import | Components |
| --- | --- |
| `@hollis-labs/kit-observe` | `ObservationStatus`, `HealthSummary`, `StatCollection`, `DiagnosticPanel` and their presentation types |
| `@hollis-labs/kit-observe/charts` | `SampleSeriesView` and its props/point types |
| `@hollis-labs/kit-observe/source.css` | Tailwind v4 source registration |

The root has no chart import. SampleSeriesView delegates to
`TimestampSampleChart` from `@hollis-labs/kit-dashboard/charts`; there is no copied
chart, new engine, day bucketing or dashboard/base re-export.

## CSS and peers

React 19 and Tailwind v4 are required peers; base primitives also require Base UI
and lucide-react peers. Configure your app's Tailwind build. With the dashboard
appearance, import its theme and this package's source registration:

```css
@import "@hollis-labs/kit-dashboard/theme.css";
@import "@hollis-labs/kit-observe/source.css";
```

For a host using contract themes directly, register each owner whose components
it renders (the dashboard registration is needed for SampleSeriesView):

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";
@import "@hollis-labs/kit-observe/source.css";
@import "@hollis-labs/kit-dashboard/source.css";
```

## Resource-local observation state

Every resource gets its own `ObservationState`. Never reuse a sibling's success
or timestamp. `observedAt` is the **last successful response** timestamp, not the
last request start. Its presence indicates retained evidence. The host updates
`nowMs`; components own no timers, requests, polling, retention, subscriptions,
authentication or endpoint discovery. `staleAfterMs` comes from the declaration;
observe manifest polling/bounds rules in the host.

```tsx
import { HealthSummary, type ObservationState } from '@hollis-labs/kit-observe'

const observation: ObservationState = {
  phase: 'ready', // idle | loading | ready | error
  observedAt: '2026-10-02T00:00:00Z',
  nowMs: Date.parse('2026-10-02T00:00:30Z'),
  staleAfterMs: 45000,
}

<HealthSummary label="Process health" status="unknown" checks={[]}
  observation={observation} />
```

`ObservationStatus` wraps a named section around its children, with a concise
`role="status"` / polite announcement and an observed time/age outside the live
region, so age ticks do not announce repeatedly. Without retained
evidence, loading shows Skeleton and failure shows an unavailable EmptyState;
children are withheld, so pending values cannot turn into zero or healthy. During
a refresh, the same children and timestamp remain visible. Refresh failure adds
an alert and optional host `onRetry` action. Supply only sanitized plain-text
`error` messages. Staleness uses the controlled clock and successful timestamp;
invalid/future times are labelled unavailable rather than fresh. Hosts should
reject invalid clocks at the adapter too. `paused` labels retained evidence as
paused. `supported: false` explains the missing capability and suppresses values
and actions. It does not initiate a request.

Returned health (`healthy`, `degraded`, `unhealthy`, `unknown`) is separate from
availability and freshness. HealthSummary renders an aggregate Pill and ordered
check labels/statuses/messages. Unknown or unfamiliar runtime status stays
unknown; a 200/unhealthy response is evidence, while a first-fetch error has no
health result. No repair or workflow actions are provided.

## Clock

`nowMs` is the host's controlled clock. Sample it at render/read time, or
re-sample whenever new data arrives. Never use a cached tick that can predate
the `observedAt` you pass: `nowMs - Date.parse(observedAt)` must be non-negative.
A negative age shows the warning pill “Observation time unavailable” and
“Check observation clock”. This is intended for genuinely skewed clocks or
future-dated sources; the kit applies no skew tolerance.

A client-stamped receipt time and a host-stamped source time have different
provenance. Keep that provenance explicit in your adapter; do not infer which
you hold by comparing timestamp values. Pass the observation object only to
kit components, never forward it to a DOM element.

## Scalar stats

`StatCollection` takes `label` and `rows` of
`{ id, label, value, unit, kind, observation }`. Each row composes the existing
Metric inside its own ObservationStatus. Finite zero is `0`, null is “Missing
sample”, and pending rows have no numeric value. Non-finite runtime values are
labelled invalid defensively; hosts must validate finite numbers. Units remain
visible: `count`, `bytes`, `seconds`, `milliseconds`, `ratio`, `percent`. Ratio
and percent are different scales. Counters are explicitly **cumulative counters**,
never rates. No formatting changes, aggregation or inferred history occur here.

## Exact sample series

Import SampleSeriesView from `/charts`. Supply ascending unique UTC
`{ at, value: number | null }` points, `label`, `unit`, `kind`, `observation`,
`requested: { from, to, limit }`, `bounds: { maxPoints, maxWindowSeconds }`, and
`truncated`. The host validates range/point limits and supplies bounded data;
the kit does not silently filter, sort, resample or clamp it.

The wrapper only changes `at` to the shared chart's `t`. Null is a visible gap;
zero is real zero; counters retain their cumulative values/reset boundaries.
The shared owner supplies exact time-axis rendering and an accessible UTC table,
including missing rows, with animation disabled. Requested/received count and
resource bounds stay visible. Truncation adds an incomplete-window alert. A
successful empty response says “No samples in requested range”; a missing
manifest declaration is unsupported, never manufactured history from scalar
polling. Status retains old samples during refresh/failure with their original
observation time.

## Diagnostics

`DiagnosticPanel` takes `label`, inline `schema`, bounded structured JSON `data`,
`observation`, and a required host `validation` result:

- `{ state: 'valid' }` renders the existing JsonViewer in a named data region,
  with a labelled CopyButton and keyboard-operable inline-schema details.
- `{ state: 'invalid' | 'unsupported', messages: [...] }` visibly explains the
  problem and withholds the payload.

The kit is a read-only projection, not another schema/wire validator. The host
checks the declared diagnostic schema/profile, supported keywords, size/depth/
array bounds, credentials/sanitization, and that data is JSON before passing it.
No `writeOnly` data is permitted by the manifest diagnostic contract. This kit
never resolves remote schemas, executes HTML, creates forms or dispatches actions.
Nested objects/arrays and strings remain plain structured values; schemas are
inspectable as JSON even when unsupported. Copy includes only the supplied valid
bounded data. Validation explanations must also be sanitized text.

## Demo and verification

```sh
TMPDIR="$HOME/.cache/design-kit-tmp" GOTMPDIR="$HOME/.cache/design-kit-tmp" npm run build
npm run demo -w @hollis-labs/kit-observe -- --host 127.0.0.1 --port 5202
```

The demo reads the authored Nanite/Tachyon example manifest declarations. Values
are controlled **fixtures**, not live observations, backend adapters, retention
or endpoint promises. Switch apps and request states; inspect zero, missing,
pending, stale/error, unknown, truncated/empty series and invalid/unsupported
schemas. Tachyon's empty series declarations remain unsupported.

[Browser evidence](docs/browser-proof.md) covers desktop/narrow screenshots,
computed token styles, status/diagnostic semantics, copy, keyboard schema details,
resource-local failures and a false-healthy negative control. Feature tests cover
these presentation distinctions and unchanged field/value delegation to the
shared chart. Run the repository five-check gate, including design-rules, before
review.

This package half does not cover Tachyon or any other application integration,
backend transport/validation, persisted history, activity/log/distribution/trace
components or new observation tokens. Those need their own scoped tasks.
