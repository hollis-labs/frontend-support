import { useCallback, useEffect, useRef, useState } from 'react'

export interface QueuedChatMessage {
  readonly id: string
  readonly text: string
  readonly status: 'queued' | 'sending' | 'failed'
  readonly error?: string
}

export interface UseBusyChatQueueOptions {
  /** True while the agent has an in-flight turn. */
  readonly busy: boolean
  /** Return false or reject when the message was not accepted. */
  readonly send: (text: string) => boolean | void | Promise<boolean | void>
  readonly createId?: () => string
}

/**
 * A local send queue to place behind ChatComposer's onSubmit contract.
 * Queued messages are only removed after send succeeds. A failed immediate send
 * returns false to ChatComposer so its draft remains; a failed queued send stays
 * editable in the queue until Retry is chosen.
 */
export function useBusyChatQueue({ busy, send, createId = () => crypto.randomUUID() }: UseBusyChatQueueOptions) {
  const [items, setItems] = useState<readonly QueuedChatMessage[]>([])
  const itemsRef = useRef(items)
  const busyRef = useRef(busy)
  const sendRef = useRef(send)
  const idRef = useRef(createId)
  const flushing = useRef(false)
  const mounted = useRef(true)
  busyRef.current = busy
  sendRef.current = send
  idRef.current = createId
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const update = useCallback((change: (old: readonly QueuedChatMessage[]) => readonly QueuedChatMessage[]) => {
    const next = change(itemsRef.current)
    itemsRef.current = next
    setItems(next)
  }, [])

  const submit = useCallback(async (raw: string): Promise<boolean> => {
    const text = raw.trim()
    if (!text) return false
    if (busyRef.current || flushing.current || itemsRef.current.length > 0) {
      update((old) => [...old, { id: idRef.current(), text, status: 'queued' }])
      return true
    }
    try {
      return (await sendRef.current(text)) !== false
    } catch {
      return false
    }
  }, [update])

  const edit = useCallback((id: string, text: string) => {
    update((old) => old.map((item) => item.id === id && item.status !== 'sending' ? { ...item, text } : item))
  }, [update])
  const cancel = useCallback((id: string) => {
    update((old) => old.filter((item) => item.id !== id || item.status === 'sending'))
  }, [update])
  const move = useCallback((id: string, direction: -1 | 1) => {
    update((old) => {
      const index = old.findIndex((item) => item.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= old.length || old[index]?.status === 'sending' || old[target]?.status === 'sending') return old
      const next = [...old]
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })
  }, [update])
  const retry = useCallback((id: string) => {
    update((old) => old.map((item) => item.id === id && item.status === 'failed' ? { id, text: item.text, status: 'queued' } : item))
  }, [update])

  useEffect(() => {
    if (busy || flushing.current || items.length === 0 || items[0]?.status !== 'queued') return
    flushing.current = true
    void (async () => {
      while (mounted.current && !busyRef.current) {
        const item = itemsRef.current[0]
        if (!item || item.status !== 'queued') break
        update((old) => old.map((entry) => entry.id === item.id ? { ...entry, status: 'sending' } : entry))
        try {
          if ((await sendRef.current(item.text)) === false) throw new Error('Message was not accepted')
          if (!mounted.current) break
          update((old) => old.filter((entry) => entry.id !== item.id))
        } catch (error) {
          if (!mounted.current) break
          update((old) => old.map((entry) => entry.id === item.id
            ? { ...entry, status: 'failed', error: error instanceof Error ? error.message : String(error) }
            : entry))
          break
        }
      }
      flushing.current = false
    })()
  }, [busy, items, update])

  return { items, submit, edit, cancel, move, retry }
}
