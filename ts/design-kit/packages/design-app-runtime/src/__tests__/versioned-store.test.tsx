import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createVersionedStore } from '../lib/versioned-store'
import { useVersionedStore } from '../hooks/use-versioned-store'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('createVersionedStore', () => {
  it('starts at version 0 and returns the initial value', () => {
    const initial = { a: 1 }
    const s = createVersionedStore(initial)
    expect(s.get()).toBe(initial)
    expect(s.version()).toBe(0)
  })

  it('same reference is a no-op: no bump, no notify', () => {
    const v = { a: 1 }
    const s = createVersionedStore(v)
    const l = vi.fn()
    s.subscribe(l)
    s.set(v)
    expect(s.version()).toBe(0)
    expect(l).not.toHaveBeenCalled()
  })

  it('increments version once per effective set', () => {
    const s = createVersionedStore({ n: 0 })
    s.set({ n: 1 })
    s.set({ n: 1 })
    expect(s.version()).toBe(2)
  })

  it('notifies once per set, in subscription order', () => {
    const s = createVersionedStore(0)
    const order: string[] = []
    s.subscribe(() => order.push('a'))
    s.subscribe(() => order.push('b'))
    s.set(1)
    expect(order).toEqual(['a', 'b'])
  })

  it('a throwing listener does not stop the others or the set', () => {
    const s = createVersionedStore(0)
    const seen: string[] = []
    s.subscribe(() => { throw new Error('boom') })
    s.subscribe(() => seen.push('ok'))
    // The error is rethrown asynchronously; capture it so it does not fail the run.
    const rethrown: unknown[] = []
    vi.stubGlobal('queueMicrotask', (fn: () => void) => { try { fn() } catch (e) { rethrown.push(e) } })
    s.set(1)
    vi.unstubAllGlobals()
    expect(seen).toEqual(['ok'])
    expect(s.get()).toBe(1)
    expect((rethrown[0] as Error).message).toBe('boom')
  })

  it('unsubscribe stops notifications and is idempotent', () => {
    const s = createVersionedStore(0)
    const l = vi.fn()
    const off = s.subscribe(l)
    off()
    off()
    s.set(1)
    expect(l).not.toHaveBeenCalled()
  })

  it('keeps the previous value when the app fails to compose the next one', () => {
    const prev = { rows: ['a'] }
    const s = createVersionedStore(prev)
    const compose = () => { throw new Error('bad registry') }
    try { s.set(compose()) } catch { /* app keeps the previous table */ }
    expect(s.get()).toBe(prev)
    expect(s.version()).toBe(0)
  })
})

describe('useVersionedStore', () => {
  function setup() {
    const s = createVersionedStore({ label: 'one' })
    let renders = 0
    function View() {
      renders += 1
      return <p>{useVersionedStore(s).label}</p>
    }
    return { s, View, renders: () => renders }
  }

  it('re-renders exactly once per set under StrictMode', () => {
    const { s, View, renders } = setup()
    render(<StrictMode><View /></StrictMode>)
    expect(screen.getByText('one')).toBeTruthy()
    const before = renders()
    act(() => s.set({ label: 'two' }))
    expect(screen.getByText('two')).toBeTruthy()
    // StrictMode double-invokes render, so one update is two function calls.
    expect(renders() - before).toBe(2)
  })

  it('does not re-render on a same-reference set', () => {
    const { s, View, renders } = setup()
    render(<View />)
    const before = renders()
    act(() => s.set(s.get()))
    expect(renders()).toBe(before)
  })

  it('renders once per set without StrictMode', () => {
    const { s, View, renders } = setup()
    render(<View />)
    const before = renders()
    act(() => s.set({ label: 'two' }))
    expect(renders() - before).toBe(1)
  })

  it('provides a server snapshot', () => {
    const { View } = setup()
    expect(renderToString(<View />)).toContain('one')
  })
})
