import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/** Opaque to the kit. Zero and the empty string are valid cursors. */
export type ChatHistoryCursor = string | number

export interface ChatHistoryPage<Item, Cursor extends ChatHistoryCursor> {
  /** One bounded window, oldest first, with stable item IDs. */
  readonly items: readonly Item[]
  /** The next older window; null means history is exhausted. */
  readonly olderCursor: Cursor | null
}

export interface ChatHistoryRequest<Cursor extends ChatHistoryCursor> {
  /** null requests the latest window; other values request older windows. */
  readonly cursor: Cursor | null
  readonly signal: AbortSignal
}

export interface UseChatHistoryOptions<Item, Cursor extends ChatHistoryCursor> {
  /** Host-owned transport, page size, authentication and wire-to-item mapping. */
  readonly loadPage: (request: ChatHistoryRequest<Cursor>) => Promise<ChatHistoryPage<Item, Cursor>>
  /** Optional hydrated/search window. Read once; key the host by conversation/window. */
  readonly initialPage?: ChatHistoryPage<Item, Cursor>
}

interface HistorySnapshot<Item, Cursor extends ChatHistoryCursor> {
  readonly items: readonly Item[]
  readonly olderCursor: Cursor | null
  readonly initialized: boolean
  readonly pending: 'initial' | 'older' | null
  readonly error: Error | null
}

/** Local to one hook instance. No global store, transport or React nodes. */
class HistoryController<Item extends { readonly id: string }, Cursor extends ChatHistoryCursor> {
  private snapshot: HistorySnapshot<Item, Cursor>
  private listeners = new Set<() => void>()
  private request: AbortController | null = null
  private active = true
  private initialAttempted = false

  constructor(initialPage?: ChatHistoryPage<Item, Cursor>) {
    this.snapshot = {
      items: mergeItems([], initialPage?.items ?? []),
      olderCursor: initialPage?.olderCursor ?? null,
      initialized: initialPage !== undefined,
      pending: initialPage ? null : 'initial',
      error: null,
    }
  }

  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private update(patch: Partial<HistorySnapshot<Item, Cursor>>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  activate = () => { this.active = true }
  deactivate = () => {
    this.active = false
    this.request?.abort()
    this.request = null
    if (!this.snapshot.initialized) this.initialAttempted = false
    this.update({ pending: null })
  }

  append = (items: readonly Item[]) => {
    if (this.active) this.update({ items: mergeItems(this.snapshot.items, items) })
  }

  async load(loadPage: UseChatHistoryOptions<Item, Cursor>['loadPage'], initialOnly = false) {
    const { initialized, olderCursor } = this.snapshot
    if (!this.active || this.request || (initialOnly && (initialized || this.initialAttempted)) || (initialized && olderCursor === null)) return
    const cursor = initialized ? olderCursor : null
    const request = new AbortController()
    this.request = request // Synchronous guard: two calls before React renders issue one request.
    if (!initialized) this.initialAttempted = true
    this.update({ pending: initialized ? 'older' : 'initial', error: null })
    try {
      const page = await loadPage({ cursor, signal: request.signal })
      if (!this.active || this.request !== request) return
      if (cursor !== null && page.olderCursor === cursor) {
        throw new Error('History cursor did not advance. Retry or check the host page adapter.')
      }
      // Current/live items win an overlap with older server snapshots. Read the
      // current list AFTER the request, so appends made in flight are retained.
      this.update({
        items: mergeItems(page.items, this.snapshot.items),
        olderCursor: page.olderCursor,
        initialized: true,
        pending: null,
        error: null,
      })
    } catch (reason) {
      if (!this.active || this.request !== request) return
      this.update({ pending: null, error: reason instanceof Error ? reason : new Error('Unable to load message history.') })
    } finally {
      if (this.request === request) this.request = null
    }
  }
}

/** Keep first-seen order, with the last value for an ID. */
function mergeItems<Item extends { readonly id: string }>(first: readonly Item[], second: readonly Item[]): Item[] {
  const items = new Map<string, Item>()
  for (const item of first) items.set(item.id, item)
  for (const item of second) items.set(item.id, item)
  return [...items.values()]
}

/**
 * Load the latest bounded window, then prepend older pages on demand. The host
 * supplies transport; this headless hook owns only local pagination state.
 * Key the containing component by session/window to reset and cancel old work.
 * No eviction or virtualization: every page the reader requests remains loaded.
 */
export function useChatHistory<Item extends { readonly id: string }, Cursor extends ChatHistoryCursor>(
  { loadPage, initialPage }: UseChatHistoryOptions<Item, Cursor>,
) {
  const [controller] = useState(() => new HistoryController(initialPage))
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)

  useEffect(() => {
    controller.activate()
    return controller.deactivate
  }, [controller])
  useEffect(() => { void controller.load(loadPage, true) }, [controller, loadPage])

  const loadOlder = useCallback(() => controller.load(loadPage), [controller, loadPage])
  return {
    items: snapshot.items,
    loading: snapshot.pending === 'initial',
    error: snapshot.error,
    append: controller.append,
    loadOlder,
    history: {
      hasOlder: snapshot.initialized && snapshot.olderCursor !== null,
      loading: snapshot.pending === 'older',
      onLoadOlder: loadOlder,
      error: snapshot.error?.message,
    },
  }
}
