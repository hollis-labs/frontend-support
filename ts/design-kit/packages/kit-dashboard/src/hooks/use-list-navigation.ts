import { useArrowNav } from './use-arrow-nav'

export interface ListNavigationOptions {
  /** Ordered ids from DataTable, optionally narrowed to errors by the app. */
  ids: readonly string[]
  currentId: string | null
  onNavigate: (id: string) => void
  enabled?: boolean
}

/** Bounded navigation through the caller's filtered order; never wraps or guesses a missing cursor. */
export function useListNavigation({ ids, currentId, onNavigate, enabled = true }: ListNavigationOptions) {
  const index = currentId === null ? -1 : ids.indexOf(currentId)
  const previousId = index > 0 ? ids[index - 1] : undefined
  const nextId = index >= 0 ? ids[index + 1] : undefined
  const onPrev = previousId === undefined ? undefined : () => onNavigate(previousId)
  const onNext = nextId === undefined ? undefined : () => onNavigate(nextId)
  useArrowNav({ enabled, onPrev, onNext })
  return { index, total: ids.length, previousId, nextId, onPrev, onNext }
}
