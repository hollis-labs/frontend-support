import { useCommittedShortcutFrame } from './use-committed-shortcut-frame'
import { useId, useLayoutEffect, useRef } from 'react'
import {
  defaultEscapeStack,
  type EscapeHandlingAction,
  type EscapeStack,
} from '../lib/escape-stack'
import type { FocusReturnOptions } from '../lib/focus-return'

export interface UseLayeredEscapeOptions {
  /** Whether this layer is currently open/active in the stack. */
  active: boolean
  /** Whether the layer is accessible (e.g. not disabled or inert). Default: true. */
  accessible?: boolean
  /** Scope identifier to group nested layers. */
  scopeId?: string
  /** Priority tier for tie-breaking within identical activation frames. Default: 0. */
  priority?: number
  /**
   * Primary Escape handler.
   * Return 'cleared' when clearing an internal input, 'closed' when dismissing,
   * or boolean true if handled.
   */
  onEscape: (event: KeyboardEvent) => EscapeHandlingAction | boolean | void
  /**
   * Optional hook to clear an active search/filter input prior to closing.
   * Returns true if input was cleared (consuming Escape), false otherwise.
   */
  onClearInput?: () => boolean
  /** The element that opened this layer, for admitted focus return. */
  trigger?: HTMLElement | null | (() => HTMLElement | null)
  /** Caller-owned admission predicate for focus return. */
  isAdmitted?: (trigger: HTMLElement) => boolean
  /** Fallback element if trigger is disconnected or unadmitted. */
  fallbackReturnTarget?: HTMLElement | null | (() => HTMLElement | null)
  /** Root element of the layer for containment checks. */
  /** Explicit composite popup ownership, checked on each dispatch. */
  ownsOverlay?: (overlay: Element) => boolean
  rootElement?: HTMLElement | null | (() => HTMLElement | null)
  /** Optional custom EscapeStack instance (defaults to defaultEscapeStack). */
  escapeStack?: EscapeStack
  /** Source generation token to invalidate stale registrations. */
  sourceGeneration?: unknown
  /** Current source/selection admission, separate from focus-return admission. */
  isLayerAdmitted?: () => boolean
}

export interface UseLayeredEscapeResult {
  /** Unique ID assigned to this layer registration. */
  layerId: string
  /** Whether this layer is currently the topmost active layer in the stack. */
  isTopmost: () => boolean
  /** Programmatically dispatch Escape to this layer if live. */
  handleEscape: (event?: KeyboardEvent) => boolean
}

let globalActivationSeq = 0

export function useLayeredEscape(options: UseLayeredEscapeOptions): UseLayeredEscapeResult {
  const {
    active,
    accessible = true,
    scopeId,
    priority = 0,
    onEscape,
    onClearInput,
    trigger,
    isAdmitted,
    fallbackReturnTarget,
    rootElement,
    escapeStack = defaultEscapeStack,
  } = options

  const layerId = useId()
  const live = useCommittedShortcutFrame()
  const seqRef = useRef<number | null>(null)

  // eslint-disable-next-line react-hooks/refs -- sequence must be captured in render order so child renders after parent take precedence
  if (active && seqRef.current === null) {
    seqRef.current = ++globalActivationSeq
  } else if (!active) {
    // eslint-disable-next-line react-hooks/refs -- sequence must be reset when layer becomes inactive
    seqRef.current = null
  }

  useLayoutEffect(() => () => escapeStack.unregister(layerId), [layerId, escapeStack])

  const focusReturn: FocusReturnOptions = {
    trigger,
    isAdmitted,
    fallbackTarget: fallbackReturnTarget,
  }

  // Refresh registration on every committed render to preserve current frame token
  // across stable-prop rerenders without changing LIFO stack position
  useLayoutEffect(() => {
    escapeStack.register({
      id: layerId,
      scopeId,
      priority,
      active,
      accessible,
      activationSeq: seqRef.current ?? 0,
      live: () => live() && (!options.isLayerAdmitted || options.isLayerAdmitted()),
      onEscape: (e) => {
        if (!live()) return false
        return onEscape(e)
      },
      onClearInput: () => {
        if (!live() || !onClearInput) return false
        return onClearInput()
      },
      focusReturn,
      rootElement,
      ownsOverlay: options.ownsOverlay,
    })
  })

  return {
    layerId,
    isTopmost: () => {
      const top = escapeStack.getTopLayer()
      return live() && Boolean(top && top.id === layerId)
    },
    handleEscape: (event?: KeyboardEvent) => {
      if (!live() || !active || !accessible || (options.isLayerAdmitted && !options.isLayerAdmitted())) return false
      const root = typeof rootElement === 'function' ? rootElement() : rootElement
      const e = event ?? new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      if (!event && root) Object.defineProperty(e, 'target', { value: root })
      if (escapeStack.getTopLayer(e.target)?.id !== layerId) return false
      return escapeStack.handleKeyDown(e)
    },
  }
}
