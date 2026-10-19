import { useKeyboardComposition } from './use-keyboard-composition'
import { useCommittedShortcutFrame } from './use-committed-shortcut-frame'
import { useLayoutEffect, useRef } from 'react'
import { defaultEscapeStack, type EscapeStack } from '../lib/escape-stack'
import {
  hasActiveModalOverlay,
  isComposingEvent,
  isEditableTarget,
} from '../lib/keyboard-guards'

export interface UseShiftShiftOptions {
  /** Callback fired upon two consecutive Shift presses within the threshold. */
  onTrigger: () => void
  /** Double-tap window in milliseconds. Default: 300ms per DEC-079 Nil spec. */
  thresholdMs?: number
  /** Whether the listener is active. Default: true. */
  enabled?: boolean
  /** Time provider function for deterministic testing without Date.now(). */
  getTime?: () => number
  /** Whether to suppress inside editable inputs. Default: true. */
  preventInEditable?: boolean
  /** Whether to suppress during IME composition. Default: true. */
  preventInIME?: boolean
  /** Suspend shortcut when an active modal overlay owns keyboard focus. Default: true. */
  preventWhenOverlayActive?: boolean
  /** Optional custom EscapeStack to check for active overlay ownership. */
  escapeStack?: EscapeStack
  /** Caller-owned admission predicate. If returns false, shortcut is suppressed. */
  isAdmitted?: () => boolean
  /** Whether the shortcut is accessible (not disabled/inert). Default: true. */
  accessible?: boolean
  /** Source generation token to invalidate stale registrations. */
  sourceGeneration?: unknown
  /** Optional caller-owned DOM scope. Events outside this connected root are refused. */
  scopeElement?: HTMLElement | null | (() => HTMLElement | null)
}

export interface UseShiftShiftResult {
  /** Whether the hook is currently mounted and active. */
  isLive: () => boolean
  /** Manually reset the double-tap timer. */
  reset: () => void
  /**
   * Test-only positive/negative control invocation with full admission checks.
   * Returns true if invocation succeeded within live frame, false if retired or unadmitted.
   */
  trigger: () => boolean
}

export function useShiftShift(options: UseShiftShiftOptions): UseShiftShiftResult {
  const { enabled = true } = options

  const live = useCommittedShortcutFrame()
  const composing = useKeyboardComposition(options.sourceGeneration)
  const lastShiftTime = useRef<number | null>(null)
  const latestRef = useRef<{
    options: UseShiftShiftOptions
    live: () => boolean
  }>({
    options,
    live: () => false,
  })

  // Refresh latest handler, options, and live fence on every commit
  useLayoutEffect(() => {
    latestRef.current = {
      options,
      live,
    }
  })

  useLayoutEffect(() => { lastShiftTime.current = null }, [options.sourceGeneration, options.enabled, options.accessible])

  const resolveNow = (customGetTime?: () => number): number => {
    if (customGetTime) return customGetTime()
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now()
    }
    return Date.now()
  }

  useLayoutEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      const current = latestRef.current
      if (!current.live() || current.options.enabled === false) return

      const opts = current.options
      const stack = opts.escapeStack ?? defaultEscapeStack

      // Suppress if active overlay owns keys (escapeStack OR unregistered modal overlay)
      if (
        opts.preventWhenOverlayActive !== false &&
        (stack.hasActiveLayer() || hasActiveModalOverlay())
      ) {
        lastShiftTime.current = null
        return
      }

      if ((opts.isAdmitted && !opts.isAdmitted()) || opts.accessible === false) {
        lastShiftTime.current = null
        return
      }

      // Suppress if default already prevented
      if (event.defaultPrevented) return

      // Shift keydown repeat guard: holding Shift down fires repeated keydown events; ignore them
      if (event.repeat) {
        return
      }

      // Suppress during active IME composition
      if (opts.preventInIME !== false && (composing() || isComposingEvent(event))) {
        lastShiftTime.current = null
        return
      }

      // Suppress when modifiers are held
      if (event.metaKey || event.ctrlKey || event.altKey) {
        lastShiftTime.current = null
        return
      }

      // Suppress in editable targets
      if (opts.preventInEditable !== false && isEditableTarget(event.target)) {
        lastShiftTime.current = null
        return
      }

      const scope = typeof opts.scopeElement === 'function' ? opts.scopeElement() : opts.scopeElement
      if (opts.scopeElement !== undefined && (!scope?.isConnected || !(event.target instanceof Node) || !scope.contains(event.target))) {
        lastShiftTime.current = null
        return
      }

      // Any non-Shift key immediately resets the tap window
      if (event.key !== 'Shift') {
        lastShiftTime.current = null
        return
      }

      const now = resolveNow(opts.getTime)

      // Clock-zero and invalid time controls
      if (!Number.isFinite(now)) {
        lastShiftTime.current = null
        return
      }

      // Backwards clock control: if time jumped backwards, reset window to current time
      if (lastShiftTime.current !== null && now < lastShiftTime.current) {
        lastShiftTime.current = now
        return
      }

      const delta = lastShiftTime.current === null ? Infinity : now - lastShiftTime.current
      const threshold = opts.thresholdMs ?? 300

      if (lastShiftTime.current !== null && delta >= 0 && delta <= threshold) {
        event.preventDefault()
        lastShiftTime.current = null
        opts.onTrigger()
      } else {
        lastShiftTime.current = now
      }
    }

    function handleBlur() {
      lastShiftTime.current = null
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('touchstart', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('touchstart', handleBlur)
      lastShiftTime.current = null
    }
  }, [enabled, composing])

  return {
    isLive: live,
    reset: () => {
      if (!live()) return
      lastShiftTime.current = null
    },
    trigger: (): boolean => {
      if (!live()) return false
      const current = latestRef.current
      if (!current.live() || current.options.enabled === false) return false

      const opts = current.options
      const stack = opts.escapeStack ?? defaultEscapeStack

      if (
        opts.preventWhenOverlayActive !== false &&
        (stack.hasActiveLayer() || hasActiveModalOverlay())
      ) {
        return false
      }

      if (opts.isAdmitted && !opts.isAdmitted()) return false
      if (opts.accessible === false) return false

      const target = typeof document !== 'undefined' ? document.activeElement : null
      if (opts.preventInEditable !== false && isEditableTarget(target)) return false

      if (opts.preventInIME !== false && composing()) return false
      const scope = typeof opts.scopeElement === 'function' ? opts.scopeElement() : opts.scopeElement
      if (opts.scopeElement !== undefined && (!scope?.isConnected || !target || !scope.contains(target))) return false

      opts.onTrigger()
      return true
    },
  }
}

