import { dedupeKeyFor, pickRule } from './match'
import type {
  CardInput,
  CardRule,
  CardStatus,
  CardViewModel,
  EngineOptions,
  EngineSnapshot,
  EngineStore,
  HeldEntry,
  Surface,
} from './types'

/**
 * The surface/lifecycle engine: rules as data in, a store of card view-models out.
 *
 * THE FIVE RULES THIS FILE EXISTS TO KEEP
 *  1. A toast never holds the only copy of an answerable card — it gets a durable
 *     `home` and the toast links to it.
 *  2. Dedupe and supersede never reorder, and never steal focus mid-edit: while a
 *     card is `editing` the replacement is HELD, the old card shows
 *     `updatedAvailable`, and the swap waits for `applyPending`.
 *  3. Expiry is DISPLAY only. `expired` is a server status applied via
 *     `applyServerState`; the engine never derives it from a clock.
 *  4. Server state is authoritative: a lower revision for a known id is ignored.
 *  5. Nothing here knows a wire kind, a transport or a component.
 */

export interface CardEngine {
  /** Add or update a card. Returns its view-model, or `null` when no rule matched. */
  ingest(card: CardInput): CardViewModel | null
  /** Record what the server says. `supersededBy` links the replacement. */
  applyServerState(id: string, status: CardStatus, extra?: { supersededBy?: string; revision?: number }): void
  /** The person started/stopped editing this card. Stopping does NOT apply a held swap. */
  setEditing(id: string, editing: boolean): void
  /** Apply a held update/replacement for `id` (the person asked for it, or is idle). */
  applyPending(id: string): void
  dismissToast(id: string): void
  /** Dismiss non-answerable toasts whose ttl has passed. Answerable cards are never touched. */
  dismissExpiredToasts(): readonly string[]
  /** Cards for a surface, in arrival order. Held replacements are not visible yet. */
  select(surface: Surface): readonly CardViewModel[]
  get(id: string): CardViewModel | undefined
  snapshot(): EngineSnapshot
  subscribe(listener: () => void): () => void
}

function maxRev(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null) return b ?? null
  if (b == null) return a
  return Math.max(a, b)
}

const EMPTY: EngineSnapshot = { order: [], cards: {}, held: {} }

export function memoryStore(initial: EngineSnapshot = EMPTY): EngineStore {
  let state = initial
  return { get: () => state, set: (next) => { state = next } }
}

function homeOf(rule: CardRule, card: CardInput): CardViewModel['home'] {
  if (rule.escalateBlocking && card.blocking) return 'modal'
  if (rule.surface !== 'toast') return rule.surface
  // A toast alone would be the only copy. Answerable cards live in the tray.
  return 'tray'
}

export function createCardEngine(options: EngineOptions): CardEngine {
  const store = options.store ?? memoryStore()
  const listeners = new Set<() => void>()

  const commit = (next: EngineSnapshot) => {
    store.set(next)
    listeners.forEach((l) => l())
  }

  function build(card: CardInput, rule: CardRule, prior?: CardViewModel): CardViewModel {
    const actions = rule.actions ?? []
    const answerable = actions.length > 0
    const home = homeOf(rule, card)
    const wantsToast = rule.surface === 'toast'
    const surfaces: Surface[] = wantsToast ? (answerable ? [home, 'toast'] : ['toast']) : [home]
    return {
      id: card.id,
      kind: card.kind,
      input: card,
      ruleId: rule.id,
      home,
      surfaces,
      answerable,
      actions,
      status: prior?.status ?? null,
      supersededBy: prior?.supersededBy ?? null,
      dedupeKey: dedupeKeyFor(rule, card),
      expiresAt: card.expiresAt ?? (rule.ttlMs != null ? options.now() + rule.ttlMs : null),
      editing: prior?.editing ?? false,
      updatedAvailable: false,
      toastDismissed: prior?.toastDismissed ?? false,
      revisionFloor: maxRev(prior?.revisionFloor, card.revision),
    }
  }

  /** Hold work for `targetId`, never letting an older arrival replace a newer held one. */
  function hold(snap: EngineSnapshot, targetId: string, entry: HeldEntry, target: CardViewModel): CardViewModel {
    const current = snap.held[targetId]
    const r = entry.card.revision
    if (current && current.card.id === entry.card.id && r != null && current.card.revision != null && r <= current.card.revision) {
      return target // stale against what is already held
    }
    commit({
      ...snap,
      held: { ...snap.held, [targetId]: entry },
      cards: { ...snap.cards, [targetId]: { ...target, updatedAvailable: true, revisionFloor: entry.mode === 'update' ? maxRev(target.revisionFloor, r) : target.revisionFloor } },
    })
    return store.get().cards[targetId]
  }

  function ingest(card: CardInput): CardViewModel | null {
    const rule = pickRule(options.rules, card)
    if (!rule) return null
    const snap = store.get()
    const existing = snap.cards[card.id]

    // Same id: an update. Lower or equal revision is stale and ignored.
    if (existing) {
      if (card.revision != null && existing.revisionFloor != null && card.revision <= existing.revisionFloor) {
        return existing
      }
      if (existing.editing) return hold(snap, card.id, { card, mode: 'update' }, existing)
      const next = build(card, rule, existing)
      commit({ ...snap, cards: { ...snap.cards, [card.id]: next } })
      return next
    }

    const next = build(card, rule)
    // A different id with the same live dedupe key.
    const twin = next.dedupeKey == null ? undefined : snap.order.map((id) => snap.cards[id]).find(
      (c) => c.dedupeKey === next.dedupeKey && c.status == null && c.supersededBy == null,
    )
    if (twin) {
      if (rule.supersedes === 'dedupe-key') {
        if (twin.editing) {
          // HOLD the replacement: the old card stays live and tells the person.
          return hold(snap, twin.id, { card, mode: 'supersede' }, twin)
        }
        commit({
          order: [...snap.order, next.id],
          held: snap.held,
          cards: { ...snap.cards, [twin.id]: { ...twin, status: 'superseded', supersededBy: next.id }, [next.id]: next },
        })
        return next
      }
      // Plain dedupe: fold into the existing card IN PLACE (no new row, no reorder).
      if (twin.editing) return hold(snap, twin.id, { card, mode: 'dedupe' }, twin)
      const merged = build({ ...card, id: twin.id }, rule, twin)
      commit({ ...snap, cards: { ...snap.cards, [twin.id]: merged } })
      return merged
    }

    commit({ ...snap, order: [...snap.order, next.id], cards: { ...snap.cards, [next.id]: next } })
    return next
  }

  function applyServerState(id: string, status: CardStatus, extra?: { supersededBy?: string; revision?: number }) {
    const snap = store.get()
    const card = snap.cards[id]
    if (!card) return
    if (extra?.revision != null && card.revisionFloor != null && extra.revision < card.revisionFloor) return
    commit({
      ...snap,
      cards: {
        ...snap.cards,
        [id]: { ...card, status, supersededBy: extra?.supersededBy ?? card.supersededBy, revisionFloor: maxRev(card.revisionFloor, extra?.revision) },
      },
    })
  }

  function setEditing(id: string, editing: boolean) {
    const snap = store.get()
    const card = snap.cards[id]
    if (!card || card.editing === editing) return
    commit({ ...snap, cards: { ...snap.cards, [id]: { ...card, editing } } })
  }

  function applyPending(id: string) {
    const snap = store.get()
    const card = snap.cards[id]
    const held = snap.held[id]
    if (!card || !held) return
    const rest = { ...snap.held }
    delete rest[id]
    const rule = pickRule(options.rules, held.card)
    if (!rule) {
      commit({ ...snap, held: rest, cards: { ...snap.cards, [id]: { ...card, updatedAvailable: false } } })
      return
    }
    const idle = { ...card, editing: false }
    if (held.mode === 'update') {
      commit({ ...snap, held: rest, cards: { ...snap.cards, [id]: build(held.card, rule, idle) } })
      return
    }
    if (held.mode === 'dedupe') {
      // Plain dedupe stays plain: fold into the existing card in place, never supersede.
      commit({ ...snap, held: rest, cards: { ...snap.cards, [id]: build({ ...held.card, id }, rule, idle) } })
      return
    }
    // A held replacement under a different id: supersede now, append the new card.
    const next = build(held.card, rule)
    commit({
      order: [...snap.order, next.id],
      held: rest,
      cards: { ...snap.cards, [id]: { ...idle, status: 'superseded', supersededBy: next.id, updatedAvailable: false }, [next.id]: next },
    })
  }

  function dismissToast(id: string) {
    const snap = store.get()
    const card = snap.cards[id]
    if (!card || card.toastDismissed) return
    commit({ ...snap, cards: { ...snap.cards, [id]: { ...card, toastDismissed: true } } })
  }

  function dismissExpiredToasts(): readonly string[] {
    const now = options.now()
    const due = store.get().order.filter((id) => {
      const c = store.get().cards[id]
      return c && !c.answerable && c.surfaces.includes('toast') && !c.toastDismissed && c.expiresAt != null && c.expiresAt <= now
    })
    if (due.length === 0) return due
    const snap = store.get()
    const cards = { ...snap.cards }
    for (const id of due) cards[id] = { ...cards[id], toastDismissed: true }
    commit({ ...snap, cards })
    return due
  }

  function select(surface: Surface): readonly CardViewModel[] {
    const snap = store.get()
    return snap.order
      .map((id) => snap.cards[id])
      .filter((c) => c.surfaces.includes(surface) && (surface !== 'toast' || !c.toastDismissed))
  }

  return {
    ingest,
    applyServerState,
    setEditing,
    applyPending,
    dismissToast,
    dismissExpiredToasts,
    select,
    get: (id) => store.get().cards[id],
    snapshot: () => store.get(),
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}
