import type { QueuedChatMessage } from '../lib/use-busy-chat-queue'

export interface BusyChatQueueProps {
  readonly items: readonly QueuedChatMessage[]
  readonly onEdit: (id: string, text: string) => void
  readonly onCancel: (id: string) => void
  readonly onMove: (id: string, direction: -1 | 1) => void
  readonly onRetry: (id: string) => void
}

/** Accessible, transport-free controls for the headless busy queue. */
export function BusyChatQueue({ items, onEdit, onCancel, onMove, onRetry }: BusyChatQueueProps) {
  if (items.length === 0) return null
  return <section aria-label="Queued messages">
    <ol>
      {items.map((item, index) => <li key={item.id}>
        <label>
          Message {index + 1}
          <textarea aria-label={`Queued message ${index + 1}`} value={item.text} disabled={item.status === 'sending'} onChange={(event) => onEdit(item.id, event.target.value)} />
        </label>
        {item.status === 'failed' ? <span role="alert">{item.error ?? 'Send failed'}</span> : null}
        {item.status === 'sending' ? <span role="status">Sending…</span> : null}
        <button type="button" aria-label={`Move message ${index + 1} up`} disabled={index === 0 || item.status === 'sending'} onClick={() => onMove(item.id, -1)}>Up</button>
        <button type="button" aria-label={`Move message ${index + 1} down`} disabled={index === items.length - 1 || item.status === 'sending'} onClick={() => onMove(item.id, 1)}>Down</button>
        <button type="button" aria-label={`Cancel message ${index + 1}`} disabled={item.status === 'sending'} onClick={() => onCancel(item.id)}>Cancel</button>
        {item.status === 'failed' ? <button type="button" onClick={() => onRetry(item.id)}>Retry</button> : null}
      </li>)}
    </ol>
  </section>
}
