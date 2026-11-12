import { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useControllableState } from '../hooks/use-controllable-state'

describe('useControllableState', () => {
  it('holds its own state when uncontrolled, starting from defaultValue', () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: 'a' }))
    expect(result.current[0]).toBe('a')
    act(() => result.current[1]('b'))
    expect(result.current[0]).toBe('b')
  })

  it('reports changes through onChange in uncontrolled mode', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllableState({ defaultValue: 0, onChange }))
    act(() => result.current[1](1))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('does not fire onChange for a set to the value already held', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllableState({ defaultValue: 'x', onChange }))
    act(() => result.current[1]('x'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('follows value when controlled and does not change until the value does', () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useControllableState({ value, defaultValue: 'default', onChange }),
      { initialProps: { value: 'one' } },
    )
    expect(result.current[0]).toBe('one')
    act(() => result.current[1]('two'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('two')
    expect(result.current[0]).toBe('one') // the host has not accepted it
    rerender({ value: 'two' })
    expect(result.current[0]).toBe('two')
  })

  it('accepts an updater function and lets two sets in one event see each other', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useControllableState({ defaultValue: 0, onChange }))
    act(() => {
      result.current[1]((n) => n + 1)
      result.current[1]((n) => n + 1)
    })
    expect(result.current[0]).toBe(2)
    expect(onChange).toHaveBeenNthCalledWith(2, 2)
  })

  it('keeps setValue stable across renders and always calls the latest onChange', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ onChange }: { onChange: (v: number) => void }) => useControllableState({ defaultValue: 0, onChange }),
      { initialProps: { onChange: first } },
    )
    const setter = result.current[1]
    rerender({ onChange: second })
    expect(result.current[1]).toBe(setter)
    act(() => setter(5))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledWith(5)
  })

  it('uses the latest controlled value for functional requests without accepting them locally', () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useControllableState({ value, defaultValue: 0, onChange }),
      { initialProps: { value: 2 } },
    )
    const setter = result.current[1]
    act(() => setter((n) => n))
    expect(onChange).not.toHaveBeenCalled()
    rerender({ value: 10 })
    expect(result.current[1]).toBe(setter)
    expect(onChange).not.toHaveBeenCalled()
    act(() => setter((n) => n + 1))
    expect(onChange.mock.calls).toEqual([[11]])
    expect(result.current[0]).toBe(10)
  })

  it('uses defaultValue only on initialization and supports an empty selection', () => {
    const { result, rerender } = renderHook(
      ({ defaultValue }: { defaultValue: string | undefined }) =>
        useControllableState<string | undefined>({ defaultValue }),
      { initialProps: { defaultValue: undefined as string | undefined } },
    )
    expect(result.current[0]).toBeUndefined()
    act(() => result.current[1]('mic'))
    rerender({ defaultValue: 'different mic' })
    expect(result.current[0]).toBe('mic')
  })

  it('treats null as controlled and suppresses same-value requests', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useControllableState<string | null>({ value: null, defaultValue: 'mic', onChange }),
    )
    expect(result.current[0]).toBeNull()
    act(() => result.current[1](null))
    expect(onChange).not.toHaveBeenCalled()
    act(() => result.current[1]('mic'))
    expect(onChange.mock.calls).toEqual([['mic']])
    expect(result.current[0]).toBeNull()
  })

  it('fires callbacks once per actual update under StrictMode', () => {
    const onChange = vi.fn()
    const { result } = renderHook(
      () => useControllableState({ defaultValue: 0, onChange }),
      { wrapper: StrictMode },
    )
    act(() => {
      result.current[1]((n) => n + 1)
      result.current[1]((n) => n)
      result.current[1]((n) => n + 1)
    })
    expect(result.current[0]).toBe(2)
    expect(onChange.mock.calls).toEqual([[1], [2]])
  })
})
