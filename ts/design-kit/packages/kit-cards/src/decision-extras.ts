import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

/**
 * Shared by ApprovalCard and ChoiceCard: the held decision (undo window), the keyboard
 * handler, and the small fixed pieces (recommended tag, fallback link).
 *
 * UNDO IS A HOLD, NOT A SEND. While a decision is held nothing has gone to the host; the
 * responder runs when the window closes. Unmounting a card cancels a held decision: a
 * card that is gone must not answer on the person's behalf.
 */

export interface HeldDecision<T> {
  /** The decision waiting out its window, or null. */
  readonly held: T | null
  /** Whole seconds left in the window (0 when nothing is held). */
  readonly secondsLeft: number
  /** Hold `item` for `undoMs`, or commit at once when `undoMs` is unset or 0. */
  readonly start: (item: T) => void
  readonly undo: () => void
}

export function useHeldDecision<T>(undoMs: number | undefined, commit: (item: T) => void | Promise<void>): HeldDecision<T> {
  // The deadline is fixed when the hold starts; `now` only advances from the timer callback.
  const [hold, setHold] = useState<{ item: T; end: number } | null>(null)
  const [now, setNow] = useState(0)
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => {
    if (hold == null) return
    const tick = setInterval(() => setNow(Date.now()), 250)
    const done = setTimeout(() => {
      setHold(null)
      void commitRef.current(hold.item)
    }, Math.max(0, hold.end - Date.now()))
    return () => {
      clearInterval(tick)
      clearTimeout(done)
    }
  }, [hold])
  return {
    held: hold?.item ?? null,
    secondsLeft: hold ? Math.max(0, Math.ceil((hold.end - now) / 1000)) : 0,
    start(item) {
      if (undoMs && undoMs > 0) {
        setNow(Date.now())
        setHold({ item, end: Date.now() + undoMs })
      } else void commit(item)
    },
    undo: () => setHold(null),
  }
}

export interface CardKeys {
  /** A single character, lower-cased: `y`, `n`, `1`. Not called with a modifier held. */
  readonly onKey?: (key: string) => void
  /** Cmd/Ctrl+Z. */
  readonly onUndo?: () => void
}

/**
 * Key handling that acts while focus is INSIDE the card, so two cards in one transcript
 * never answer the same key. Keys typed into a field are left alone.
 */
export function cardKeyHandler(enabled: boolean, keys: CardKeys) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (!enabled || event.defaultPrevented) return
    const target = event.target as HTMLElement
    const typing = target.closest('input:not([type="radio"]):not([type="checkbox"]), textarea, select, [contenteditable="true"]') != null
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      if (typing || !keys.onUndo) return
      event.preventDefault()
      keys.onUndo()
      return
    }
    if (typing || event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return
    if (keys.onKey) keys.onKey(event.key.toLowerCase())
  }
}
