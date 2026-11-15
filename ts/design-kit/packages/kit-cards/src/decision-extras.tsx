import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Button } from '@hollis-labs/design-components'

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
  /** Whole seconds left in the window. */
  readonly secondsLeft: number
  /** Hold `item` for `undoMs`, or commit at once when `undoMs` is unset or 0. */
  readonly start: (item: T) => void
  readonly undo: () => void
}

export function useHeldDecision<T>(undoMs: number | undefined, commit: (item: T) => void | Promise<void>): HeldDecision<T> {
  const [held, setHeld] = useState<T | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => {
    if (held == null || !undoMs) return
    const end = Date.now() + undoMs
    setSecondsLeft(Math.ceil(undoMs / 1000))
    const tick = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250)
    const done = setTimeout(() => {
      setHeld(null)
      void commitRef.current(held)
    }, undoMs)
    return () => {
      clearInterval(tick)
      clearTimeout(done)
    }
  }, [held, undoMs])
  return {
    held,
    secondsLeft,
    start(item) {
      if (undoMs && undoMs > 0) setHeld(item)
      else void commit(item)
    },
    undo: () => setHeld(null),
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

export function HeldBar({ label, secondsLeft, onUndo, disabled }: { label: ReactNode; secondsLeft: number; onUndo: () => void; disabled?: boolean }) {
  return (
    <>
      <span role="status" data-slot="held-decision" className="mr-auto text-control text-fg-secondary">
        {label} in {secondsLeft}s
      </span>
      <Button type="button" variant="outline" size="sm" disabled={disabled} className="max-sm:min-h-11" onClick={onUndo}>
        Undo
      </Button>
    </>
  )
}

export function RecommendedTag() {
  return (
    <span data-slot="recommended" className="ml-1.5 rounded-control border border-border-subtle px-1 text-caption text-fg-muted">
      Recommended
    </span>
  )
}

export function FallbackLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a data-slot="fallback-link" href={href} className="mr-auto text-control text-primary underline">
      {children ?? 'Open in Approvals'}
    </a>
  )
}
