import { useEffect, useRef, useState } from 'react'
import { errorMessage, isDenied } from '../client/errors'

export interface Loaded<T> {
  readonly data: T | null
  readonly loading: boolean
  readonly error: string | null
  /** 403: the caller lacks the scope. Not an error to retry. */
  readonly denied: boolean
  readonly reload: () => void
}

export function useLoad<T>(load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null; denied: boolean }>({ data: null, loading: true, error: null, denied: false })
  const [tick, setTick] = useState(0)
  const loader = useRef(load)
  useEffect(() => { loader.current = load })
  useEffect(() => {
    let live = true
    loader.current().then(
      (data) => { if (live) setState({ data, loading: false, error: null, denied: false }) },
      (failure: unknown) => { if (live) setState({ data: null, loading: false, error: isDenied(failure) ? null : errorMessage(failure), denied: isDenied(failure) }) },
    )
    return () => { live = false }
  }, [tick])
  return { ...state, reload: () => { setState((s) => ({ ...s, loading: true, error: null })); setTick((n) => n + 1) } }
}
