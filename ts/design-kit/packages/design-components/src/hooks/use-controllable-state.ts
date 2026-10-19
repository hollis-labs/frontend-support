import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Presentational controlled/uncontrolled state shared by the idiom kits.
 *
 * A value is *controlled* when `value` is not `undefined`. That is Radix's rule, kept
 * so ported components behave the same, and it has one consequence worth knowing:
 * a controlled value of `undefined` ("nothing selected") is indistinguishable from
 * uncontrolled. Pass `null` as the empty controlled value if you need the difference.
 *
 * `onChange` fires when the value actually changes, in both modes, and never for a
 * set to the value already held.
 */
export interface UseControllableStateParams<T> {
  readonly value?: T | undefined
  readonly defaultValue: T
  readonly onChange?: ((value: T) => void) | undefined
}

export type SetControllableState<T> = (next: T | ((previous: T) => T)) => void

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateParams<T>): [T, SetControllableState<T>] {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue)
  const isControlled = value !== undefined
  const state = isControlled ? (value as T) : uncontrolled

  // Refs let `setValue` keep a stable identity while always seeing the latest values.
  // They are synced in an effect, not during render.
  const valueRef = useRef(state)
  const controlledRef = useRef(isControlled)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    valueRef.current = state
    controlledRef.current = isControlled
    onChangeRef.current = onChange
  })

  const setValue = useCallback<SetControllableState<T>>((next) => {
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(valueRef.current) : next
    if (Object.is(resolved, valueRef.current)) return
    if (!controlledRef.current) {
      // Uncontrolled: record it now so two sets in one event see each other.
      valueRef.current = resolved
      setUncontrolled(resolved)
    }
    onChangeRef.current?.(resolved)
  }, [])

  return [state, setValue]
}
