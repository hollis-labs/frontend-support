import { expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useOverlayStack } from '../src'

it('refuses a third overlay, ignores toasts in the depth, and closes topmost first', () => {
  const rejected: string[] = []
  const { result } = renderHook(() => useOverlayStack(id => rejected.push(id)))
  const open = (id: string, kind: 'modal' | 'drawer' | 'toast') => { let ok = false; act(() => { ok = result.current.open({ id, kind, title: id }) }); return ok }
  expect(open('a', 'drawer')).toBe(true)
  expect(open('b', 'modal')).toBe(true)
  expect(open('c', 'drawer')).toBe(false)
  expect(rejected).toEqual(['c'])
  expect(open('t', 'toast')).toBe(true)
  act(() => { result.current.closeTop() })
  expect(result.current.entries.map(e => e.id)).toEqual(['a', 't'])
})
