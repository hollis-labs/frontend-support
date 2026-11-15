import { useEffect, useSyncExternalStore } from 'react'

/**
 * How many `DialogContent`s are mounted and open. A `Sheet`
 * reads this to know it opened over a dialog: the dialog's viewport sits on `z-[60]`, above
 * the sheet's default `z-50`, so without it a sheet opened from inside a dialog renders
 * underneath. Portals append to the body in open order, so a sheet at the same level lands
 * above the dialog it was opened from.
 */
let open = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Register this component as an open dialog while it is mounted AND `isOpen`. */
export function useRegisterOpenDialog(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return
    open += 1
    emit()
    return () => {
      open -= 1
      emit()
    }
  }, [isOpen])
}

export function useDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open > 0, () => false)
}
