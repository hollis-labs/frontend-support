import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import type { DialogOptions } from '../hooks/use-dialog-options'
import { defaultEscapeStack } from '../lib/escape-stack'
import { useLayeredEscape } from '../hooks/use-layered-escape'
import { useCommittedShortcutFrame } from '../hooks/use-committed-shortcut-frame'
import { isActiveOverlay, isComposingEvent, OVERLAY_SELECTOR } from '../lib/keyboard-guards'

export interface SearchPaletteOption { id: string; label: ReactNode; disabled?: boolean }
export interface SearchPaletteFilter { id: string; label: string }
export interface SearchPaletteProps extends DialogOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  query: string
  onQueryChange: (query: string) => void
  /** Debounced notification only; caller owns search and rejects stale async responses. */
  onSearch?: (query: string, sourceGeneration: unknown) => void
  debounceMs?: number
  options: readonly SearchPaletteOption[]
  onSelect: (id: string) => void
  filters?: readonly SearchPaletteFilter[]
  filterId?: string
  onFilterChange?: (id: string) => void
  sourceGeneration: unknown
  accessible?: boolean
  isAdmitted?: () => boolean
  emptyLabel?: string
}

/** Controlled combobox palette. Query input owns focus; host owns data and actions. */
export function SearchPalette({ open, onOpenChange, title = 'Search', query, onQueryChange,
  onSearch, debounceMs = 150, options, onSelect, filters = [], filterId, onFilterChange,
  sourceGeneration, accessible = true, isAdmitted, emptyLabel = 'No results', ...dialogOptions }: SearchPaletteProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const composing = useRef(false)
  const live = useCommittedShortcutFrame()
  const [cursor, setCursor] = useState<string | null>(null)
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- an opening or source/filter replacement starts a new cursor projection
    setCursor(null)
  }, [open, sourceGeneration, filterId])
  const enabledOptions = options.filter(option => !option.disabled)
  const activeId = enabledOptions.some(option => option.id === cursor) ? cursor : enabledOptions[0]?.id ?? null
  const admitted = () => live() && open && accessible && (!isAdmitted || isAdmitted())
  const ownsResults = (overlay: Element) => admitted() && overlay.id === `${id}-results` && overlay.getAttribute('role') === 'listbox' &&
    Boolean(popup.current?.contains(overlay)) && input.current?.getAttribute('aria-controls') === overlay.id
  const layer = useLayeredEscape({ active: open, accessible, sourceGeneration,
    rootElement: () => popup.current, isLayerAdmitted: admitted,
    ownsOverlay: ownsResults,
    onClearInput: () => {
      if (!admitted() || composing.current || !query || document.activeElement !== input.current) return false
      onQueryChange('')
      return true
    },
    onEscape: () => {
      if (!admitted() || composing.current) return false
      onOpenChange(false)
      return 'closed'
    },
  })
  const ownsKeyboard = () => {
    const root = popup.current
    return admitted() && layer.isTopmost() && Boolean(root?.isConnected) && !root?.hasAttribute('data-nested-dialog-open') &&
      !Array.from(root!.ownerDocument.querySelectorAll(OVERLAY_SELECTOR)).some(overlay =>
        overlay !== root && !overlay.contains(root) && isActiveOverlay(overlay) && !ownsResults(overlay) &&
          !defaultEscapeStack.getActiveLayers().some(registration => registration.id !== layer.layerId &&
            (typeof registration.rootElement === 'function' ? registration.rootElement() : registration.rootElement) === overlay))
  }
  useEffect(() => {
    if (!open || !accessible || !onSearch) return
    const timer = setTimeout(() => { if (ownsKeyboard() && !composing.current) onSearch(query, sourceGeneration) }, Math.max(0, debounceMs))
    return () => clearTimeout(timer)
  })
  useEffect(() => {
    if (!open) composing.current = false
  }, [open])
  useEffect(() => {
    if (activeId !== null) popup.current?.ownerDocument.getElementById(`${id}-option-${activeId}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [id, activeId])
  const select = (optionId: string) => {
    if (ownsKeyboard() && enabledOptions.some(option => option.id === optionId)) onSelect(optionId)
  }
  return <Dialog open={open} onOpenChange={(next, details) => {
    if (!ownsKeyboard() || composing.current || (details.event && isComposingEvent(details.event as KeyboardEvent))) { details.cancel(); return }
    if (details.reason === 'escape-key') {
      details.cancel()
      layer.handleEscape(details.event as KeyboardEvent)
      return
    }
    onOpenChange(next)
  }}>
    <DialogContent {...dialogOptions} ref={popup} initialFocus={dialogOptions.initialFocus ?? input}
      widthClassName="max-w-2xl" className="flex max-h-[calc(100dvh-var(--spacing)*8)] flex-col gap-3 overflow-hidden"
      onCompositionStartCapture={() => { if (live()) composing.current = true }}
      onCompositionEndCapture={() => { if (live()) composing.current = false }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && admitted() && !composing.current && !isComposingEvent(event)) layer.handleEscape(event.nativeEvent)
      }}>
      <DialogTitle className="pr-20">{title}</DialogTitle>
      <input ref={input} role="combobox" aria-label="Search query" aria-expanded={open} aria-haspopup="listbox" aria-autocomplete="list"
        aria-controls={`${id}-results`} aria-activedescendant={activeId === null ? undefined : `${id}-option-${activeId}`}
        className="h-10 shrink-0 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={query} onChange={event => { if (admitted()) { setCursor(null); onQueryChange(event.target.value) } }}
        onKeyDown={event => {
          if (!ownsKeyboard() || event.defaultPrevented || composing.current || isComposingEvent(event) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); event.stopPropagation()
            const position = enabledOptions.findIndex(option => option.id === activeId)
            const next = Math.max(0, Math.min(enabledOptions.length - 1, position + (event.key === 'ArrowDown' ? 1 : -1)))
            setCursor(enabledOptions[next]?.id ?? null)
          } else if (event.key === 'Enter' && activeId !== null) {
            event.preventDefault(); event.stopPropagation(); select(activeId)
          }
        }} />
      {filters.length > 0 && <div role="radiogroup" aria-label="Filter result types" className="flex shrink-0 flex-wrap gap-2">
        {filters.map((filter, index) => <button key={filter.id} type="button" role="radio" aria-checked={(filterId ?? filters[0]?.id) === filter.id}
          tabIndex={(filterId ?? filters[0]?.id) === filter.id ? 0 : -1} className="rounded-md border border-border px-3 py-1 text-sm text-fg hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => { if (ownsKeyboard()) { setCursor(null); onFilterChange?.(filter.id) } }}
          onKeyDown={event => {
            if (!ownsKeyboard() || composing.current || isComposingEvent(event) || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
            event.preventDefault(); event.stopPropagation()
            const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + filters.length) % filters.length
            setCursor(null); onFilterChange?.(filters[next].id)
            ;(event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus()
          }}>{filter.label}</button>)}
      </div>}
      <div id={`${id}-results`} role="listbox" aria-label="Search results" className="min-h-0 flex-1 overflow-auto">
        {options.map(option => <div key={option.id} id={`${id}-option-${option.id}`} role="option" aria-selected={option.id === activeId} aria-disabled={option.disabled || undefined}
          className="cursor-default rounded-md px-3 py-2 text-sm text-fg aria-selected:bg-surface-hover aria-disabled:opacity-50"
          onPointerDown={event => event.preventDefault()} onClick={() => select(option.id)}>{option.label}</div>)}
        {options.length === 0 && <p className="px-3 py-2 text-sm text-fg-muted">{emptyLabel}</p>}
      </div>
    </DialogContent>
  </Dialog>
}
