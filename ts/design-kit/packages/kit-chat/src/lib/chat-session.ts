import { useSyncExternalStore } from 'react'
import type { ChatItem } from './types'

/** Chathost committed event positions are decimal strings; '' means before the first event. */
export type ChatSessionCursor = string
export type ChatSessionRole = 'viewer' | 'controller'

export interface ChatSessionAttachment {
  readonly id: string
  readonly role: ChatSessionRole
}

export interface ChatSessionLease {
  readonly id: string
  readonly writerId: string
  readonly expiresAt: number
}

/** The host maps a committed chathost Event to a rendered kit item. */
export type ChatSessionEvent =
  | { readonly kind: 'item'; readonly cursor: ChatSessionCursor; readonly id: string; readonly item: ChatItem }
  /** A bounded host adapter may report missing replay data. Chathost itself does not emit gaps. */
  | { readonly kind: 'gap'; readonly cursor: ChatSessionCursor; readonly id: string; readonly from: ChatSessionCursor; readonly to: ChatSessionCursor; readonly reason: string }

export interface ChatSessionPresence {
  readonly id: string
  readonly label: string
  readonly role: ChatSessionRole
}

/** Transport and authorization live behind this host-supplied interface. */
export interface ChatSessionAdapter {
  attach(role: ChatSessionRole): Promise<ChatSessionAttachment>
  detach(attachment: ChatSessionAttachment): Promise<void>
  readEvents(attachment: ChatSessionAttachment, after: ChatSessionCursor): Promise<readonly ChatSessionEvent[]>
  acquire(attachment: ChatSessionAttachment): Promise<ChatSessionLease>
  takeover(attachment: ChatSessionAttachment): Promise<ChatSessionLease>
  /** Optional wrapper for chathost Renew; a host can also renew outside the view. */
  renew?(lease: ChatSessionLease): Promise<ChatSessionLease>
  submit(lease: ChatSessionLease, id: string, text: string): Promise<ChatSessionCursor>
  /** Optional host presence source; chathost does not expose a presence query. */
  presence?(attachment: ChatSessionAttachment): Promise<readonly ChatSessionPresence[]>
}

export interface ChatSessionCheckpoint {
  readonly cursor: ChatSessionCursor
  readonly draft: string
  /** Only the bounded rows currently rendered, not authoritative history. */
  readonly items: readonly ChatItem[]
}

export interface ChatSessionSnapshot {
  readonly cursor: ChatSessionCursor
  readonly items: readonly ChatItem[]
  readonly draft: string
  readonly access: 'detached' | 'viewer' | 'waiting' | 'controller'
  readonly role: ChatSessionRole | null
  readonly lease: ChatSessionLease | null
  readonly presence: readonly ChatSessionPresence[]
  readonly pending: boolean
  readonly takeoverPending: boolean
  readonly error: string | null
  readonly checkpoint: ChatSessionCheckpoint
}

export interface ChatSessionBinding {
  getSnapshot(): ChatSessionSnapshot
  subscribe(listener: () => void): () => void
  attach(role: ChatSessionRole, cursor?: ChatSessionCursor): Promise<void>
  detach(): Promise<void>
  refresh(): Promise<void>
  acquire(): Promise<boolean>
  requestTakeover(): Promise<boolean>
  renewLease(): Promise<boolean>
  setDraft(value: string): void
  submit(text?: string): Promise<boolean>
}

function position(cursor: ChatSessionCursor): bigint {
  if (cursor === '') return 0n
  if (!/^[0-9]+$/.test(cursor)) throw new Error('Invalid committed cursor')
  return BigInt(cursor)
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Session operation failed.'
}

/**
 * One view's presentation state. The adapter owns durable events and input admission;
 * this binding keeps only the render window, cursor and draft needed to reattach.
 */
export function createChatSessionBinding(adapter: ChatSessionAdapter, initial: Partial<ChatSessionCheckpoint> = {}, maxItems = 500): ChatSessionBinding {
  if (!Number.isInteger(maxItems) || maxItems < 1) throw new Error('maxItems must be positive')
  const listeners = new Set<() => void>()
  let attachment: ChatSessionAttachment | null = null
  let epoch = 0
  let nextInputId = 0
  const inputPrefix = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  let expiryTimer: ReturnType<typeof setTimeout> | null = null
  let leaseChain: Promise<void> = Promise.resolve()
  let takeoverPromise: Promise<boolean> | null = null
  const initialItems = (initial.items ?? []).slice(-maxItems)
  let snapshot: ChatSessionSnapshot = {
    cursor: initial.cursor ?? '', items: initialItems, draft: initial.draft ?? '',
    access: 'detached', role: null, lease: null, presence: [], pending: false, takeoverPending: false, error: null,
    checkpoint: { cursor: initial.cursor ?? '', items: initialItems, draft: initial.draft ?? '' },
  }

  // Lease-changing host calls must finish in issue order for one attachment.
  // Otherwise a delayed response can put an already replaced lease back in the UI.
  function serializeLease<T>(operation: () => Promise<T>): Promise<T> {
    const result = leaseChain.then(operation, operation)
    leaseChain = result.then(() => undefined, () => undefined)
    return result
  }

  function publish(patch: Partial<ChatSessionSnapshot>) {
    const next = { ...snapshot, ...patch }
    snapshot = { ...next, checkpoint: { cursor: next.cursor, items: next.items, draft: next.draft } }
    listeners.forEach((listener) => listener())
  }

  function setLease(lease: ChatSessionLease | null, access: ChatSessionSnapshot['access']) {
    if (expiryTimer) clearTimeout(expiryTimer)
    expiryTimer = null
    if (lease && lease.expiresAt <= Date.now()) lease = null
    publish({ lease, access: lease ? access : 'waiting', error: lease ? null : snapshot.error })
    if (lease) {
      const held = lease
      expiryTimer = setTimeout(() => {
        if (snapshot.lease === held) setLease(null, 'waiting')
      }, Math.max(0, held.expiresAt - Date.now()))
    }
  }

  async function refresh() {
    const current = attachment
    const requestEpoch = epoch
    if (!current) return
    try {
      const events = await adapter.readEvents(current, snapshot.cursor)
      if (requestEpoch !== epoch || attachment !== current) return
      const rows = new Map(snapshot.items.map((item) => [item.id, item]))
      let cursor = snapshot.cursor
      for (const event of events) {
        if (position(event.cursor) <= position(cursor)) continue
        if (event.kind === 'gap') {
          rows.set(`gap:${event.id}`, { kind: 'marker', id: `gap:${event.id}`, variant: 'error', label: `History gap ${event.from}–${event.to}: ${event.reason}` })
        } else {
          rows.set(event.item.id, event.item)
        }
        cursor = event.cursor
      }
      publish({ cursor, items: [...rows.values()].slice(-maxItems), error: null })
      if (adapter.presence) {
        void adapter.presence(current).then((presence) => {
          if (requestEpoch === epoch && attachment === current) publish({ presence })
        }, () => undefined)
      }
    } catch (reason) {
      if (requestEpoch === epoch) publish({ error: errorMessage(reason) })
    }
  }

  async function detach() {
    const current = attachment
    epoch++ // A late read, acquire or submit cannot restore the old view.
    const requestEpoch = epoch
    attachment = null
    leaseChain = Promise.resolve()
    takeoverPromise = null
    if (expiryTimer) clearTimeout(expiryTimer)
    expiryTimer = null
    publish({ access: 'detached', role: null, lease: null, presence: [], pending: false, takeoverPending: false })
    if (current) {
      try { await adapter.detach(current) } catch (reason) { if (requestEpoch === epoch) publish({ error: errorMessage(reason) }) }
    }
  }

  async function attach(role: ChatSessionRole, cursor = snapshot.cursor) {
    if (attachment) await detach()
    position(cursor)
    const requestEpoch = ++epoch
    publish({ cursor, access: 'detached', role: null, lease: null, pending: true, error: null })
    try {
      const next = await adapter.attach(role)
      if (requestEpoch !== epoch) { await adapter.detach(next); return }
      attachment = next
      publish({ role, access: role === 'viewer' ? 'viewer' : 'waiting', pending: false })
      await refresh()
      if (role === 'controller') await acquire()
    } catch (reason) {
      if (requestEpoch === epoch) publish({ pending: false, error: errorMessage(reason) })
    }
  }

  function acquire(): Promise<boolean> {
    const current = attachment
    const requestEpoch = epoch
    return serializeLease(async () => {
      if (!current || current.role !== 'controller' || requestEpoch !== epoch || attachment !== current) return false
      if (snapshot.access === 'controller' && snapshot.lease) return true
      try {
        const lease = await adapter.acquire(current)
        if (requestEpoch !== epoch || attachment !== current) return false
        setLease(lease, 'controller')
        return true
      } catch (reason) {
        if (requestEpoch === epoch && attachment === current) publish({ lease: null, access: 'waiting', error: errorMessage(reason) })
        return false
      }
    })
  }

  function requestTakeover(): Promise<boolean> {
    if (takeoverPromise) return takeoverPromise
    const run = (async () => {
      if (attachment?.role === 'viewer') await attach('controller')
      if (snapshot.access === 'controller' && snapshot.lease) return true
      const current = attachment
      const requestEpoch = epoch
      return serializeLease(async () => {
        if (!current || current.role !== 'controller' || requestEpoch !== epoch || attachment !== current) return false
        if (snapshot.access === 'controller' && snapshot.lease) return true
        try {
          const lease = await adapter.takeover(current)
          if (requestEpoch !== epoch || attachment !== current) return false
          setLease(lease, 'controller')
          return true
        } catch (reason) {
          if (requestEpoch === epoch && attachment === current) publish({ lease: null, access: 'waiting', error: errorMessage(reason) })
          return false
        }
      })
    })()
    takeoverPromise = run
    publish({ takeoverPending: true })
    void run.then(() => {
      if (takeoverPromise === run) {
        takeoverPromise = null
        publish({ takeoverPending: false })
      }
    })
    return run
  }

  function renewLease(): Promise<boolean> {
    const requestEpoch = epoch
    const current = attachment
    return serializeLease(async () => {
      const lease = snapshot.lease
      if (!lease || !adapter.renew || requestEpoch !== epoch || attachment !== current) return false
      try {
        const renewed = await adapter.renew(lease)
        if (requestEpoch !== epoch || attachment !== current || snapshot.lease !== lease) return false
        setLease(renewed, 'controller')
        return true
      } catch (reason) {
        if (requestEpoch === epoch && attachment === current && snapshot.lease === lease) {
          setLease(null, 'waiting')
          publish({ error: errorMessage(reason) })
        }
        return false
      }
    })
  }

  async function submit(text = snapshot.draft): Promise<boolean> {
    const trimmed = text.trim()
    const lease = snapshot.lease
    const requestEpoch = epoch
    if (!trimmed || snapshot.pending || snapshot.access !== 'controller' || !lease) return false
    publish({ pending: true })
    try {
      await adapter.submit(lease, `${inputPrefix}:${++nextInputId}`, trimmed)
      if (requestEpoch !== epoch) return false
      if (snapshot.draft.trim() === trimmed) publish({ draft: '', error: null, pending: false })
      else publish({ pending: false, error: null })
      await refresh()
      return true
    } catch (reason) {
      if (requestEpoch === epoch) {
        if (snapshot.lease === lease) publish({ lease: null, access: 'waiting', error: errorMessage(reason), pending: false })
        else publish({ error: errorMessage(reason), pending: false })
      }
      return false
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    attach, detach, refresh, acquire, requestTakeover, renewLease,
    setDraft(value) { publish({ draft: value }) },
    submit,
  }
}

export function useChatSessionBinding(binding: ChatSessionBinding): ChatSessionSnapshot {
  return useSyncExternalStore(binding.subscribe, binding.getSnapshot, binding.getSnapshot)
}
