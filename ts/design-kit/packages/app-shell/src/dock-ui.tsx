/**
 * Bottom-dock parts lifted (copy-from only) from Nanite's chat drawer: the tab strip and the drag handle.
 * Tokens and kit steps only; no icon library, so glyphs are text.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

export interface DockTab {
  id: string
  label: string
  /** True for the selected tab. */
  active: boolean
  /** A pulsing pip, e.g. a tools tab during a stream. */
  runningPip?: boolean
  /** Closeable tabs show a close button. */
  closeable?: boolean
  /** Pinnable tabs show a pin toggle. */
  pinnable?: boolean
  pinned?: boolean
}

export interface DockTabStripProps {
  tabs: readonly DockTab[]
  /** `card` (default) is the folder-tab look of a strip that is the dock's handle; `inline` is plain pills inside a dock body. */
  variant?: 'card' | 'inline'
  onSelect: (id: string) => void
  onClose?: (id: string) => void
  onTogglePin?: (id: string) => void
}

const LABEL_MAX = 14
const truncate = (s: string) => (s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1)}…` : s)

export function DockTabStrip({ tabs, variant = 'card', onSelect, onClose, onTogglePin }: DockTabStripProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ left: false, right: false })
  const measure = () => {
    const el = scroller.current
    if (!el) return
    setOverflow({ left: el.scrollLeft > 0, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 })
  }
  useLayoutEffect(measure, [tabs.length])
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => { el.removeEventListener('scroll', measure); window.removeEventListener('resize', measure) }
  }, [])
  const page = (dir: -1 | 1) => { const el = scroller.current; if (el) el.scrollBy?.({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' }) }
  // Roving focus: arrows move between the tab buttons.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const btns = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    const at = btns.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    e.preventDefault()
    btns[(at + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length]?.focus()
  }
  return (
    <div data-dock-tabs={variant} className={`flex items-center gap-1 px-1 ${variant === 'inline' ? 'border-b border-border-subtle' : 'border-t-2 border-fg'}`}>
      {overflow.left ? <button type="button" aria-label="Scroll tabs left" onClick={() => page(-1)} className="px-2 py-1 text-caption text-fg-muted hover:text-fg">‹</button> : null}
      <div ref={scroller} role="tablist" aria-label="Dock tabs" onKeyDown={onKey} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map(t => (
          <div
            key={t.id} data-active={t.active || undefined}
            className={`group relative flex shrink-0 items-center gap-1 px-3 py-1 font-mono text-caption ${
              variant === 'inline'
                ? `rounded-md ${t.active ? 'bg-bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`
                : t.active ? 'rounded-t-md border-x border-border-subtle bg-bg-elevated text-fg' : 'rounded-md text-fg-muted hover:text-fg'}`}
          >
            <button type="button" role="tab" aria-selected={t.active} tabIndex={t.active ? 0 : -1} title={t.label} onClick={() => onSelect(t.id)} className="flex items-center gap-2">
              <span>{truncate(t.label)}</span>
              {t.runningPip ? <span role="img" aria-label="Running" data-pip className="inline-block size-2 animate-pulse rounded-full bg-warning" /> : null}
            </button>
            {t.pinnable && onTogglePin ? (
              <button type="button" aria-label={t.pinned ? `Unpin ${t.label}` : `Pin ${t.label}`} aria-pressed={!!t.pinned} onClick={() => onTogglePin(t.id)} className="text-fg-muted hover:text-fg focus-visible:text-fg">{t.pinned ? '◆' : '◇'}</button>
            ) : null}
            {t.closeable && onClose ? (
              <button type="button" aria-label={`Close ${t.label}`} onClick={() => onClose(t.id)} className="text-fg-muted hover:text-fg focus-visible:text-fg">×</button>
            ) : null}
          </div>
        ))}
      </div>
      {overflow.right ? <button type="button" aria-label="Scroll tabs right" onClick={() => page(1)} className="px-2 py-1 text-caption text-fg-muted hover:text-fg">›</button> : null}
    </div>
  )
}

export const RESIZE_KEY_STEP = 24

export interface DockResizeHandleProps {
  /** Current height in px. */
  height: number
  min: number
  max: number
  label?: string
  /** Called while dragging or on a key; px is unclamped on drag, so the owner decides what a small value means. */
  onResize: (px: number) => void
  /** The pointer was released (or the key pressed) at a height below `min`: close the dock. */
  onCollapse: () => void
  /** Double-click: the owner toggles the dock. */
  onToggle: () => void
}

/** The separator on a bottom dock's top edge. Dragging up grows it. */
export function DockResizeHandle({ height, min, max, label = 'Resize dock; double-click to toggle', onResize, onCollapse, onToggle }: DockResizeHandleProps) {
  const drag = useRef<{ y: number; height: number; latest: number } | null>(null)
  const down = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, height, latest: height }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    d.latest = Math.min(max, d.height + (d.y - e.clientY))
    onResize(Math.max(0, d.latest))
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (d.latest < min) onCollapse()
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const grow = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0
    if (e.key === 'Home') { e.preventDefault(); onResize(min); return }
    if (e.key === 'End') { e.preventDefault(); onResize(max); return }
    if (!grow) return
    e.preventDefault()
    const next = height + grow * RESIZE_KEY_STEP
    if (next < min) onCollapse()
    else onResize(Math.min(max, next))
  }
  return (
    <div
      role="separator" aria-orientation="horizontal" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={height} tabIndex={0}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={onToggle} onKeyDown={key}
      className="flex h-3 shrink-0 cursor-row-resize touch-none select-none items-center justify-center rounded-t-lg border-b border-border-subtle bg-bg-elevated hover:bg-bg focus-visible:bg-bg"
    ><span aria-hidden className="h-1 w-8 rounded-full bg-border" /></div>
  )
}
