import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { cn } from '@hollis-labs/design-components'

export interface ResizableChatPanelProps extends ComponentProps<'aside'> {
  width: number
  onWidthChange: (width: number) => void
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  resizeLabel?: string
}

/** Right-edge panel geometry. The host owns placement, open state and persistence. */
export function ResizableChatPanel({ width, onWidthChange, minWidth = 360, maxWidth = 960, defaultWidth = 480, resizeLabel = 'Resize chat panel', className, style, children, ...props }: ResizableChatPanelProps) {
  const [viewport, setViewport] = useState(() => typeof window === 'undefined' ? maxWidth : window.innerWidth)
  const drag = useRef<{ x: number; width: number } | null>(null)
  useEffect(() => {
    const resize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const max = Math.min(maxWidth, viewport)
  const min = Math.min(minWidth, max)
  const clamp = (next: number) => Math.round(Math.max(min, Math.min(max, Number.isFinite(next) ? next : defaultWidth)))
  const actual = clamp(width)
  return (
    <aside {...props} className={cn('relative flex min-h-0 max-w-full flex-col border-l border-border bg-bg text-fg shadow-xl', className)} style={{ ...style, width: actual }}>
      <div role="separator" aria-label={resizeLabel} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={actual} aria-valuetext={`${actual} pixels`} tabIndex={0}
        className="absolute inset-y-0 -left-1 z-10 w-2 touch-none cursor-col-resize hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        title="Drag to resize · Arrow keys to adjust · Double-click to reset"
        onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); drag.current = { x: e.clientX, width: actual }; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={e => { if (drag.current) onWidthChange(clamp(drag.current.width + drag.current.x - e.clientX)) }}
        onPointerUp={e => { drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId) }}
        onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
        onDoubleClick={() => onWidthChange(clamp(defaultWidth))}
        onKeyDown={e => {
          const step = e.shiftKey ? 64 : 16
          const next = e.key === 'ArrowLeft' ? actual + step : e.key === 'ArrowRight' ? actual - step : e.key === 'Home' ? min : e.key === 'End' ? max : null
          if (next !== null) { e.preventDefault(); onWidthChange(clamp(next)) }
        }} />
      {children}
    </aside>
  )
}
