import { useLayoutEffect, useRef, type HTMLAttributes } from 'react'

export interface ControlledRecordNavigationOptions {
  /** Caller-admitted ordered identifiers; no fetching or persistence. */
  orderedIds: readonly string[]
  selectedId: string | null
  active: boolean
  accessible: boolean
  sourceGeneration: unknown
  boundaryPolicy: 'wrap' | 'stop'
  onSelect: (id: string) => void
}

export interface ControlledRecordNavigation {
  /** Zero-based index, or -1 when selection is outside the admitted order. */
  position: number
  availability: { previous: boolean; next: boolean }
  navigate: (direction: -1 | 1) => boolean
  /** Attach to the popup itself; keydown must remain in the bubble phase. */
  popupHandlers: Pick<HTMLAttributes<HTMLElement>, 'onKeyDown' | 'onCompositionStartCapture' | 'onCompositionEndCapture'>
}

const nativeOwner = 'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="spinbutton"], [role="tablist"], [role="tab"], [role="menu"], [role="menuitem"], [role="listbox"], [role="option"], [role="tree"], [role="treeitem"], [role="grid"], [role="radiogroup"], [role="radio"]'
const overlays = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

/** Controlled record navigation. Each render retires all earlier callbacks. */
export function useControlledRecordNavigation(options: ControlledRecordNavigationOptions): ControlledRecordNavigation {
  const { selectedId, active, accessible, boundaryPolicy, onSelect } = options
  // Snapshot caller order so subsequent in-place mutation cannot change a callback.
  const ids = [...options.orderedIds]
  const mounted = useRef(false)
  const composing = useRef(false)
  const frame = {}
  const currentFrame = useRef(frame)
  useLayoutEffect(() => { currentFrame.current = frame })
  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useLayoutEffect(() => { composing.current = false }, [active, options.sourceGeneration])
  const position = selectedId === null ? -1 : ids.indexOf(selectedId)
  const admitted = active && accessible && position >= 0 && ids.length > 1
  const availability = {
    previous: admitted && (boundaryPolicy === 'wrap' || position > 0),
    next: admitted && (boundaryPolicy === 'wrap' || position < ids.length - 1),
  }
  const live = () => mounted.current && currentFrame.current === frame
  function navigate(direction: -1 | 1): boolean {
    if (!live() || !(direction === -1 ? availability.previous : availability.next)) return false
    onSelect(ids[(position + direction + ids.length) % ids.length])
    return true
  }
  return {
    position,
    availability,
    navigate,
    popupHandlers: {
      onCompositionStartCapture: () => { if (live()) composing.current = true },
      onCompositionEndCapture: () => { if (live()) composing.current = false },
      onKeyDown: (event) => {
        const root = event.currentTarget
        const target = event.target
        const ElementType = root.ownerDocument.defaultView?.Element
        if (!live() || !active || !accessible || event.defaultPrevented ||
          (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
          event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || composing.current ||
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
          !ElementType || !(target instanceof ElementType) || !root.contains(target) ||
          target.closest('[role="dialog"], [role="alertdialog"]') !== root ||
          root.hasAttribute('data-nested-dialog-open') || target.closest(nativeOwner) ||
          Array.from(root.ownerDocument.querySelectorAll(overlays)).some(overlay =>
            overlay !== root && !overlay.contains(root) && overlay.getClientRects().length > 0)) return
        const direction = event.key === 'ArrowLeft' ? -1 : 1
        if (!(direction === -1 ? availability.previous : availability.next)) return
        event.preventDefault()
        navigate(direction)
      },
    },
  }
}
