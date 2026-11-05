/**
 * Overlay state the shell owns: modal / drawer / popover / toast, stack depth 2.
 * Esc closes the topmost entry and focus returns to whatever opened it. Toasts are
 * transient and never counted against the stack.
 */
import { useCallback, useMemo, useRef, useState } from 'react'

export type OverlayKind = 'modal' | 'drawer' | 'popover' | 'toast'
export const MAX_OVERLAY_DEPTH = 2

export interface OverlayEntry { id: string; kind: OverlayKind; title: string; trigger: HTMLElement | null }

export interface OverlayStack {
  entries: readonly OverlayEntry[]
  /** False (and nothing opens) when the stack is already at depth 2. */
  open(entry: Omit<OverlayEntry, 'trigger'> & { trigger?: HTMLElement | null }): boolean
  close(id: string): void
  closeTop(): boolean
}

const restoreFocus = (el: HTMLElement | null) => { if (el && el.isConnected) el.focus() }

export function useOverlayStack(onRejected?: (id: string) => void): OverlayStack {
  const [entries, setEntries] = useState<readonly OverlayEntry[]>([])
  // The ref is the synchronous truth so open() can answer immediately; state mirrors it for rendering.
  const live = useRef<readonly OverlayEntry[]>([])
  const commit = (next: readonly OverlayEntry[]) => { live.current = next; setEntries(next) }
  const open = useCallback<OverlayStack['open']>(entry => {
    const prev = live.current
    if (prev.some(e => e.id === entry.id)) return true
    if (entry.kind !== 'toast' && prev.filter(e => e.kind !== 'toast').length >= MAX_OVERLAY_DEPTH) { onRejected?.(entry.id); return false }
    const trigger = entry.trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    commit([...prev, { ...entry, trigger }])
    return true
  }, [onRejected])
  const close = useCallback((id: string) => {
    const hit = live.current.find(e => e.id === id)
    if (!hit) return
    commit(live.current.filter(e => e !== hit))
    queueMicrotask(() => restoreFocus(hit.trigger))
  }, [])
  const closeTop = useCallback(() => {
    const top = [...live.current].reverse().find(e => e.kind !== 'toast')
    if (!top) return false
    commit(live.current.filter(e => e !== top))
    queueMicrotask(() => restoreFocus(top.trigger))
    return true
  }, [])
  return useMemo(() => ({ entries, open, close, closeTop }), [entries, open, close, closeTop])
}
