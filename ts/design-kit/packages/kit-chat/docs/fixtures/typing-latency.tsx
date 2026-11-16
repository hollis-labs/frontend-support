import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatStream, createChatStreamBinding, useChatStreamBinding, type ChatItem } from '../../src/index'
import { ChatMarkdown } from '../../src/markdown'

const count = Number(new URLSearchParams(location.search).get('items') ?? 2000)
const mode = new URLSearchParams(location.search).get('mode') ?? 'batched'
const rows: ChatItem[] = Array.from({ length: count }, (_, i) => {
  if (i % 20 === 0) return { kind: 'card', id: `tool-${i}`, wireKind: 'tool', content: <div>Tool result {i}: found matching files</div> }
  const source = i % 10 === 0 ? `**Result ${i}** with a [reference](https://example.com) and a short list:\n- first\n- second` : `Message ${i}: a short conversation row`
  return { kind: 'message', id: `message-${i}`, role: i % 3 === 0 ? 'user' : 'assistant', content: i % 10 === 0 ? <ChatMarkdown>{source}</ChatMarkdown> : source, source }
})

type Perf = { latency: number[]; rowRenders: number; beforeTypingRows: number; afterTypingRows: number; streamDone: boolean; commits: number }
declare global { interface Window { __typingPerf: Perf } }
window.__typingPerf = { latency: [], rowRenders: 0, beforeTypingRows: 0, afterTypingRows: 0, streamDone: false, commits: 0 }

const binding = createChatStreamBinding({
  initialItems: rows,
  publishEachEvent: mode === 'unbatched',
})

export function App() {
  const view = useChatStreamBinding(binding)
  const [draft, setDraft] = useState('')
  const pending = useRef<number[]>([])
  const renderItem = useCallback((item: ChatItem) => {
    if (item.id.startsWith('message-') || item.id.startsWith('tool-')) window.__typingPerf.rowRenders++
    return item.kind === 'message' || item.kind === 'card' ? item.content : item.label
  }, [])
  useLayoutEffect(() => {
    if (pending.current.length === 0) return
    const times = pending.current.splice(0)
    requestAnimationFrame(() => {
      // A timer after rAF runs after the browser's paint opportunity.
      setTimeout(() => {
        const now = performance.now()
        for (const time of times) window.__typingPerf.latency.push(now - time)
        window.__typingPerf.afterTypingRows = window.__typingPerf.rowRenders
      }, 0)
    })
  }, [draft])
  useEffect(() => { window.__typingPerf.commits = view.commits }, [view.commits])
  return <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <div data-testid="ready">Ready: {count} items</div>
    <ChatStream items={view.items} status={view.status} renderItem={renderItem} />
    <label>Draft <textarea aria-label="Draft" value={draft} onChange={(event) => {
      pending.current.push(performance.now())
      setDraft(event.target.value)
    }} /></label>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)

const base = { v: '1', run_id: 'typing-run', time: new Date().toISOString() }
let seq = 0
const emit = (verb: string, fields: Record<string, unknown> = {}) => binding.consume({ ...base, seq: ++seq, verb, ...fields } as never)
emit('run.start')
emit('message.start', { message_id: 'streaming-answer', role: 'assistant' })
emit('part.start', { part_id: 'reply', kind: 'text' })
let ticks = 0
const timer = setInterval(() => {
  for (let i = 0; i < 3; i++) emit('part.delta', { part_id: 'reply', text: 'word ' })
  if (++ticks >= 100) {
    clearInterval(timer)
    emit('part.end', { part_id: 'reply' })
    emit('message.end', { message_id: 'streaming-answer' })
    emit('run.finish', { reason: 'stop' })
    window.__typingPerf.streamDone = true
  }
}, 12)
