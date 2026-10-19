/**
 * Shared keyboard admission guards extracted from Parallax Torque and
 * controlled-navigation precedents.
 *
 * Rules:
 * 1. An event is suppressed if defaultPrevented or during IME composition
 *    (isComposing or keyCode 229).
 * 2. Editable and composite interactive elements own their keys and suppress
 *    shell/global navigation shortcuts.
 * 3. Exact modifier matching requires all declared modifiers and forbids all
 *    undeclared modifiers.
 * 4. Active modal overlays suspend background (Tier 4 / global) shortcuts.
 */

export const EDITABLE_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="searchbox"]'

export const NATIVE_INTERACTIVE_SELECTOR =
  'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="searchbox"], [role="slider"], [role="spinbutton"], [role="tablist"], [role="tab"], [role="menu"], [role="menuitem"], [role="listbox"], [role="option"], [role="tree"], [role="treeitem"], [role="grid"], [role="radiogroup"], [role="radio"]'

export const OVERLAY_SELECTOR =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

export interface ExactModifierConfig {
  /** Mod key: Cmd on macOS, Ctrl on Windows/Linux. */
  mod?: boolean
  meta?: boolean
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
}

/** Check if the target is an editable form element or contenteditable. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false
  return Boolean(target.closest(EDITABLE_TARGET_SELECTOR))
}

/** Check if target is a composite or interactive control that owns navigation. */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false
  return Boolean(target.closest(NATIVE_INTERACTIVE_SELECTOR))
}

/** Check if the event was dispatched during IME composition. */
export function isComposingEvent(
  event: KeyboardEvent | { isComposing?: boolean; keyCode?: number; nativeEvent?: { isComposing?: boolean; keyCode?: number } },
): boolean {
  if ('isComposing' in event && event.isComposing) return true
  if ('keyCode' in event && event.keyCode === 229) return true
  if ('nativeEvent' in event && event.nativeEvent) {
    if (event.nativeEvent.isComposing) return true
    if (event.nativeEvent.keyCode === 229) return true
  }
  return false
}

/** Check whether running in a macOS-like environment. */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || navigator.userAgent || ''
  return /Mac|iPhone|iPad|iPod/i.test(platform)
}

/** Check if keyboard event matches exact modifier configuration. */
export function matchExactModifiers(
  event: KeyboardEvent,
  config?: ExactModifierConfig,
): boolean {
  const isMac = isMacPlatform()
  const expectedMeta = Boolean(config?.meta || (config?.mod && isMac))
  const expectedCtrl = Boolean(config?.ctrl || (config?.mod && !isMac))
  const expectedAlt = Boolean(config?.alt)
  const expectedShift = Boolean(config?.shift)

  if (Boolean(event.metaKey) !== expectedMeta) return false
  if (Boolean(event.ctrlKey) !== expectedCtrl) return false
  if (Boolean(event.altKey) !== expectedAlt) return false
  if (Boolean(event.shiftKey) !== expectedShift) return false

  return true
}

/** Closed popups may retain layout during an exit animation but own no keys. */
export function isActiveOverlay(element: Element): boolean {
  return !element.hasAttribute('data-closed') && element.getClientRects().length > 0
}

/** Check if any modal dialog or overlay is currently visible in the DOM. */
export function hasActiveModalOverlay(doc: Document = document): boolean {
  if (!doc) return false
  const overlays = doc.querySelectorAll(OVERLAY_SELECTOR)
  for (let i = 0; i < overlays.length; i++) {
    const el = overlays[i]
    if (el instanceof HTMLElement && isActiveOverlay(el)) {
      return true
    }
  }
  return false
}
