# Nanite and Flux card reconciliation

CW-20261001-0501, primary-source inventory on 2026-10-01. Nanite's `ui/` was
read-only at `227852e5e92090cbf7f05cc4b5eebb6dbff84104`; Flux's separate GUI
tree was read-only at `232064c3a5eaa8e8d9e270d89d78df3ca81df231`. The inventoried
card and rail paths were clean. These trees can diverge; changing one does not
change the other. Paths below are relative to their respective `ui/src` and `src`.

The existing kit-chat card implementations were read before this reconciliation.
Their chassis, eight primitive shapes, responder and open recorded-status reader
already perform most of the extraction. This change adds three missing
compositions on that chassis, not a parallel Nanite card family.

## Inventory and ownership

| Source surface | Reuse or extraction | What remains with the host |
| --- | --- | --- |
| `chat/envelopes/primitives/Envelope` and header/body/footer/section | Existing `Envelope` pieces | Wire kind, payload binding, routing |
| `InfoCard` | Existing `InfoCard`; `variant` maps to contract `tone` | Domain labels and body rendering |
| `MetricCard` | Existing `MetricCard` | Metric meaning and formatting |
| `ProgressCard` | Existing `ProgressCard` | Work state and update source |
| `TimelineCard` | Existing `TimelineCard` | Timestamp formatting and domain status mapping |
| `DiffCard` | Existing `DiffCard` | Parsing domain formats into before/after content |
| `ListCard` | Existing controlled `ListCard` | Todo/plan queries, toggle mutations and persistence; no `data_source.kind` switch moves into the kit |
| `ConfirmationCard` | Existing `ConfirmationCard` | Plan approval queries/mutations, backend decision translation |
| `TableCard` | Existing generic `TableCard` | Row-action vocabulary and transport; host action buttons can use `columns[].render`, rather than a second wire-aware table renderer |
| `StatusPill` | Existing base `Pill` for feedback status; existing badge/header accent for identity | Mapping identity values such as primary/brand; no duplicate tone union |
| `DevBadge` / `DevModeEnvelopeWrapper` | Existing `Pill` in a header/meta slot | Developer-mode visibility; no unconditional floating badge over unrelated card content |
| `ArtifactMiniCard` | New compact `ArtifactCard` on Envelope | Download URL, byte/MIME formatting, clearing/collapsing a drawer |
| `DocumentViewerCard` | New bounded `DocumentCard` on Envelope | HTML trust, Markdown rendering, object URLs, download/open action, section targets |
| String `ElicitationPromptCard` | New controlled `PromptCard` using existing `CardResponder` | Question ID, saved draft/answer, timeout, tool origin and wire adapter |
| Boolean elicitation and `ApprovalCard` | Existing `ConfirmationCard` plus Envelope slots | Approval levels, subagent permission fields, advanced editor and API calls |
| `ProposalCard` | Existing Envelope and host form controls; ConfirmationCard for simple decisions | Payload editing, applied/dismissed domain state and transport |
| `ReportCard` | Existing Envelope, base Metric/ProgressBar, host action/link slots | Report metric palette mapping, session URL and action dispatch; raw violet utility is not copied |
| `ErrorCard` | Existing InfoCard/Envelope with host details/actions | Error-code mapping, clipboard/details modal and optional GIF fetching; no third-party network request moves into the kit |
| `ChatLoopTerminatedCard` | Existing InfoCard/Envelope, Section and host buttons | Loop failure vocabulary, counters and retry/continue chat messages |
| `PluginLoadErrorCard` / renderer misses | Existing `CardMiss` for binding failures, Envelope with host retry for load failures | Plugin registry and retry lifecycle |
| `work/PlanCard`, `workflows/WorkflowRunCard`, `memory/MemoryCard`, observability `StatCard` | Existing chassis/base display primitives in host compositions | App-specific plans, runs, memories and observability queries |

Both source trees contain the same named primitive and specialized surfaces
above. No generator output, envelope schema or app imports were copied. The kit
continues to ship shapes, with no default wire binding rows.

## New compositions

### Compact artifact

```tsx
<ArtifactCard name={artifact.name} meta={`${artifact.mime} · ${formattedSize}`}
  download={{ href: downloadUrl, filename: artifact.name, onClick: afterDownloadClick }}
  onDismiss={dismissArtifact} />
```

The download remains a native anchor with a host-supplied URL. Dismiss invokes a
callback; it clears no store and closes no drawer. This preserves the compact
reference layout while using the existing Envelope surface, named type steps
and control radius. Download links may be omitted for display-only artifacts.

### Bounded document

```tsx
<DocumentCard title={title} meta={formatLabel}
  actions={<DocumentActions onDownload={download} onOpen={open} />}
  navigation={<SectionLinks onSelect={scrollToSection} />}>
  <RenderedDocument />
</DocumentCard>
```

The pane uses `max-h-96` and local scrolling instead of the reference's fixed
500px limit. Section navigation is a slot; it does not search global
`doc-section-*` IDs that collide across documents. Content is a rendered node,
so the base kit acquires no Markdown dependency or raw-HTML interpretation.
Blob creation, cleanup and downloads remain host actions.

### Text prompt

```tsx
<PromptCard questionId={questionId} title={message} description={description}
  value={draftOrSavedAnswer} onValueChange={setDraft}
  priorStatus={recordedStatus} onRespond={adaptOutcome} />
```

Submit emits the existing outcome channel:
`{ status: 'submitted', answers: [{ questionId, value: trimmedText }] }`.
Decline emits `{ status: 'canceled' }`. The host adapter translates these into
its elicitation protocol (`accept`/`decline`, elicitation ID and content), rather
than the kit constructing a wire response. Boolean prompts use existing
ConfirmationCard actions; a second confirmation shape would duplicate the kit.

The host owns the draft and supplies recorded status after persistence. A
fulfilled callback does not invent a terminal state. The component locks while
awaiting a returned promise, shows rejection as a retryable alert without losing
the draft, and reads recorded statuses through `classifyPriorResponse`.
Terminal answers display the saved value; pending/unknown states remain locked.
Enter does not submit during IME composition. Timeout behavior is host-owned.

## Sidebar boundary and token decisions

The base extraction is separate [PR 25](https://github.com/hollis-labs/design-kit/pull/25):
`OverlaySidebar` composes the existing Sheet with pinned header/footer and a
scrolling body. Current `chat/LeftRail` and `RightRailV2` in **both** source trees
are inline width-collapse rails, not overlays. Their layout informs the
composition, but overlay modality comes from Sheet. AppShell's nav slot remains
the persistent-rail path. Session hierarchy, plugin slots, widget registries,
keyboard shortcut stores and breakpoint policy stay in each app.

No new idiom tokens are needed. Reference typography values map to the contract
steps (`text-control`, `text-caption`, `text-label`); radius maps to
`rounded-panel`/`rounded-control`. Existing Envelope accent mapping supplies
contract colors. No inset 3px shadow, ad hoc surface opacity, raw palette class
or hard-coded text size is copied. Layout and scroll limits use named scale
steps. Broader shape customization remains existing slots and `className`, so
this does not create parallel compact/full variants of every primitive card.

## Verification and limits

Six new tests exercise native download/dismiss callbacks, document actions,
trimmed prompt answers/IME, in-flight locking/rejection with retained draft,
recorded terminal/unknown status and decline. Existing card tests still run.
The five-check workspace gate and a packed browser consumer verify the final
candidate; browser receipts accompany this inventory.

All five checks passed after merging PR 25 and PR 26 into this branch:
typecheck, lint, test:run, build and the built-package design-rules gate, with
zero violations. The kit has 89 passing tests. The browser consumer used the
packed kit candidate, packed base 0.1.1 and published design-tokens 0.1.0 with
Tailwind v4. At 1280px and 390px, native download/filename and host callbacks,
document navigation/actions/local scroll, prompt rejection/draft retention,
in-flight locking, trimmed persisted answers, unknown-status locking and
decline passed with no page errors. Prompt type computed to 13px, the document
pane to 384px, and document scroll width stayed within each viewport.
See `receipts/cards-browser.json` and the narrow consumer screenshot below.

![Extracted cards in a narrow consumer](screenshots/nanite-cards-390.png)

Neither Nanite nor Flux is migrated by this change. Live API turns, plugin
registration, approval policy, windowed history (0017), schema/code generation,
publishing and the apps' own token-debt cleanup remain separate work.
