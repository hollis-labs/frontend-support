/**
 * Centralized LIFO Layered Escape Stack.
 *
 * Rules:
 * 1. Strict LIFO ordering: the innermost (most recently activated) active layer
 *    owns the Escape key. Priority cannot override activation order without an
 *    explicit scope hierarchy contract.
 * 2. Input-clearing before closing: when focus is inside a clearable input within
 *    the active layer, Escape clears the input first and consumes the event.
 *    Only once the input is clear does a subsequent Escape dismiss the layer.
 * 3. Immediate consumption: a handled Escape halts both React bubbling and native
 *    propagation (`stopPropagation()`, `stopImmediatePropagation()`), ensuring
 *    no parent overlay or background query handler receives the event.
 * 4. Stale callback prevention: every layer invocation checks the caller's `live()`
 *    fence; retired callbacks cannot fire.
 */

import { restoreAdmittedFocus, type FocusReturnOptions } from './focus-return'
import { isActiveOverlay, isComposingEvent, OVERLAY_SELECTOR } from './keyboard-guards'

export type EscapeHandlingAction = 'cleared' | 'closed' | 'ignored'

export interface LayeredEscapeRegistration {
  id: string
  scopeId?: string
  priority?: number
  active: boolean
  accessible: boolean
  /** Committed frame fence: must return true for callback to execute. */
  live: () => boolean
  /**
   * Primary Escape handler.
   * Return 'cleared' if an input was cleared, 'closed' if dismissed,
   * or true to indicate the event was fully consumed. Return false or 'ignored'
   * if unhandled.
   */
  onEscape: (event: KeyboardEvent) => EscapeHandlingAction | boolean | void
  /** Optional input clear hook to attempt before layer dismissal. */
  onClearInput?: () => boolean
  /** Optional focus return configuration for when the layer closes. */
  focusReturn?: FocusReturnOptions
  /** Monotonic activation sequence number representing render/activation order. */
  activationSeq?: number
  /** Explicit current controller ownership of a composite popup; other overlays still veto. */
  ownsOverlay?: (overlay: Element) => boolean
  /** Root DOM element of the layer, if available, for scope/containment checks. */
  rootElement?: HTMLElement | null | (() => HTMLElement | null)
}

export class EscapeStack {
  private layers: LayeredEscapeRegistration[] = []
  private listenerAttached = false
  private boundHandler: (e: KeyboardEvent) => void

  constructor() {
    this.boundHandler = this.handleKeyDown.bind(this)
  }

  /** Register or update a layer in the stack. */
  register(layer: LayeredEscapeRegistration): () => void {
    const existingIndex = this.layers.findIndex((l) => l.id === layer.id)
    if (existingIndex >= 0) {
      // Update in place if already present to preserve stack position unless active state changed
      const wasActive = this.layers[existingIndex].active
      this.layers[existingIndex] = layer
      if (!wasActive && layer.active) {
        // Moved from inactive to active -> push to top of LIFO stack
        this.layers.splice(existingIndex, 1)
        this.layers.push(layer)
      }
    } else if (layer.active) {
      this.layers.push(layer)
    }

    // Portalled popup refs can connect after the owning hook commits. Keep the
    // coordinator attached for declared live layers; dispatch checks the root.
    if (this.layers.some((l) => l.active && l.accessible && l.live())) {
      this.ensureListener()
    } else {
      this.removeListener()
    }

    return () => {
      this.unregister(layer.id)
    }
  }

  /** Unregister a layer by ID. */
  unregister(id: string): void {
    const index = this.layers.findIndex((l) => l.id === id)
    if (index >= 0) {
      this.layers.splice(index, 1)
    }
    if (!this.layers.some((l) => l.active && l.accessible && l.live())) {
      this.removeListener()
    }
  }

  /** Retrieve all currently active, accessible, and live layers in LIFO order. */
  getActiveLayers(): LayeredEscapeRegistration[] {
    return this.layers.filter((l) => {
      if (!l.active || !l.accessible || !l.live()) return false
      if (l.rootElement === undefined) return true
      const root = typeof l.rootElement === 'function' ? l.rootElement() : l.rootElement
      return root instanceof HTMLElement && root.isConnected
    })
  }

  /** Retrieve the topmost (innermost) active layer, respecting DOM containment, scope priority and LIFO order. */
  getTopLayer(target?: EventTarget | null): LayeredEscapeRegistration | null {
    void target // Ownership follows the top layer, never the background event target.
    const active = this.getActiveLayers()
    if (active.length === 0) return null

    // Innermost registered DOM root wins, then activation order. Focus in an
    // outer layer must never let it bypass an active inner overlay.
    active.sort((a, b) => {
      const rootA = typeof a.rootElement === 'function' ? a.rootElement() : a.rootElement
      const rootB = typeof b.rootElement === 'function' ? b.rootElement() : b.rootElement
      if (rootA instanceof Element && rootB instanceof Element && rootA !== rootB) {
        if (rootA.contains(rootB)) return -1
        if (rootB.contains(rootA)) return 1
      }
      if (
        a.activationSeq !== undefined &&
        b.activationSeq !== undefined &&
        a.activationSeq !== b.activationSeq
      ) {
        return a.activationSeq - b.activationSeq
      }
      if (a.scopeId && a.scopeId === b.scopeId && (a.priority ?? 0) !== (b.priority ?? 0)) {
        return (a.priority ?? 0) - (b.priority ?? 0)
      }
      return this.layers.indexOf(a) - this.layers.indexOf(b)
    })
    return active[active.length - 1]
  }

  /** Check if any active overlay currently owns keyboard focus/shortcuts. */
  hasActiveLayer(): boolean {
    return this.getActiveLayers().length > 0
  }

  /** Dispatch native keydown event through the LIFO stack. */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key !== 'Escape') return false
    if (event.defaultPrevented) return false
    if (isComposingEvent(event)) return false

    const topLayer = this.getTopLayer(event.target)
    if (!topLayer) return false
    const root = typeof topLayer.rootElement === 'function' ? topLayer.rootElement() : topLayer.rootElement
    if (root instanceof HTMLElement) {
      if (!root.isConnected || root.hasAttribute('data-nested-dialog-open')) return false
      const target = event.target
      if (target instanceof Element) {
        const dialog = target.closest('[role="dialog"], [role="alertdialog"]')
        if (dialog && dialog !== root && !dialog.contains(root)) return false
      }
      // A visible unregistered popup also owns Escape, including a portal sibling.
      if (Array.from(root.ownerDocument.querySelectorAll(OVERLAY_SELECTOR)).some(overlay =>
        overlay !== root && !overlay.contains(root) && isActiveOverlay(overlay) &&
            !topLayer.ownsOverlay?.(overlay) &&
            !this.getActiveLayers().some(layer => layer.id !== topLayer.id &&
              (typeof layer.rootElement === 'function' ? layer.rootElement() : layer.rootElement) === overlay))) return false
    }

    // 1. Try input clearing first if layer declared an input clear hook
    if (topLayer.onClearInput && topLayer.onClearInput()) {
      event.preventDefault()
      event.stopPropagation()
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation()
      }
      return true
    }

    // 2. Dispatch to layer's onEscape handler
    const result = topLayer.onEscape(event)
    const handled = result === true || result === 'cleared' || result === 'closed'

    if (handled) {
      event.preventDefault()
      event.stopPropagation()
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation()
      }

      // 3. If closed and focus return options are present, restore focus
      if (result === 'closed' || result === true) {
        if (topLayer.focusReturn) {
          restoreAdmittedFocus(topLayer.focusReturn)
        }
      }
    }

    return handled
  }

  private ensureListener(): void {
    if (this.listenerAttached) return
    if (typeof window === 'undefined') return
    // Bubble phase allows nested inputs and Base UI components to process Escape first
    window.addEventListener('keydown', this.boundHandler, false)
    this.listenerAttached = true
  }

  private removeListener(): void {
    if (!this.listenerAttached) return
    if (typeof window === 'undefined') return
    window.removeEventListener('keydown', this.boundHandler, false)
    this.listenerAttached = false
  }

  /** Clear all registrations (useful for test teardown). */
  reset(): void {
    this.layers = []
    this.removeListener()
  }
}

/** Global default escape stack instance. */
export const defaultEscapeStack = new EscapeStack()
