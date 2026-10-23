# @hollis-labs/kit-chat

## Unreleased

- 0.6.0 (minor, owner publishes): the card set (Envelope chassis, Info/Metric/Progress/
  Timeline/Diff/Artifact/Document/Confirmation/Table/List/Prompt, CardMiss/CardBoundary)
  and the response seam (`CardOutcome`, `CardResponder`, `classifyPriorResponse`,
  `acceptsInput`) moved to `@hollis-labs/kit-cards`. kit-chat re-exports every one of
  those names, unchanged, so existing imports keep working; there is ONE Envelope
  chassis. Chat-only chrome stays here. `@hollis-labs/kit-cards/source.css` is imported
  by this package's `source.css`; import it directly in new code.
- `classifyPriorResponse` now classifies `expired` and `superseded` as terminal states
  (they were `unrecognized`, which also locked the card). Controls stay locked.

- CW-20261020-0041: Add `ResizableChatPanel` with pointer/keyboard resizing and
  viewport bounds, and `ForwardMessageDialog` with searchable recipient aliases,
  a source preview, note, fixed header/footer and retry-safe explicit submission.
- CW-20261020-0041: Give `ChatMarkdown` secondary body text and distinct token-based
  headings, emphasis, lists, quotes, links and code surfaces.

- `ChatStream` rows are memoized on item identity and `renderItem`; unchanged rows no
  longer re-render when a sibling changes or the parent re-renders. Keep unchanged
  `items` entries referentially stable and pass a stable `renderItem`.
- Add `messageActions` (Copy, Download Markdown, Details) to the default message
  renderer, driven by the new optional `ChatMessageItem.source` text.
- Regression tests: `ChatMarkdown` keeps its DOM (and so the reader's text selection)
  across re-renders, including when a host passes a fresh inline `components` map.
  streamdown 2.6.0 is not affected by the per-render components-map remount that hit
  Tangent's react-markdown wrapper (tangent#102).
- Add `ChatComposer`: `ChatInput` that owns its draft (memoized), so typing re-renders only
  the composer. `onSubmit` receives the trimmed text; returning `false`/rejecting keeps the draft.

## 0.5.0 — 2026-10-10

No chat implementation change since 0.4.0; align component/token dependencies and core version. Upgrade the six core packages together; ^0.4.0 excludes this minor.

## 0.4.0 — 2026-10-02

Co-released with the other core packages. Requires design-components and
design-tokens `^0.4.0`: the new Collapsible/HoverCard compositions are absent
from design-components 0.3.0, and `^0.3.0` cannot select the new minor.
The package license expression is now **`MIT AND Apache-2.0`**. The tarball
includes Hollis Labs' MIT notice, AI Elements attribution and full Apache-2.0 terms.

- Add AI Elements Message actions/branching with controlled selection, wraparound
  navigation and retained inactive drafts; Shimmer uses opt-in CSS animation,
  token colors, a static fallback and reduced-motion support. The new public
  `./keyframes.css` export is opt-in via `@hollis-labs/kit-chat/keyframes.css`.
- Add Reasoning, ChainOfThought, Sources and Plan on Base UI Collapsible; keep
  rendered content, citations, elapsed seconds and plan actions host-owned.
  ChainOfThought header/panel linkage and user collapse during streaming are preserved.
- Add Tool with host-mapped ToolState and JsonViewer/host-rendered content,
  including falsy outputs. Reconcile Confirmation content under ConfirmationCard's
  existing envelope/responder, locks, opaque host action IDs and host messages.
- Add Queue slots with bounded native scrolling, Base UI disclosure and
  always-visible host action buttons for keyboard/touch.
- Add host-controlled Attachments grid/inline/list, previews, metadata and removal;
  AttachmentDropzone/native picker reports files and rejections without owning
  uploads, stores or composer triggers.
- Add ModelSelector Dialog/Command compositions with host-owned catalog/filtering
  and ReactNode logo slots, without brand hotlinks or bundled marks.
- Add Suggestions/Suggestion actions, Context for host numeric usage/cost and
  guarded capacity, and Question with native radio/checkboxes, optional required
  text, controlled/uncontrolled drafts and a synchronous pending-submit guard.
- Add Image with host `src`, required `alt` and optional mediaType; InlineCitation
  compositions use a local pager and accessible HoverCard with keyboard focus handoffs.
- Add OpenIn with host-supplied HTTP(S) destinations and decorative icon slots;
  invalid destinations are disabled, and native activation uses noopener/noreferrer.
- Add expanded Artifact/header/title/description/close/actions/content beside
  ArtifactCard, with labelled non-submitting actions and a bounded host-content region.

These source ports retain pinned upstream provenance and host-owned data/actions.
No AI SDK, Markdown renderer, motion/embla library or transport dependency is added
to the main entry.

## 0.3.0 — 2026-10-02

Co-released with the other core packages, alongside the first releases of kit-settings and
kit-observe. Requires `@hollis-labs/design-components` and `@hollis-labs/design-tokens` `^0.3.0`.

- Internal refactor: use design-components' token-aware `cn()` throughout cards, composer,
  stream and markdown, retiring the local stopgap. Existing typography cases stay verbatim
  against the shared helper.
- **Visible change, through design-components 0.3.0:** the composer's Send and Stop buttons and
  the card action buttons (artifact, document, prompt, confirmation, list and table actions)
  render the 6px control radius instead of 8px. Nothing else in the package changes.

## 0.2.0 — 2026-10-01

Co-released with design-tokens, design-components, design-app-runtime, eslint-config-design
and kit-dashboard. Requires `@hollis-labs/design-components` and `@hollis-labs/design-tokens`
`^0.2.0`.

**Behaviour changes to know before upgrading**

- `ChatInput` now draws its own frame with a visible **Send** action and an optional
  host-owned **Stop** callback (`onStop`). A host that already supplies its own submit
  control should pass `showSubmitButton={false}`, or it will show two.
- The suggestion menu now shows its "no matches" state instead of closing silently.
- `tailwindcss: ^4.0.0` is now a **required** peer (CW-20260912-0097). npm 7+ installs it
  when it is missing, and an incompatible installed major fails peer resolution. The
  automatic install does not configure your CSS build; keep the explicit app dependency and
  the stylesheet imports described in the README.

**Typography fix (CW-20260913-0032).** Class names merge with the contract's named
typography tokens preserved beside text colours. Chromium verification of a registry
consumer found 0.1.0 message bubbles inheriting 16px because `text-control` was removed
beside `text-fg`; the packed candidate computes the 13px control token. The composer also
keeps its control size across the primitive's desktop breakpoint (previously 14px).

**Composer and transcript polish (CW-20261001-0502).** Protect IME composition and
Shift+Enter from submission or suggestion selection; keep textarea focus on pointer
selection; connect the suggestion ARIA references to cmdk's actual IDs; fix repeated
sent-message history recall. Bound the transcript width, preserve plain-string line breaks
and wrap long tokens. Add first-token and streaming feedback with reduced-motion loading
icons, plus initial loading and host-driven older-history loading/retry presentation.
Card envelopes stay within narrow transcript columns and wide tables scroll locally. The
"Jump to latest" control is hidden when the scroller marks it inactive; before, its inert
button still painted over short transcripts. See [ops-chat dogfood](docs/polish-dogfood.md).

**Windowed history (CW-20260930-0017).** New transport-free `useChatHistory` for bounded
latest/older windows, stable-ID dedupe, live upserts, single-flight loading, retry and
stale-request cancellation. Fixes prepend anchoring by moving the history controls outside
the message log; reader position and Jump-to-latest were verified in a packed
desktop/mobile consumer. See [adapter contract and browser proof](docs/message-history.md).

**New cards (CW-20261001-0501).** Reconciled Nanite/Flux card surfaces with the existing
eight primitive cards and added compact `ArtifactCard`, bounded `DocumentCard` and a
controlled text `PromptCard` on the existing Envelope. Host callbacks and slots keep
download, rendering, navigation, persistence and wire translation outside the kit. See
[inventory and usage](docs/nanite-card-reconciliation.md).

**Verification records.** The published-package source-registration negative control and the
ChatStream-only optional-peer check are in [consumer verification](docs/consumer-verification.md).

## 0.1.0 — 2026-09-12

First release, joining the six already-published packages in this repo at 0.1.0.
The release record for the set is the repo's
[`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

The chat kit contains `ChatInput`, `ChatStream`, and the interactive card set,
composing the idiom-free base components against the shared token contract.
The optional `/markdown` subpath adds Markdown rendering; consumers of the main
entrypoint do not need it.

**Start with the stylesheet imports in your app's Tailwind entrypoint:**

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";
@import "@hollis-labs/kit-chat/source.css";
```

The last line imports this package's `src/styles/source.css`, registering its
shipped class strings with Tailwind. Leaving it out produces unstyled components
and no error. Both component packages' source imports are needed. See the README
for the additional setup required by the optional `/markdown` subpath.

**This release deliberately claims zero `chat-*` idiom tokens.** It publishes no
`chat-mode-*` or `chat-composer-*` vocabulary; future names await a consumer's need.
The accompanying design gate change makes the existing undefined-token rule
validate `chat` and `dash` names even though those families declare no tokens.
An invented `chat-*` name is now a gate error rather than a silent no-op.

- Forwarding reuses FormDialog with an editable To/dropdown field and compact
  ruled layout. Markdown styles now survive Streamdown class merging and keep
  code proportional to body text with semantic color accents.
