import { useContext, createContext, useLayoutEffect, useState, useRef, useCallback, type Ref } from 'react'
import type { Dialog } from '@base-ui/react/dialog'
import { useCommittedShortcutFrame } from './use-committed-shortcut-frame'
import { resolveAdmittedFocusTarget, type FocusReturnOptions } from '../lib/focus-return'
import { defaultEscapeStack } from '../lib/escape-stack'
import { isActiveOverlay, OVERLAY_SELECTOR } from '../lib/keyboard-guards'

/** Root open state shared with popup chrome; Base UI still owns modality and focus. */
export const DialogOpenContext = createContext(false)

export interface DialogOptions {
  /** Show an expand/collapse control. Existing dialogs remain bounded by default. */
  showFullscreenToggle?: boolean
  /** Controlled fullscreen state; omit for reset-on-open internal state. */
  fullscreen?: boolean
  onFullscreenChange?: (fullscreen: boolean) => void
  /** Opt-in sessionStorage key. Invalid or denied storage falls back to bounded. */
  fullscreenSessionKey?: string
  initialFocus?: Dialog.Popup.Props['initialFocus']
  finalFocus?: Dialog.Popup.Props['finalFocus']
  /** Explicit admitted return policy. Takes precedence over native finalFocus. */
  returnFocus?: FocusReturnOptions
}

function readPreference(key?: string) {
  try { return key !== undefined && sessionStorage.getItem(key) === 'true' } catch { return false }
}

// Ref assignment belongs to React's commit callback, including React 19 cleanup.
function assignPopupRef(ref: Ref<HTMLDivElement> | undefined, node: HTMLDivElement | null) {
  if (typeof ref === 'function') return ref(node)
  if (ref) ref.current = node
}

export function useDialogOptions(options: DialogOptions, forwardedRef?: Ref<HTMLDivElement>) {
  const popup = useRef<HTMLDivElement | null>(null)
  const lastPopup = useRef<HTMLDivElement | null>(null)
  const popupRef = useCallback((node: HTMLDivElement | null) => {
    popup.current = node
    if (node) lastPopup.current = node
    const cleanup = assignPopupRef(forwardedRef, node)
    if (typeof cleanup === 'function') return () => { popup.current = null; cleanup() }
  }, [forwardedRef])
  const open = useContext(DialogOpenContext)
  const live = useCommittedShortcutFrame()
  const [expanded, setExpanded] = useState(() => readPreference(options.fullscreenSessionKey))
  useLayoutEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize an external session preference on each opening
      setExpanded(readPreference(options.fullscreenSessionKey))
    }
  }, [open, options.fullscreenSessionKey])
  const fullscreen = options.fullscreen ?? expanded
  return {
    popupRef,
    fullscreen,
    toggle: () => {
      const root = popup.current
      if (!live() || !open || !root?.isConnected || root.hasAttribute('data-closed') ||
        root.closest('[hidden], [inert], [aria-hidden="true"]') || root.hasAttribute('data-nested-dialog-open')) return
      const top = defaultEscapeStack.getTopLayer()
      const topRoot = typeof top?.rootElement === 'function' ? top.rootElement() : top?.rootElement
      if (Array.from(root.ownerDocument.querySelectorAll(OVERLAY_SELECTOR)).some(overlay =>
        overlay !== root && !overlay.contains(root) && isActiveOverlay(overlay) &&
        !(topRoot === root && (top?.ownsOverlay?.(overlay) ||
          defaultEscapeStack.getActiveLayers().some(layer => layer.id !== top?.id &&
            (typeof layer.rootElement === 'function' ? layer.rootElement() : layer.rootElement) === overlay))))) return
      const next = !fullscreen
      if (options.fullscreen === undefined) setExpanded(next)
      try {
        if (options.fullscreenSessionKey !== undefined) sessionStorage.setItem(options.fullscreenSessionKey, String(next))
      } catch { /* Session persistence is optional, including in restricted browsers. */ }
      options.onFullscreenChange?.(next)
    },
    finalFocus: options.returnFocus === undefined ? options.finalFocus : () => {
      // Base UI invokes finalFocus during cleanup, before its aria-hidden lease
      // is released. Resolve current admission after that cleanup, never cache
      // a target while the page is still hidden. Ordinary unmount retires live.
      const root = lastPopup.current
      queueMicrotask(() => {
        if (!live() || open) return
        const target = resolveAdmittedFocusTarget(options.returnFocus!)
        if (!target) return
        const foreground = target.ownerDocument.activeElement
        if (foreground instanceof HTMLElement && foreground.isConnected &&
          foreground !== target && foreground !== target.ownerDocument.body &&
          foreground !== target.ownerDocument.documentElement && !root?.contains(foreground)) return
        // A newly active sibling owns focus; returning into an admitted parent
        // remains valid when a nested modal closes.
        if (Array.from(target.ownerDocument.querySelectorAll(OVERLAY_SELECTOR)).some(overlay =>
          isActiveOverlay(overlay) && !overlay.contains(target))) return
        target.focus({ preventScroll: true })
      })
      return false
    },
  }
}
