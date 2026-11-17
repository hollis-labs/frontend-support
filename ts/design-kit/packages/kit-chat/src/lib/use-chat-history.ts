import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/** Opaque to the kit. Zero and the empty string are valid cursors. */
export type ChatHistoryCursor = string | number

export interface ChatHistoryPage<Item, Cursor extends ChatHistoryCursor> {
  /** One bounded window, oldest first, with stable item IDs. */
  readonly items: readonly Item[]
  /** The next older window; null means history is exhausted. */
  readonly olderCursor: Cursor | null
  /** Required on older pages when a bounded window evicts its newer edge. */
  readonly newerCursor?: Cursor | null
}

export interface ChatHistoryRequest<Cursor extends ChatHistoryCursor> {
  /** null requests the latest window; other values request older windows. */
  readonly cursor: Cursor | null
  readonly signal: AbortSignal
  readonly direction?: 'older' | 'newer'
}

export interface UseChatHistoryOptions<Item, Cursor extends ChatHistoryCursor> {
  /** Host-owned transport, page size, authentication and wire-to-item mapping. */
  readonly loadPage: (request: ChatHistoryRequest<Cursor>) => Promise<ChatHistoryPage<Item, Cursor>>
  /** Optional hydrated/search window. Read once; key the host by conversation/window. */
  readonly initialPage?: ChatHistoryPage<Item, Cursor>
  /** Maximum loaded items. Requires loadNewerPage for paging back after eviction. */
  readonly maxItems?: number
  /** Host-owned forward page adapter for a bounded window. */
  readonly loadNewerPage?: (request: ChatHistoryRequest<Cursor>) => Promise<ChatHistoryPage<Item, Cursor>>
}

interface HistorySnapshot<Item, Cursor extends ChatHistoryCursor> {
  readonly items: readonly Item[]
  readonly olderCursor: Cursor | null
  readonly newerCursor: Cursor | null
  readonly initialized: boolean
  readonly pending: 'initial' | 'older' | 'newer' | null
  readonly error: Error | null
}

/** Local to one hook instance. No global store, transport or React nodes. */
class HistoryController<Item extends { readonly id: string }, Cursor extends ChatHistoryCursor> {
  private snapshot: HistorySnapshot<Item, Cursor>
  private listeners = new Set<() => void>()
  private request: AbortController | null = null
  private active = true
  private initialAttempted = false
  private readonly maxItems: number | undefined

  constructor(initialPage?: ChatHistoryPage<Item, Cursor>, maxItems?: number, canLoadNewer = false) {
    if (maxItems !== undefined && (!Number.isSafeInteger(maxItems) || maxItems < 1 || !canLoadNewer)) {
      throw new Error('A bounded history requires a positive maxItems and loadNewerPage.')
    }
    if (maxItems !== undefined && (initialPage?.items.length ?? 0) > maxItems) {
      throw new Error('The initial history page exceeds maxItems.')
    }
    this.maxItems = maxItems
    this.snapshot = {
      items: mergeItems([], initialPage?.items ?? []),
      olderCursor: initialPage?.olderCursor ?? null,
      newerCursor: initialPage?.newerCursor ?? null,
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
      const merged = mergeItems(page.items, this.snapshot.items)
      const evictsNewer = this.maxItems !== undefined && merged.length > this.maxItems
      if (evictsNewer && page.newerCursor == null) {
        throw new Error('An older page needs newerCursor before bounded history can evict newer items.')
      }
      this.update({
        items: evictsNewer ? merged.slice(0, this.maxItems) : merged,
        olderCursor: page.olderCursor,
        newerCursor: evictsNewer ? page.newerCursor! : this.snapshot.newerCursor,
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

  async loadNewer(loadPage: NonNullable<UseChatHistoryOptions<Item, Cursor>['loadNewerPage']>) {
    const cursor = this.snapshot.newerCursor
    if (!this.active || this.request || cursor === null || this.maxItems === undefined) return
    const request = new AbortController()
    this.request = request
    this.update({ pending: 'newer', error: null })
    try {
      const page = await loadPage({ cursor, signal: request.signal, direction: 'newer' })
      if (!this.active || this.request !== request) return
      if (page.newerCursor === cursor) throw new Error('Newer history cursor did not advance.')
      const merged = mergeItems(this.snapshot.items, page.items)
      const evictsOlder = merged.length > this.maxItems
      if (evictsOlder && page.olderCursor === null) {
        throw new Error('A newer page needs olderCursor before bounded history can evict older items.')
      }
      this.update({
        items: evictsOlder ? merged.slice(-this.maxItems) : merged,
        olderCursor: evictsOlder ? page.olderCursor : this.snapshot.olderCursor,
        newerCursor: page.newerCursor ?? null,
        pending: null,
        error: null,
      })
    } catch (reason) {
      if (!this.active || this.request !== request) return
      this.update({ pending: null, error: reason instanceof Error ? reason : new Error('Unable to load newer history.') })
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
 * Bounded eviction is opt-in. The host supplies backward and forward cursors;
 * the hook keeps only maxItems loaded while preserving the ability to page both ways.
 */
export function useChatHistory<Item extends { readonly id: string }, Cursor extends ChatHistoryCursor>(
  { loadPage, initialPage, maxItems, loadNewerPage }: UseChatHistoryOptions<Item, Cursor>,
) {
  const [controller] = useState(() => new HistoryController(initialPage, maxItems, !!loadNewerPage))
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)

  useEffect(() => {
    controller.activate()
    return controller.deactivate
  }, [controller])
  useEffect(() => { void controller.load(loadPage, true) }, [controller, loadPage])

  const loadOlder = useCallback(() => controller.load(loadPage), [controller, loadPage])
  const loadNewer = useCallback(() => loadNewerPage ? controller.loadNewer(loadNewerPage) : Promise.resolve(), [controller, loadNewerPage])
  return {
    items: snapshot.items,
    loading: snapshot.pending === 'initial',
    error: snapshot.error,
    append: controller.append,
    loadOlder,
    loadNewer,
    history: {
      hasOlder: snapshot.initialized && snapshot.olderCursor !== null,
      hasNewer: snapshot.newerCursor !== null,
      loading: snapshot.pending === 'older' || snapshot.pending === 'newer',
      onLoadOlder: loadOlder,
      onLoadNewer: loadNewer,
      error: snapshot.error?.message,
    },
  }
}
