/**
 * List + detail page parts (SF-6 gaps 1-5): split pane, select mode, bulk action bar, review-changes bar and diff,
 * outline-anchor nav. Presentational and controlled: the host page owns the data and submits actions through the gateway.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Button, Checkbox, TONE_CLASSES, cn } from '@hollis-labs/design-components'

/* ---- 1. master-detail split pane ---- */

export interface SplitPaneProps {
  list: ReactNode
  detail: ReactNode
  /** Narrow: one pane at a time, the detail as its own page with a back link. */
  narrow?: boolean
  /** Whether a record is open. Narrow shows the detail only when it is. */
  detailOpen?: boolean
  onBack?: () => void
  backLabel?: string
  /** Initial share of the width for the list, in percent. */
  initialListPercent?: number
}

const MIN_PERCENT = 25
const MAX_PERCENT = 75
const STEP_PERCENT = 5

export function SplitPane({ list, detail, narrow = false, detailOpen = true, onBack, backLabel = 'Back', initialListPercent = 52 }: SplitPaneProps) {
  const [percent, setPercent] = useState(initialListPercent)
  const host = useRef<HTMLDivElement>(null)
  const clamp = (n: number) => Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, n))
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPercent(p => clamp(p - STEP_PERCENT)) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setPercent(p => clamp(p + STEP_PERCENT)) }
  }
  const onPointerDown = (e: MouseEvent) => {
    e.preventDefault()
    const rect = host.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const move = (ev: globalThis.MouseEvent) => setPercent(clamp(((ev.clientX - rect.left) / rect.width) * 100))
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }
  if (narrow) {
    if (!detailOpen) return <div data-split="list" className="flex min-h-0 flex-1 flex-col">{list}</div>
    return (
      <div data-split="detail" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border-subtle px-4 py-2.5">
          <Button type="button" variant="link" size="sm" onClick={onBack}>{backLabel}</Button>
        </div>
        {detail}
      </div>
    )
  }
  return (
    <div ref={host} data-split="two" className="flex min-h-0 flex-1">
      <div data-pane="list" style={{ flexBasis: `${percent}%` }} className="relative flex min-h-0 min-w-0 shrink-0 grow-0 flex-col overflow-auto">{list}</div>
      <div role="separator" aria-orientation="vertical" aria-label="Resize list" aria-valuemin={MIN_PERCENT} aria-valuemax={MAX_PERCENT} aria-valuenow={percent} tabIndex={0}
        onKeyDown={onKey} onMouseDown={onPointerDown} className="w-px shrink-0 cursor-col-resize bg-border-subtle hover:bg-border focus-visible:bg-border" />
      <div data-pane="detail" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">{detail}</div>
    </div>
  )
}

/* ---- 5. select mode ---- */

export interface Selection {
  selecting: boolean
  selected: ReadonlySet<string>
  count: number
  has: (id: string) => boolean
  toggle: (id: string) => void
  selectAll: (ids: readonly string[]) => void
  /** Leaving select mode clears the selection. */
  setSelecting: (on: boolean) => void
  clear: () => void
}

export function useSelection(): Selection {
  const [selecting, setMode] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const toggle = useCallback((id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n }), [])
  const selectAll = useCallback((ids: readonly string[]) => setSelected(new Set(ids)), [])
  const clear = useCallback(() => setSelected(new Set()), [])
  const setSelecting = useCallback((on: boolean) => { setMode(on); if (!on) setSelected(new Set()) }, [])
  return { selecting, selected, count: selected.size, has: id => selected.has(id), toggle, selectAll, setSelecting, clear }
}

/** The header's Select / Done switch. */
export function SelectModeToggle({ selection }: { selection: Selection }) {
  return (
    <Button type="button" variant="outline" size="sm" aria-pressed={selection.selecting} onClick={() => selection.setSelecting(!selection.selecting)}>
      {selection.selecting ? 'Done' : 'Select'}
    </Button>
  )
}

export interface ListRowProps {
  id: string
  /** The primary line. */
  title: ReactNode
  /** The secondary line. */
  subtitle?: ReactNode
  /** Right side: a status, or the row's visible primary action and overflow. */
  trailing?: ReactNode
  /** Open (highlighted) record. */
  current?: boolean
  selection?: Selection
  /** Row activation outside select mode. */
  onOpen?: (id: string) => void
  /** Accessible name for the select checkbox. */
  selectLabel?: string
}

/** A two-line list row. In select mode a checkbox leads and a click toggles; otherwise a click opens. */
export function ListRow({ id, title, subtitle, trailing, current, selection, onOpen, selectLabel }: ListRowProps) {
  const selecting = selection?.selecting ?? false
  const checked = selection?.has(id) ?? false
  const activate = () => (selecting ? selection!.toggle(id) : onOpen?.(id))
  return (
    <div data-row={id} data-current={current ? '' : undefined} aria-current={current ? 'true' : undefined}
      className={cn('flex items-center gap-3 border-b border-border-subtle px-4 py-2.5', current && 'bg-bg-elevated')}>
      {selecting ? <Checkbox checked={checked} onCheckedChange={() => selection!.toggle(id)} aria-label={selectLabel ?? `Select ${id}`} /> : null}
      <button type="button" onClick={activate} className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span className="text-control text-fg">{title}</span>
        {subtitle ? <span className="text-caption text-fg-muted">{subtitle}</span> : null}
      </button>
      {selecting ? null : trailing}
    </div>
  )
}

/* ---- 2. bulk action bar ---- */

export interface BulkAction { id: string; label: string; onAction: (e: MouseEvent<HTMLButtonElement>) => void }

export interface BulkActionBarProps {
  count: number
  actions: readonly BulkAction[]
  /** The one destructive action. It goes last and its handler is expected to confirm. */
  danger?: BulkAction
  /** Unit for the count, e.g. "selected". */
  countLabel?: string
}

/** Floats over the bottom of the list while anything is selected. */
export function BulkActionBar({ count, actions, danger, countLabel = 'selected' }: BulkActionBarProps) {
  if (count === 0) return null
  return (
    <div role="toolbar" aria-label="Bulk actions" className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-fg shadow-lg">
      <span aria-live="polite" className="flex-1 text-caption">{count} {countLabel}</span>
      {actions.map(a => <Button key={a.id} type="button" variant="outline" size="sm" onClick={a.onAction}>{a.label}</Button>)}
      {danger ? <Button type="button" variant="destructive" size="sm" onClick={danger.onAction}>{danger.label}</Button> : null}
    </div>
  )
}

/* ---- 3. review-changes bar and diff ---- */

export interface FieldChange { field: string; before: string; after: string }

export interface ReviewBarProps {
  changes: number
  onDiscard: () => void
  onReview: () => void
  /** A field error blocks the review step. */
  blocked?: boolean
  blockedReason?: string
}

/** "N changes · Discard · Review changes". Absent when nothing changed. */
export function ReviewBar({ changes, onDiscard, onReview, blocked = false, blockedReason }: ReviewBarProps) {
  if (changes === 0) return null
  return (
    <div role="region" aria-label="Unsaved changes" className="flex items-center gap-3 border-t border-border-subtle bg-bg-elevated px-4 py-2.5">
      <span className="text-caption text-fg-muted">{changes} {changes === 1 ? 'change' : 'changes'}</span>
      {blocked && blockedReason ? <span role="note" className="text-caption text-danger">{blockedReason}</span> : null}
      <span className="flex-1" />
      <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>Discard</Button>
      <Button type="button" size="sm" disabled={blocked} onClick={onReview}>Review changes</Button>
    </div>
  )
}

/** Before / after per changed field. */
export function DiffView({ changes }: { changes: readonly FieldChange[] }) {
  return (
    <div role="group" aria-label="Changes" className="flex flex-col gap-3">
      {changes.map(c => (
        <div key={c.field} data-diff={c.field} className="overflow-hidden rounded-md border border-border">
          <p className="px-2.5 py-1.5 text-caption uppercase tracking-label text-fg-muted">{c.field}</p>
          <p className={cn('px-2.5 py-1 font-mono text-control', TONE_CLASSES.danger)}><span aria-label="Before">- {c.before}</span></p>
          <p className={cn('px-2.5 py-1 font-mono text-control', TONE_CLASSES.success)}><span aria-label="After">+ {c.after}</span></p>
        </div>
      ))}
    </div>
  )
}

export interface ReviewChangesProps {
  changes: readonly FieldChange[]
  /** What saving will do, in the user's terms. */
  effect: string
  onBack: () => void
  onSave: (e: MouseEvent<HTMLButtonElement>) => void
  saving?: boolean
}

/** The review step: the diff, an Effect note, then Save. */
export function ReviewChanges({ changes, effect, onBack, onSave, saving = false }: ReviewChangesProps) {
  return (
    <section aria-label="Review changes" className="flex flex-col gap-3 p-4">
      <h3 className="text-caption uppercase tracking-label text-fg-muted">Review changes</h3>
      <DiffView changes={changes} />
      <div className="rounded-lg border border-border bg-bg-elevated p-3">
        <h4 className="text-caption uppercase tracking-label text-fg-muted">Effect</h4>
        <p className="text-caption text-fg-secondary">{effect}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>Back to editing</Button>
        <Button type="button" size="sm" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </section>
  )
}

/* ---- 4. outline-anchor nav ---- */

export interface OutlineItem { id: string; label: string }

export interface OutlineNavProps {
  items: readonly OutlineItem[]
  /** The element id of each section is `${scope}-${item.id}` (see `outlineAnchorId`). */
  scope: string
  /** `rail` is the vertical outline beside the content; `strip` the horizontal scroll strip at narrow widths. */
  orientation?: 'rail' | 'strip'
  label?: string
}

export const outlineAnchorId = (scope: string, id: string) => `${scope}-${id}`

/** Scrolls to a section and highlights the one in view. Sections mark themselves with `outlineAnchorId`. */
export function OutlineNav({ items, scope, orientation = 'rail', label = 'Sections' }: OutlineNavProps) {
  const [active, setActive] = useState(items[0]?.id)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      const hit = top && items.find(i => outlineAnchorId(scope, i.id) === top.target.id)
      if (hit) setActive(hit.id)
    }, { threshold: 0.5 })
    for (const i of items) { const el = document.getElementById(outlineAnchorId(scope, i.id)); if (el) io.observe(el) }
    return () => io.disconnect()
  }, [items, scope])
  const go = (id: string) => {
    setActive(id)
    document.getElementById(outlineAnchorId(scope, id))?.scrollIntoView?.({ block: 'start' })
  }
  return (
    <nav aria-label={label} data-orientation={orientation}
      className={cn('flex gap-1 text-control', orientation === 'rail' ? 'w-32 shrink-0 flex-col border-r border-border-subtle p-3' : 'overflow-x-auto border-b border-border-subtle px-4 py-2')}>
      {items.map(i => (
        <button key={i.id} type="button" aria-current={active === i.id ? 'location' : undefined} onClick={() => go(i.id)}
          className={cn('rounded-sm px-1.5 py-0.5 text-left whitespace-nowrap', active === i.id ? 'bg-bg-elevated text-fg' : 'text-fg-muted hover:text-fg')}>{i.label}</button>
      ))}
    </nav>
  )
}
