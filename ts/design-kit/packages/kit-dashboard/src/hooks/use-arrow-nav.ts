import { useEffect } from 'react'

export interface ArrowNavOptions {
  enabled?: boolean
  onPrev?: () => void
  onNext?: () => void
}

/** Left/right detail navigation. Native editors, widgets and modifiers keep their keys. */
export function useArrowNav({ enabled = true, onPrev, onNext }: ArrowNavOptions): void {
  useEffect(() => {
    if (!enabled) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      const target = event.target
      if (target instanceof Element && target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="combobox"], [role="tablist"], [role="menu"], [role="listbox"], [data-arrow-nav-ignore]',
      )) return
      const navigate = event.key === 'ArrowLeft' ? onPrev : event.key === 'ArrowRight' ? onNext : undefined
      if (!navigate) return
      event.preventDefault()
      navigate()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onPrev, onNext])
}
