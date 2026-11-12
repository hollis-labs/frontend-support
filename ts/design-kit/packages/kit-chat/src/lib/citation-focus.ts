// Original Hollis Labs focus helpers for the interactive citation preview.
// Internal module; these functions are not part of the package's public exports.
export function focusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]'))
    .filter((element) => {
      if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden], [inert]')) return false
      const style = element.ownerDocument.defaultView?.getComputedStyle(element)
      if (!style || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false
      if (typeof element.checkVisibility === 'function' && !element.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true })) return false
      // Rects also cover hidden ancestors and zero-area controls on older browsers.
      return Array.from(element.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0)
    })
}
export function focusFirst(candidates: HTMLElement[]) {
  for (const candidate of candidates) {
    candidate.focus()
    if (candidate.ownerDocument.activeElement === candidate) return true
  }
  return false
}
