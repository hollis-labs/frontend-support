import { fireEvent, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useArrowNav } from '../hooks/use-arrow-nav'
import { useListNavigation } from '../hooks/use-list-navigation'

const ids = ['error-a', 'error-c', 'error-f']

describe('operations keyboard navigation', () => {
  it('navigates the supplied error order and exposes the same button handlers', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() => useListNavigation({ ids, currentId: 'error-c', onNavigate }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    result.current.onNext?.()
    expect(onNavigate.mock.calls).toEqual([['error-a'], ['error-f'], ['error-f']])
    expect(result.current.index).toBe(1)
  })

  it('does not wrap at boundaries, or navigate a cursor removed by filtering', () => {
    const onNavigate = vi.fn()
    const { rerender } = renderHook(({ currentId, ids }) => useListNavigation({ ids, currentId, onNavigate }), {
      initialProps: { ids, currentId: 'error-a' },
    })
    const boundary = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true })
    window.dispatchEvent(boundary)
    expect(boundary.defaultPrevented).toBe(false)
    rerender({ ids, currentId: 'error-f' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    rerender({ ids: [], currentId: 'error-f' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('uses current callbacks and removes listeners when disabled or unmounted', () => {
    const first = vi.fn(), second = vi.fn()
    const { rerender, unmount } = renderHook(({ enabled, onNext }) => useArrowNav({ enabled, onNext }), {
      initialProps: { enabled: true, onNext: first },
    })
    rerender({ enabled: true, onNext: second })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    rerender({ enabled: false, onNext: second })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    unmount()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(second).toHaveBeenCalledTimes(1)
  })

  it.each(['input', 'textarea', 'select', 'div'])('preserves editing in %s and nested contenteditable', (tag) => {
    const onNext = vi.fn()
    renderHook(() => useArrowNav({ onNext }))
    const editor = document.createElement(tag)
    if (tag === 'div') editor.setAttribute('contenteditable', 'true')
    const target = tag === 'div' ? editor.appendChild(document.createElement('span')) : editor
    document.body.appendChild(editor)
    fireEvent.keyDown(target, { key: 'ArrowRight' })
    editor.remove()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('respects widget ownership, consumed events, unrelated keys and modifiers', () => {
    const onNext = vi.fn()
    renderHook(() => useArrowNav({ onNext }))
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
      fireEvent.keyDown(window, { key: 'ArrowRight', [modifier]: true })
    }
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const consumed = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })
    consumed.preventDefault()
    window.dispatchEvent(consumed)
    const widget = document.createElement('div')
    widget.setAttribute('role', 'tablist')
    document.body.appendChild(widget)
    fireEvent.keyDown(widget, { key: 'ArrowRight' })
    widget.remove()
    expect(onNext).not.toHaveBeenCalled()
  })
})
