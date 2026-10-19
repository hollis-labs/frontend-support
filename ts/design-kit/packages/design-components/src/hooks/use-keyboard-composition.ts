import { useCallback, useLayoutEffect, useRef } from 'react'

/** Native composition lifetime supplements per-key diagnostics (including manual triggers). */
export function useKeyboardComposition(sourceGeneration: unknown) {
  const composing = useRef(false)
  useLayoutEffect(() => { composing.current = false }, [sourceGeneration])
  useLayoutEffect(() => {
    const start = () => { composing.current = true }
    const end = () => { composing.current = false }
    window.addEventListener('compositionstart', start, true)
    window.addEventListener('compositionend', end, true)
    window.addEventListener('blur', end)
    return () => {
      composing.current = false
      window.removeEventListener('compositionstart', start, true)
      window.removeEventListener('compositionend', end, true)
      window.removeEventListener('blur', end)
    }
  }, [])
  return useCallback(() => composing.current, [])
}
