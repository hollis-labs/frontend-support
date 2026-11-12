import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  /** Accessible label for the input. */
  ariaLabel?: string
  /** Debounce window before `onChange` fires, in ms. */
  debounceMs?: number
  /** Bind `/` (when not already typing) to focus this input. Default: true. */
  slashToFocus?: boolean
  /** Whether to retain focus when clearing non-empty query with Escape. Default: false (blur on clear). */
  retainFocusOnClear?: boolean
  /** Opt into immediate, consumed Escape clearing for layered overlays. Default: false. */
  layeredEscape?: boolean
}

const DEFAULT_DEBOUNCE_MS = 250

import { isComposingEvent, isEditableTarget, hasActiveModalOverlay } from '../lib/keyboard-guards'
import { defaultEscapeStack } from '../lib/escape-stack'

/**
 * Debounced search field with optional `/`-to-focus and Esc-to-clear.
 *
 * RENAMED from sysop-ui's `FilterSearchInput`, and RECOVERED from a directory
 * CW-0125 expected to move whole. CW-0116 read it as base on the merits: the
 * valuable part is idiom-free behaviour — debounced emit, `/`-to-focus with
 * editable-target guards, Esc-to-clear, and an echo-suppressing controlled sync
 * that adjusts state during render rather than in an effect. kit-chat wants all
 * of that unchanged. `FilterBar` stays in kit-dashboard and imports this, which
 * is a normal direction.
 *
 * The band chrome went with the rename: sysop-ui wrapped it in `bg-panel-2/50`
 * sized to sit inside the filter bar. Base renders the control, not the band.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  ariaLabel = 'Search',
  debounceMs = DEFAULT_DEBOUNCE_MS,
  slashToFocus = true,
  retainFocusOnClear = false,
  layeredEscape = false,
}: SearchInputProps) {
  const [local, setLocal] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Mirror an externally-changed `value` into local state. Done as an
  // adjust-state-during-render rather than an effect.
  if (syncedValue !== value) {
    setSyncedValue(value)
    setLocal(value)
  }

  // Debounced emit. Skipped while `local` is already in sync with the prop,
  // so an externally-driven `value` change never echoes back through onChange.
  useEffect(() => {
    if (local === value) return
    const handle = setTimeout(() => onChange(local), debounceMs)
    return () => clearTimeout(handle)
  }, [local, value, onChange, debounceMs])

  useEffect(() => {
    if (!slashToFocus) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/') return
      if (e.ctrlKey || e.metaKey || e.altKey || (layeredEscape && e.shiftKey)) return
      if (e.defaultPrevented) return
      if (layeredEscape && isComposingEvent(e)) return
      if (layeredEscape && defaultEscapeStack.hasActiveLayer()) return
      if (layeredEscape && hasActiveModalOverlay(document)) return
      const active = document.activeElement
      if (layeredEscape) {
        if (isEditableTarget(active) || isEditableTarget(e.target)) return
      } else if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slashToFocus, layeredEscape])

  return (
    <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded border border-border bg-bg-elevated/50 px-2.5 py-1 focus-within:border-border">
      <Search className="h-3.5 w-3.5 text-fg-faint" />
      <input
        ref={inputRef}
        type="search"
        aria-label={ariaLabel}
        title={
          slashToFocus
            ? `${ariaLabel} (press / to focus, Esc to clear)`
            : `${ariaLabel} (Esc to clear)`
        }
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (!layeredEscape && !retainFocusOnClear) {
            if (e.key === 'Escape') {
              setLocal('')
              inputRef.current?.blur()
            }
            return
          }
          if (e.key === 'Escape' && !isComposingEvent(e)) {
            if (local !== '') {
              e.preventDefault()
              e.stopPropagation()
              if (typeof e.nativeEvent?.stopImmediatePropagation === 'function') {
                e.nativeEvent.stopImmediatePropagation()
              }
              setLocal('')
              onChange('')
              if (!retainFocusOnClear) {
                inputRef.current?.blur()
              }
            } else {
              inputRef.current?.blur()
            }
          }
        }}
        className="flex-1 bg-transparent text-xs text-fg placeholder:text-fg-faint/70 focus:outline-none"
      />
      {slashToFocus ? (
        <kbd className="rounded border border-border bg-bg px-1 text-micro uppercase tracking-wider text-fg-faint">
          /
        </kbd>
      ) : null}
    </div>
  )
}
