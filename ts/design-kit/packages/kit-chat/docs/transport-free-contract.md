# kit-chat: the transport-free contract

Status: proposal (CW-20261014-0129), for Tangent, Nanite and Parallax.
kit-chat renders a conversation and reports what the person did. It never fetches,
sends, persists or subscribes. A host adapts its transport to this seam.

## Data in (props down)

| Concern | Prop | Notes |
|---|---|---|
| Transcript | `ChatStream items: ChatItem[]` | `message` / `marker` / `card`. Oldest first. Host-owned. |
| Reply in flight | `status: ChatStreamStatus` | `idle` / `streaming` / `stalled` / `error`. Stall is host-asserted (`useStallDetector`). |
| Row rendering | `renderItem` (optional) | Replaces the default row. |
| Message text | `ChatMessageItem.source` | The Markdown/plain text behind `content`. Enables Copy and Download. |
| Markdown | `@hollis-labs/kit-chat/markdown` `ChatMarkdown` | Optional subpath; host puts the result in `content`. |
| Cards | `ChatCardItem { wireKind, content }` | Host resolves the binding and draws the card. kit-chat places it. |
| History paging | `history { hasOlder, loading, onLoadOlder, error }` | Presentation only. |

## Events out (messages up)

| Event | Callback | Payload |
|---|---|---|
| Send | `ChatComposer onSubmit(text)` | Trimmed text. Return `false` or reject to keep the draft. |
| Draft edit | `ChatComposer onDraftChange(text)` | Optional, for hosts that persist drafts. |
| Stop | `ChatInput onStop()` | No lifecycle implied. |
| Card decision | card `onRespond(CardOutcome)` | `submitted` / `declined` outcome; the host builds and sends the wire response. |
| Message details | `messageActions.onDetails(item)` | Host opens its own dialog. |
| Load older | `history.onLoadOlder()` | |

Copy and Download are the only actions kit-chat performs itself (clipboard and a
Blob download); both are browser APIs, not transport.

## Rules for hosts

1. Keep unchanged `items` entries referentially stable; replace only the entry that changed.
   Build `content` once per item, not per render (Parallax's `ReviewSession` rebuilds all of
   it each render, which defeats row memoization).
2. Pass a stable `renderItem` and `messageActions` (or omit them).
3. Do not hold the draft in the page component. Use `ChatComposer`.
4. A card's resolved state is the card's (`priorStatus`); do not duplicate it on the item.
5. Wire identity belongs to go-envelopes. kit-chat reports outcomes; it defines no response type.

## Per-host mapping

- **Tangent**: `messages[]` to `ChatMessageItem` (`source` = the message Markdown); roster
  poll and turns events update `items` immutably; `sendChat` sits behind `onSubmit`.
- **Nanite**: stream chunks drive `status`; committed messages become items; envelope
  responder sits behind card `onRespond`.
- **Parallax**: fixtures to items (already so); memoize the items array and switch the
  page-level draft to `ChatComposer`.

## Open questions

- Markdown `content` plus `source` duplicates the text; a `renderSource` helper could derive one.
- Large threads (thousands of rows) still mount every row; virtualization is not provided.
  Memoization makes updates O(changed rows), but initial mount is O(n).
