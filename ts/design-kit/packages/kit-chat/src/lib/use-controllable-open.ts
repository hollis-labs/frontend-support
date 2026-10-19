import { useCallback, useState } from 'react'

/** Local disclosure only. A controlled host decides whether to apply changes. */
export function useControllableOpen(open: boolean | undefined, defaultOpen: boolean, onOpenChange?: (open: boolean) => void) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const value = open ?? internalOpen
  const setValue = useCallback((next: boolean) => {
    if (open === undefined) setInternalOpen(next)
    if (next !== value) onOpenChange?.(next)
  }, [open, onOpenChange, value])
  return [value, setValue] as const
}
