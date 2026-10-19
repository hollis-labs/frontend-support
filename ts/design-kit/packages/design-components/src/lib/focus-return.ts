/**
 * Focus return resolver with connection, disabled, and caller admission guards.
 *
 * Rules:
 * 1. Focus returns to the opening trigger only if it is currently connected in
 *    the DOM (`trigger.isConnected`), not disabled (`!trigger.matches(':disabled')`),
 *    and admitted by the caller's admission check (`isAdmitted(trigger)`).
 * 2. If the trigger is disconnected, disabled, or fails source admission,
 *    focus falls back to the caller's explicit fallback target.
 * 3. No hidden persistence or uncoordinated global mutations.
 */

export interface FocusReturnOptions {
  /** The element that opened the overlay / layer. */
  trigger?: HTMLElement | null | (() => HTMLElement | null)
  /** Caller-owned admission predicate (e.g. record still in active projection). */
  isAdmitted?: (trigger: HTMLElement) => boolean
  /** Explicit fallback if trigger is missing, disconnected, or unadmitted. */
  isFallbackAdmitted?: (target: HTMLElement) => boolean
  fallbackTarget?: HTMLElement | null | (() => HTMLElement | null)
}

function isAdmittedElement(el: unknown): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false
  if (!el.isConnected) return false
  if (el.matches('input[type="hidden"]')) return false
  if (el.matches(':disabled') || el.closest('[aria-disabled="true"], [hidden]')) return false
  const view = el.ownerDocument.defaultView
  if (view) {
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      const style = view.getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
    }
  }
  if (el.hasAttribute('inert') || Boolean(el.closest('[inert]'))) return false
  if (el.getAttribute('aria-hidden') === 'true' || Boolean(el.closest('[aria-hidden="true"]'))) return false
  return true
}

/** Resolve the admitted focus return element. */
export function resolveAdmittedFocusTarget(options: FocusReturnOptions): HTMLElement | null {
  const rawTrigger = typeof options.trigger === 'function' ? options.trigger() : options.trigger
  if (isAdmittedElement(rawTrigger) && (!options.isAdmitted || options.isAdmitted(rawTrigger))) {
    return rawTrigger
  }

  const rawFallback =
    typeof options.fallbackTarget === 'function' ? options.fallbackTarget() : options.fallbackTarget
  if (isAdmittedElement(rawFallback) && (!options.isFallbackAdmitted || options.isFallbackAdmitted(rawFallback))) {
    return rawFallback
  }

  return null
}

/** Restore focus to the admitted return target, returning true if focused. */
export function restoreAdmittedFocus(options: FocusReturnOptions): boolean {
  const target = resolveAdmittedFocusTarget(options)
  if (target && typeof target.focus === 'function') {
    target.focus()
    return target.ownerDocument.activeElement === target
  }
  return false
}
