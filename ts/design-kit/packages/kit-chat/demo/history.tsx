import { useCallback, useState } from 'react'
import { Button } from '@hollis-labs/design-components'
import { ChatStream, useChatHistory } from '@hollis-labs/kit-chat'
import type { ChatHistoryRequest, ChatMessageItem } from '@hollis-labs/kit-chat'

// A host adapter over 90 fixture rows. Each request returns 20 rows plus overlap;
// overlap deliberately exercises dedupe. No real session data or API calls.
function message(index: number): ChatMessageItem {
  return {
    id: `m${index}`, kind: 'message', role: index % 2 ? 'user' : 'assistant',
    content: `Message ${index}. ${'A bounded page keeps the reader in place. '.repeat(index % 4 + 1)}`,
  }
}

function HistoryFixture({ session }: { readonly session: string }) {
  const [requests, setRequests] = useState(0)
  const [failNext, setFailNext] = useState(false)
  const [live, setLive] = useState(90)
  const loadPage = useCallback(async ({ cursor, signal }: ChatHistoryRequest<number>) => {
    setRequests((count) => count + 1)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 350)
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Canceled')) }, { once: true })
    })
    if (failNext) { setFailNext(false); throw new Error('Fixture offline: retry this page') }
    const end = cursor ?? 90
    const start = Math.max(0, end - 20)
    return {
      items: Array.from({ length: end - start + (cursor === null ? 0 : 1) }, (_, i) => message(start + i)),
      olderCursor: start === 0 ? null : start,
    }
  }, [failNext])
  const history = useChatHistory({ loadPage })
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-2 text-control">
        <span data-testid="session">{session}</span>
        <span data-testid="requests">Requests: {requests}</span>
        <span data-testid="count">Items: {history.items.length}</span>
        <Button onClick={() => { history.append([message(live)]); setLive(live + 1) }}>Append live</Button>
        <Button onClick={() => setFailNext(true)}>Fail next page</Button>
        <Button onClick={() => { void history.loadOlder(); void history.loadOlder() }}>Load twice</Button>
      </div>
      <div className="flex h-96 min-h-0 flex-col border border-border">
        <ChatStream
          items={history.items} loading={history.loading} history={history.history}
          viewportClassName="[overflow-anchor:none]"
          renderItem={(item) => <div className="rounded-panel bg-surface p-3 text-control" data-testid={item.id}>{item.kind === 'message' ? item.content : item.id}</div>}
          empty={<span>No messages yet</span>}
        />
      </div>
    </>
  )
}

export function HistoryBrowserFixture() {
  const [session, setSession] = useState('Session A')
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-bg p-3 text-fg">
      <Button onClick={() => setSession(session === 'Session A' ? 'Session B' : 'Session A')}>Switch session</Button>
      <HistoryFixture key={session} session={session} />
      <div className="mt-4 flex h-64 flex-col" data-testid="short-stream">
        <ChatStream items={[message(1), message(2)]} />
      </div>
    </main>
  )
}
