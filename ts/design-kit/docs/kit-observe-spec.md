# kit-observe: inventory and component proposal

**Decision checkpoint: CW-20261001-0509, 2026-10-01.** Documentation only.
This proposes a component set for review, without creating a package, adding an
export, changing an app, or approving implementation. The PR stays open for
Chrispian's checkpoint.

Observation means read-only evidence about a system. Application commands,
restart/kill controls, configuration editors, storage, aggregation and wire
normalization remain outside this kit. The proposed
[admin manifest contract (PR #14)](https://github.com/hollis-labs/design-kit/blob/0ddba2ac86ef82bb74fe9d2e51936dbfb977c834/docs/admin-manifest-contract.md)
is an **unmerged proposal**, pinned here so its observation semantics can be
reviewed alongside this spec. It is not an existing endpoint contract.

## 1. Inventory: authored source before descriptions

Read on 2026-10-01. These are code inventories, not live deployment or browser
verification claims. Tachyon was read only in an isolated detached worktree at
`86d7ccb`; its live checkout was not read or changed. Other application files
were read without edits. References identify the checkout's HEAD at inspection.

| Source | Location and what it shows | Pattern to retain / boundary |
| --- | --- | --- |
| [Tether `9ef5a50`](https://github.com/hollis-labs/tether/tree/9ef5a50) | `apps/sysop/frontend/src/pages/overview.tsx`: activity signal, sessions/tool calls/messages/events KPIs and trends; tool latency mix, scope/provider/model counts, health/intelligence panels. Uses `Panel`, `KpiGrid`, `SignalBars`, `MiniTrend`, `BarList`, `CompositionBars` from frozen sysop-ui. Loads overview once with manual refresh and keeps data on refresh error. | Best composition input: a prominent signal followed by compact breakdowns. Preserve domain grouping, expose its sample/window meaning and freshness. Do not mistake the default `?? 0` render paths for a safe missing-data convention. |
| Tether | `pages/activity.tsx`: Events / Tool Calls / Scopes tabs, totals, sortable tables, scope-derived summaries, timestamps, session IDs and inspectable/copied JSON payloads. `pages/logs.tsx`: manually refreshed daemon tail, 50/100/200/500 choices, clamp notice, plain wrapped lines, auto-scroll to bottom. | Bounded rows, drill-down and copy are reusable. Scope aggregation is app logic. Unconditional auto-scroll must become explicit Follow behavior so inspection is not interrupted. This is daemon text, not a structured distributed log service. |
| [Torque `252bd52`](https://github.com/hollis-labs/torque/tree/252bd52) | `apps/gui/src/pages/DashboardPage.tsx`: Activity / Mission Control / Usage tabs; 16-week heatmap, live 24-hour pulse, recent runs, run status distribution, pipeline, 14-day run/cost/token charts. Samples up to 500 tasks and runs, buffers up to 500 SSE events, patches/refetches on selected events, refreshes stale samples on tab changes after five minutes. | Retain bounded samples and live-connection indication. An event buffer is not retained full history. A background refresh failure currently leaves old data in place: the observation view should label that data's age and failure. |
| Torque | `pages/BoardPage.tsx`, `pages/RunsPage.tsx`, `components/domain/activity-timeline.tsx`: filtered operational rows; a task timeline merging runs, comments, artifacts and active-run activity. Widget wrappers classify app run states and feed generic charts. | Reuse dashboard table/filter/navigation primitives. The timeline is chronology with domain renderers, not a parent/child trace waterfall. Task actions stay in Torque. |
| [Nanite `09904ef`](https://github.com/hollis-labs/nanite/tree/09904ef) | `ui/src/components/settings/observability/ObservabilityDashboard.tsx`: KPIs, execution-duration line chart, provider donut, process health, worker status, utility comparisons, utility-call log and recent executions. `hooks/useObservability.ts` polls executions at 30s, summary at 60s, health at 15s and workers at 5s; utility log has stale time without an explicit interval. | Useful duration/distribution/comparison inputs, currently mixed into Settings with kill/cancel mutations. Observation extraction keeps those actions outside the kit. The dashboard's array defaults can make missing/error data resemble no data. Chart.js palettes/scale literals are references, not token-compliant implementations to copy. |
| [Tachyon `86d7ccb`](https://github.com/hollis-labs/tachyon/tree/86d7ccb) — **TARGET UI** | `plugins/observe-ops/{adapter,polling_adapter,local_adapter,subscription}.go` and `capabilities.json`: activity/events, structured logs, metric points, dependency status, session snapshots and bounded snapshot polling descriptors. Nav declares `/observe`, `/observe/logs`, `/observe/metrics`. `frontend/src/pages/registry.ts` has no components for those routes; CW-20261001-0492 remains todo. | Do not inventory these as rendered views. Workload counts can be unknown; dependency reachability is distinct from workload health. Snapshot descriptors explicitly lack cursors/durable replay, and events subscription is unsupported. No promised OTel collector, provider-wide log history or live stream. |
| [Cerberus `0c1ac2d`](https://github.com/hollis-labs/cerberus/tree/0c1ac2d) | `web/src/pages/overview.tsx`: inventory/runtime/registry totals, paired runtime/interaction bars, mini trends, state compositions, top-name lists and intelligence rows. Overview/system polling at 5s, loading notice and retryable error state. | Confirms Tether's panel family is already shared through sysop-ui. Resource state and connector capability labels belong to the app; dependency reachability is not a replacement for service health. Explorer tables/drill-down support observation navigation without a new table primitive. |
| [Tesseract `1f37bba`](https://github.com/hollis-labs/tesseract/tree/1f37bba) | `frontend/src/pages/DashboardPage.tsx`: health, consistency issues, counts, metrics and recent audit events with separate 10–20s polling; recognizes unavailable metrics. `pages/AuditPage.tsx`: event-type/namespace/actor/time filters, UTC day grouping, expandable JSON and cursor-based older pages. | Good evidence for explicit unavailable state, stable filtering, group-by-day and bounded detail. Audit event names, routes and review-count derivation remain application-owned. |
| [Station Atlas reference `a27a465`](https://github.com/hollis-labs/station/tree/a27a465) | `internal/atlas/corpus/corpus.go`, `internal/atlas/tools/tools.go`: bounded read-only corpus, short-lived cache and an explicit “register as of” timestamp/reason when refresh fails. No Atlas viewer frontend was found in this Station checkout. The recalled `project/atlas/memory/decisions:atlas_capabilities_docs_tab` identifies the viewer as a separate `atlas-tools/initiatives-view` repository, absent from the inspected filesystem. | Retain the truthful cached-as-of pattern. Atlas Register is a real named input, but the remembered grouped-index/docs-tab design is not current inspected source; no visual claims are derived from it here. |
| Audit Board experiment | No source artifact found in scoped recall or repository/workspace search; orchestrator confirmed it is unavailable. | Unavailable reference, not evidence. No design choice below claims to copy it. |

### What already lives in design-kit

At design-kit `73110dc`, read the barrels and implementations, not only README
inventories:

| Existing owner | Surface | Disposition |
| --- | --- | --- |
| design-components | `Metric`, `ProgressBar`, `LiveDot`, `Pill`, `Callout`, `EmptyState`, `Skeleton`, `JsonViewer`, base controls and dialogs | Reuse. Do not create ObserveMetric, ObserveProgress or a second JSON renderer. Health may compose Pill/LiveDot with a dedicated vocabulary; it must not impersonate a workflow status. |
| kit-dashboard `/ui`, `/layout`, `/data` | `SummaryCards`, header/navigation, `ListPageLayout`, `OperationsTablePage`, `DataTable`, FilterBar family and error/list navigation hooks | Reuse for page/table composition. Observe adds evidence semantics, not another layout system or filter widget family. |
| kit-dashboard `/widgets` | `Panel`, `Kpi`, `KpiGrid`, `MiniTrend`, `SignalBars`, `Sparkbars`, `BarList`, `CompositionBars`, `DonutChart`, `BarMeter`, `ActivityHeatmap`, `HourlyPulse`, `RecentList` | Reuse when inputs match. RecentList supplies list chrome, not event ordering, polling or provenance. Aggregated bars/heatmaps require a declared bucket/window; they cannot represent arbitrary samples or null gaps faithfully. |
| kit-dashboard `/charts` | `TimeSeriesChart`: accessor-driven stacked bar/area rendering, sums items into trailing calendar-day buckets initialized to zero | Keep its existing event-aggregation semantics and shared chart ownership. Do not feed manifest gauge/counter samples into it unchanged: summing gauges or replacing missing days with zero fabricates observations. |
| design-app-runtime | API client/context, `usePoll`, `useSSE`, refresh helpers, relative-time/duration formatters | Transport remains here or in the host controller. The kit accepts data/state/callbacks; rendering never initiates requests or owns retention. Existing polling hooks alone do not prove manifest visibility/staleness rules are satisfied. |

## 2. Gaps and proposed response

| Concern | Present evidence | Missing uniform behavior / proposed response |
| --- | --- | --- |
| Scalar stats and health | KPI/summary primitives everywhere, Nanite health panels | Explicit observation age, absent sample versus zero, read failure versus unhealthy result. Compose existing Metric/SummaryCards with HealthSummary and ObservationStatus. |
| Time series | Torque day aggregates, Tether positional trends, Nanite execution durations | Timestamped gauge/counter samples, null gaps, bounded requested range and truncation. Propose SampleSeriesView, as an observation wrapper over an explicit future timestamp-sample surface in dashboard `/charts`, preserving the old day aggregator. No second chart engine or copied aggregator. |
| Distributions | Existing donuts, composition bars and ranked lists | Visible denominator, population/window, partial sample and accessible table. Compose those primitives in a DistributionView; no new donut renderer. |
| Activity | Tether tables, Tesseract audit pages, Torque timeline, Tachyon DTOs | Shared row/chronology semantics, stable keys and as-of/capture/source metadata. Propose ActivityFeed as a bounded composition; app adapters own event kinds and transport. |
| Logs | Tether daemon text; Nanite execution table; Tachyon structured DTO | Structured row/detail shape, levels/source/time/search controls, bounded text, explicit Follow and incomplete range. Propose LogViewer for host-provided snapshots, outside manifest v1's free-text stream boundary. |
| Timeline/trace | Torque chronology only | No inspected cross-app span/tree transport or timing guarantee. Activity chronology can group by day; true TraceTimeline is deferred until a consumer supplies span IDs, parents, start/end, clock/ordering and bounds. |
| Comparisons | Nanite utility duration/cost summaries, Tether top-name groups | Same unit/window/population, missing baseline and counter reset handling. ComparisonPanel composes a table/BarList with explicit comparability, not inferred deltas. |
| Empty/loading/error | Every app has some local treatment | Common loading, refresh, empty, missing, stale, unavailable and unsupported meanings. ObservationStatus coordinates state around existing skeleton/callout/empty primitives. |

## 3. Component set: presentation inputs, not new wire types

The names below are proposals, not exports. View-model fields belong to the
presentation adapter; they do not extend PR #14's JSON contract. Backend wire
schema/types remain with their designated owner. Host renderers normalize legacy
responses once rather than teaching every component each application's DTOs.

| Proposed component | Minimum presentation inputs | Behavior and reuse |
| --- | --- | --- |
| `ObservationStatus` | label, request phase, optional last successful `observedAt`, `staleAfterMs`, sanitized error/retry callback, supported flag | Common evidence header/state slot. Initial load uses Skeleton; refresh retains successful data with age; first failure uses error EmptyState; refresh failure shows Callout plus old observation. State details below. |
| `HealthSummary` | aggregate `healthy/degraded/unhealthy/unknown`, ordered checks `{id,label,status,message?}`, observation metadata | Read-only text plus icon/Pill/LiveDot; details in existing list/table/DetailSection. Never map unknown to healthy, or confuse “fetch unavailable” with a returned unhealthy check. No repair button. |
| `StatCollection` | scalar rows `{id,label,value:number|null,unit,kind}`, observation metadata per resource | Compose Metric or SummaryCards according to density. Zero displays zero, null displays missing, pending never formats zero. Unit and gauge/cumulative-counter meaning remain visible. No duplicate typography/stat primitive. |
| `SampleSeriesView` | ordered unique UTC `{at,value:number|null}` points, declared unit/kind, requested from/to, observedAt, truncated, resource bounds | Observation wrapper delegates exact time-axis/gap-preserving rendering to a future shared dashboard sample-chart surface, with accessible table and range summary. No automatic day sums, interpolation across nulls, invented historical zeros or extrapolation. Counter display remains cumulative unless an explicit future adapter supplies a correctly labelled reset-aware rate. |
| `DiagnosticPanel` | label, inline schema, bounded structured data, observation state | Reuse JsonViewer, details and copy controls; render nested objects/arrays as plain structured values. Show validation/unsupported-schema problems visibly. No remote schema fetches, HTML execution, forms or action dispatch. |
| `ActivityFeed` | pre-normalized stable ID/time/source/kind/summary rows, optional safe detail, order and bounded page metadata, selection/loading callbacks | Compose RecentList for small feeds or DataTable for dense histories. Explicit chronological order, optional day grouping and copyable IDs. Show captured event versus sampled snapshot and partial window. Live arrivals do not steal focus. |
| `LogViewer` | bounded host snapshot rows `{id,at?,level?,source?,message,fields?}`, selected filters, truncation/availability and follow state, filter/refresh callbacks | DataTable/FilterBar plus a mono message/detail pane. Text-only fallback for daemon lines with snapshot-local keys; fields use JsonViewer. New data scrolls only while Follow is enabled and the user remains at the end; pausing exposes pending rows. |
| `DistributionView` / `ComparisonPanel` | bounded pre-aggregated rows, unit, window, population/denominator and completeness; comparisons explicitly name baseline/current windows | Compose BarList/CompositionBars/DonutChart or DataTable. No client-side query language, percentile calculation, normalization of unrelated units or unseen-population claim. Difference is unavailable when either observation is missing/incomparable. |

Do not export the existing dashboard or base components again through kit-observe.
Keep heavy chart rendering behind an explicit future `/charts` entrypoint that
depends on dashboard's chart surface, with
status/diagnostic/list surfaces independent of it. Prefer a small initial set:
ObservationStatus, HealthSummary, StatCollection, SampleSeriesView and
DiagnosticPanel satisfy the entire proposed manifest observation surface.
Activity/log/distribution/comparison compositions follow real application
adapters; trace work needs a separate data/retention decision.

## 4. Render the proposed admin observation contract

This matrix is the required seam to PR #14 section 4. It renders every declared
resource type without introducing a streaming API or extra contract fields.

| Manifest resource | Declared shape → rendering | Required distinctions |
| --- | --- | --- |
| `health` → Status | `{observed_at,status,checks}` → HealthSummary inside ObservationStatus | HTTP 200 with unhealthy status is a valid unhealthy observation. Timeout/503 is unavailable evidence. `unknown` is a returned health value, not loading. |
| `stats` → Status | `{observed_at,value}` plus declaration unit/kind → StatCollection | Finite zero is real zero; null is known missing sample. Units: count/bytes/seconds/milliseconds/ratio/percent. Ratio 0–1 and percent 0–100 are different scales. Cumulative counters are not labelled rates. |
| `series` → Diagnostics | `{observed_at,points,truncated}` plus unit/kind/max_points/max_window_seconds → SampleSeriesView | UTC points sorted by unique timestamps; null keeps a visible gap. Requests constrain from/to/limit to declaration bounds. 400 invalid range and 422 oversized request stay errors. Truncation is displayed; no fabricated complete window. |
| `diagnostics` → Diagnostics | `{observed_at,data}` plus inline diagnostic schema → DiagnosticPanel | Bounded nested structured values are allowed. Unsupported structure/schema produces an explanation rather than unchecked executable content. V1 does not promise text-log streaming or trace/subscription resources. |

Empty declaration arrays mean unsupported resources: omit those sections or
explain that they are unavailable for this app. An empty returned series is a
successful “no samples in requested range”; an omitted series declaration is no
history capability. Polling scalar stats must not manufacture a history promise.

A future admin host discovers the authenticated manifest, checks version and
same-origin endpoint paths, then supplies observations to the kit. V1 declares
GET observations and private/no-store responses. Tachyon's existing same-origin
read verbs use POST; the future backend adapter must normalize them to the
proposed contract. kit-observe must not pretend these transports already match.

### Polling, freshness and failures

The host owns one bounded request schedule per visible resource, using declared
`poll_interval_ms >= 1000` and `stale_after_ms >= poll_interval_ms`. Stop scheduling
hidden resources, cancel on unmount/context changes, avoid overlapping requests
and ignore late responses from old filters/ranges. On visibility return, refresh
stale evidence. Keep polling transport separate from presentation and from event
subscriptions. A paused/frozen view is labelled; it is not “live”.

Freshness uses the last successful response's `observed_at`, not the most recent
request start or rerender. The host detects invalid/future timestamps rather than
silently treating bad clocks as fresh. Failed refreshes retain the old observed
value, timestamp and failure reason; they never update its age or fill zeros.

| State | Display |
| --- | --- |
| Initial request | Loading with no numeric value; no optimistic healthy status |
| Successful value/snapshot | Value plus observed time; zero remains zero |
| Successful null / empty window | Missing sample / no samples, respectively |
| Refresh in progress | Last successful observation stays visible; refreshing indicator |
| Age exceeds threshold | Stale badge, absolute timestamp/age and retained observation |
| Refresh failed | Error reason and retry; retained observation additionally keeps freshness label |
| First request failed | Unavailable error state; no empty successful chart |
| Unsupported declaration/contract | Explicit unsupported explanation; no request or invented values |
| Truncated snapshot | Incomplete/sample notice with requested versus available range/count where supplied |

A composite panel preserves each resource's own observed time/state. Health
cannot go green because a sibling stat loaded, and a single partial failure
cannot clear the entire board or manufacture zeros for unrelated resources.

## 5. Density, accessibility and token rules

Retain Tether's signal-first hierarchy and dashboard's compact header/filter/
summary/table rhythm. Wide layouts can place breakdowns beside a primary view;
narrow layouts stack panels and keep filter labels and observation age readable.
Use existing scrolling/page containers; avoid a second fixed application shell.

All styling names design tokens: contract surfaces/text/borders, semantic scale
steps and feedback roles. Use chart token families for categorical series, not
raw palettes from Nanite. Built-in chart colors are still placeholders, so a
multi-series palette requires design sign-off before claiming usable categorical
color distinctions. No new observe token family is approved by this document;
any justified idiom addition must use the existing registration process.

Health labels/icons and line styles/legends carry meaning independently of color.
Charts have a table alternative, keyboard-readable values, named axes, units and
window; tooltips are supplementary. Logs preserve selection, provide labelled
filters/copy controls, render plain text and expose truncation. Use existing
keyboard navigation hooks for table selection and previous/next error inspection;
shortcuts do not intercept editing controls. Updates announce concise summaries,
not every incoming row, and respect reduced-motion preferences.

## 6. Choices and proposed adoption sequence

1. Compose the existing dashboard/base surfaces; keep only observation-specific
   evidence semantics in the new kit. No package creation or re-export churn in
   this PR. A future relocation of generic chart primitives would be a separate
   compatibility decision, not a prerequisite silently imposed here.
2. Support manifest v1 health/stats/series/diagnostics first. Use a timestamped
   sample renderer for gauge/counter data because the current dashboard day
   aggregator has incompatible semantics. Add a separate timestamp-sample input
   surface to the shared dashboard chart owner in future implementation, without copying it into kit-observe or
   rewriting the established event-count behavior. That shared extension and
   its null-gap behavior need their own implementation review.
3. Keep host fetching/authentication/capability checks, bounded storage and legacy
   adapters outside components. Start with declared polling, never inferred
   subscriptions or durable replay. Observe remains read-only even where a
   reference screen has kill/cancel/restart controls.
4. Dogfood against Tachyon's real local telemetry/dependency/session snapshots
   when its UI task proceeds, and Nanite's process/utility views. Preserve
   dependency reachability versus workload health and explicit unknown counts.
   Extract chronology/log compositions only after those adapters prove the data.
5. Later implementation verification should use production consumers, controlled
   stale/failure/null/truncated fixtures, focus/scroll behavior and computed
   token styles at wide/narrow sizes. This document adds no enforcement check
   or test suite and claims no new browser proof.

## 7. Open questions for Chrispian's checkpoint

- Approve the initial five-component manifest set and defer activity/log/
  distribution/comparison wrappers until actual consumer adapters need them?
- Should charts continue to depend explicitly on kit-dashboard `/charts`, or
  should a later compatibility task extract a shared visualization layer? The
  proposal avoids a second Recharts/Chart.js abstraction and keeps heavy imports
  out of health/log consumers.
- Which app owns persisted series and retention first? Current snapshots/events
  are bounded evidence, and PR #14's sample series are proposed adapter support.
- Approve the distinction between cumulative counter rendering and future
  reset-aware rate series? No implicit client rate/percentile derivation is
  proposed; units and reset boundaries need a concrete backend owner.
- Is a designed categorical chart palette required before first adoption, or can
  initial single-series/table views ship while placeholder palettes are resolved?
- Which real trace consumer supplies span IDs, timing/clock semantics, parentage
  and bounds before a TraceTimeline is specified? Torque's event chronology
  alone cannot justify a trace contract.
- Confirm whether the first admin renderer needs any richer diagnostic schema
  projections than the bounded structured viewer; free-text log streaming stays
  outside manifest v1 unless its contract is separately approved.

Approval of this proposal is the blocking checkpoint before implementation.
Audit Board and the Atlas viewer's visual source remain unavailable inputs, not
acceptance blockers or guessed design evidence. No live app, service, listener,
package manifest or executable code changes accompany this spec.
