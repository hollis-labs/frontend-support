# Paginated message history

CW-20260930-0017 adds `useChatHistory`, an opt-in headless adapter for the existing
`ChatStream` history/loading seam. Existing `items`-only consumers keep their API.
The host chooses transport, page size, authentication, wire mapping and rendering.
The kit owns local pagination state and presentation. No component calls fetch.

## Contract

`loadPage({ cursor, signal })` returns `{ items, olderCursor }`. Items have stable
string IDs and arrive oldest first. `cursor: null` requests the latest bounded
window. `olderCursor: null` means exhausted; string/number cursors are otherwise
opaque, including `0` and `''`. The next older cursor must advance; returning the
same cursor fails visibly and retains the last successful window for retry.

The latest window loads once on mount. Older pages load only on `loadOlder` or
the stream's action. The synchronous guard coalesces repeated clicks before React
renders loading feedback. Initial and older failures use the same retry action,
retain items/cursor, and do not silently retry when loader identity changes.

IDs deduplicate both within a page and across page boundaries. Older pages prepend;
already-loaded/live values win overlaps. `append(items)` appends unseen IDs and
updates existing IDs in place. In-flight history merges against the current list,
so live arrivals and edits survive. Within each input list the last value for an ID
wins while its first-seen position stays stable. No timestamps are parsed or sorted:
the host must supply correctly ordered windows and chronological new items.

Key the **containing host component** by conversation or selected window:

```tsx
<Conversation key={sessionId} sessionId={sessionId} />
```

Unmount aborts the host signal and invalidates outstanding results, including a
transport that ignores abort. StrictMode's setup/cleanup cycle also invalidates its
first request. The next mounted conversation starts with its own latest window.
`initialPage` seeds a hydrated/search-selected window and suppresses the initial
request. It is read once; changing it or changing the loader's session closure
does **not** reset the hook. Use a new host key for a different conversation/window.

## Host integration

This sketch assumes the host's bounded history operation returns rendered
`ChatItem` values. Mapping raw messages to nodes may instead happen inside the
loader. A stable `useCallback` is helpful, but callback recreation neither reloads
a completed initial window nor automatically retries a failed one.

```tsx
import { useCallback } from 'react'
import { ChatStream, useChatHistory } from '@hollis-labs/kit-chat'
import type { ChatHistoryRequest } from '@hollis-labs/kit-chat'

function Conversation({ sessionId }) {
  const loadPage = useCallback(
    ({ cursor, signal }: ChatHistoryRequest<string>) =>
      hostHistory.loadWindow({ sessionId, before: cursor, limit: 40, signal }),
    [sessionId],
  )
  const transcript = useChatHistory({ loadPage })
  // Call transcript.append([committedItem]) from the host's live-event handler.
  // Keep the unfinished reply in ChatStream.status, outside committed items.
  return <ChatStream
    items={transcript.items}
    loading={transcript.loading}
    history={transcript.history}
  />
}
```

`hostHistory` is application transport, not a kit export. `limit: 40` is an example,
not a kit default. Offset APIs can map a positive oldest offset to `olderCursor`
and map their terminal offset to `null`; the hook makes no endpoint assumptions.
Hosts with an existing query cache can keep using the presentation-only `history`
prop instead of this hook. `error` also exposes the original `Error` for host
reporting; `history.error` supplies its message to the stream's alert/retry slot.

## Why the stream changed

The primary installed `@shadcn/react` 0.3.1 implementation detects a prepend by
finding the previous first `MessageScroller.Content` child at a later index. The
0502 history action was that first child and stayed at index zero after messages
were prepended. The engine therefore classified the change incorrectly and never
restored its remembered visible message offset.

Loading/history controls now sit inside the viewport but outside Content. The
log starts with message rows, so the existing engine can detect a prepend and
restore the reader's position. The initial-error state also suppresses the empty
conversation slot because failure says nothing about whether history is empty.
Jump-to-latest retains the upstream engine and its inactive-button hiding rule.

## Primary consumer check (read-only)

- ops-chat `ff6affb094d515a4803bf826167943815cbfeb7b`,
  `src/lib/use-nanite-chat.tsx`: whole `getSession` history load and full reload
  after stream completion. Its `ChatStream` usage is compatible with this additive
  API, but adopting pagination still needs a bounded host transport operation.
- Flux `232064c3a5eaa8e8d9e270d89d78df3ca81df231`,
  `src/hooks/useChat.ts`: latest window, older offset/count pages, and generation
  checks. Those host responsibilities motivated the kit's opaque cursor and abort
  contract; no Flux transport/store was copied.
- Tangent `6c34d968c52fb680cc17a7af818ebcc3b5181c66`,
  `ui/package.json`, `ui/src/routes/ChannelPane.tsx` and
  `ui/src/lib/channel-api.ts`: no kit-chat dependency/import; its own channel list
  reverses newest-first messages. The adoption record is not its current tree.
  There is no existing kit-chat pagination assumption to break in that checkout.

## Verification

Unit tests exercise latest/older windows, cursor zero, overlap and in-flight live
edits, coalescing, retries, empty/end pages, stuck cursor, changing callbacks,
unmount cancellation and StrictMode stale-result handling. Stream tests keep the
history control outside the log and suppress the empty slot on initial failure.

The packed browser consumer imports the three source/token stylesheets and runs
[`demo/history.tsx`](../demo/history.tsx) against a bounded asynchronous fixture.
The 90-row source first yields 20 rows, then older pages with boundary overlap.
Native browser scroll anchoring is disabled to isolate the scroller engine.
[`fixtures/history-browser.mjs`](fixtures/history-browser.mjs) runs at 1280px and
390px, checking prepend offsets, a partially visible middle row, dedupe, request
coalescing, failure/retry, exhaustion, live appends, session cancellation and Jump.

Before the stream fix, the same visible row moved +1465px / +2245px respectively.
After the fix it moved 0px / 0px, including a partially visible middle row.
Receipts record [before](receipts/history-before.json) and
[after](receipts/history-after.json). The browser also checks
that Jump is hidden in a short stream and at latest, shown above latest, hides
after clicking, and resumes following subsequent live appends.

To reproduce, copy the demo into a disposable React/Vite/Tailwind v4 consumer that
installs the candidate kit/base tarballs. Mount `HistoryBrowserFixture` inside
StrictMode; import Tailwind, design-tokens CSS, design-components/source.css and
kit-chat/source.css. Build outside the consumer's scanned source tree and serve
its output on loopback. Install Playwright in that consumer and run:

```sh
export TMPDIR="$HOME/.cache/design-kit-tmp" GOTMPDIR="$HOME/.cache/design-kit-tmp"
PLAYWRIGHT_MODULE=/absolute/consumer/node_modules/playwright/index.mjs \
CHROMIUM_PATH=/absolute/chromium \
FIXTURE_URL=http://127.0.0.1:18752 \
node packages/kit-chat/docs/fixtures/history-browser.mjs /absolute/receipt.json
```

The five repository checks are typecheck, lint, test:run, build and
`node .github/scripts/design-rules-gate.mjs`, with packages built first.

## Boundaries

Windowed **loading** is supported: the initial response is bounded and the host
can seed any selected window. This is not DOM virtualization or automatic page
eviction; requested pages remain available. Eviction, bidirectional search jumps,
server pagination endpoints, query-cache policy, optimistic-ID reconciliation and
consumer migration remain host work. No ops-chat, Tangent, Flux or Nanite source
was modified, and this task does not publish a package.
