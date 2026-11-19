import { memo, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ChatItem, ChatStreamStatus } from '../lib/types'

export interface VirtualChatStreamProps {
  readonly items: readonly ChatItem[]
  readonly status?: ChatStreamStatus
  readonly renderItem?: (item: ChatItem) => ReactNode
  readonly history?: { readonly hasOlder: boolean; readonly loading: boolean; readonly onLoadOlder: () => void; readonly hasNewer?: boolean; readonly onLoadNewer?: () => void; readonly error?: ReactNode }
  readonly estimateRowHeight?: number
  readonly overscan?: number
  readonly className?: string
  readonly 'aria-label'?: string
}

function defaultItem(item: ChatItem): ReactNode {
  if (item.kind === 'marker') return item.label
  return item.content
}

const VirtualChatRow = memo(function VirtualChatRow({ item, index, start, measure, renderItem }: {
  readonly item: ChatItem
  readonly index: number
  readonly start: number
  readonly measure: (element: Element | null) => void
  readonly renderItem: (item: ChatItem) => ReactNode
}) {
  return <div ref={measure} data-index={index} data-chat-item-id={item.id}
    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${start}px)` }}>
    {renderItem(item)}
  </div>
})

/**
 * Opt-in DOM virtualization for long histories. Use maxItems with useChatHistory
 * to bound loaded data as well. Stable IDs preserve anchors across window shifts.
 */
export function VirtualChatStream({ items, status, renderItem = defaultItem, history, estimateRowHeight = 72, overscan = 6, className, 'aria-label': label = 'Conversation' }: VirtualChatStreamProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const previous = useRef(items)
  const anchor = useRef<{ id: string; offset: number } | null>(null)
  const pinned = useRef(true)
  // TanStack Virtual deliberately owns mutable measurements; React Compiler must skip this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => viewport.current,
    estimateSize: () => estimateRowHeight,
    getItemKey: (index) => items[index]?.id ?? index,
    overscan,
  })

  const remember = () => {
    const element = viewport.current
    if (!element) return
    pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 32
    const row = virtualizer.getVirtualItems().find((item) => item.end > element.scrollTop)
    if (row) anchor.current = { id: items[row.index]!.id, offset: element.scrollTop - row.start }
  }

  useLayoutEffect(() => {
    const element = viewport.current
    if (!element || previous.current === items) return
    const old = previous.current
    previous.current = items
    const priorAnchor = anchor.current
    const prepended = old.length > 0 && old[0]?.id !== items[0]?.id
    if (prepended && priorAnchor) {
      const index = items.findIndex((item) => item.id === priorAnchor.id)
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'start' })
        element.scrollTop += priorAnchor.offset
        const frame = requestAnimationFrame(() => {
          const row = [...element.querySelectorAll<HTMLElement>('[data-chat-item-id]')].find((node) => node.dataset.chatItemId === priorAnchor.id)
          if (row) element.scrollTop += row.getBoundingClientRect().top - element.getBoundingClientRect().top + priorAnchor.offset
        })
        return () => cancelAnimationFrame(frame)
      }
    } else if (pinned.current && items.length > old.length) {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' })
    }
  }, [items, virtualizer])

  useEffect(() => {
    if (items.length) virtualizer.scrollToIndex(items.length - 1, { align: 'end' })
  // Initial mount only; later changes use the anchor-aware layout effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className={className} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
    {history && (history.hasOlder || history.loading || history.error) ? <div>
      {history.error ? <span role="alert">{history.error}</span> : null}
      <button type="button" disabled={history.loading} onClick={history.onLoadOlder}>{history.loading ? 'Loading older messages…' : 'Load older messages'}</button>
    </div> : null}
    <div ref={viewport} role="region" aria-label={label} onScroll={remember} style={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]!
          return <VirtualChatRow key={item.id} item={item} index={virtualRow.index} start={virtualRow.start} measure={virtualizer.measureElement} renderItem={renderItem} />
        })}
      </div>
      {status?.status === 'streaming' || status?.status === 'stalled' ? <div role="status">{status.content}</div> : null}
      {status?.status === 'error' ? <div role="alert">{status.message}</div> : null}
    </div>
    {history?.hasNewer && history.onLoadNewer ? <button type="button" disabled={history.loading} onClick={history.onLoadNewer}>Load newer messages</button> : null}
  </div>
}
