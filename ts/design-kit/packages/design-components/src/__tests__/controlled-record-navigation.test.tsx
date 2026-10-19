import { StrictMode, type ReactNode } from 'react'
import { act, fireEvent, render, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useControlledRecordNavigation, type ControlledRecordNavigationOptions } from '../index'

const defaults = (onSelect = vi.fn()): ControlledRecordNavigationOptions => ({
  orderedIds: ['arbitrary:α', 'message/7', 'opaque 🦊'], selectedId: 'arbitrary:α',
  active: true, accessible: true, sourceGeneration: 'generation-one', boundaryPolicy: 'wrap', onSelect,
})

describe('controlled record navigation', () => {
  it('uses arbitrary caller order and explicit wrap and stop boundaries', () => {
    const options = defaults()
    const { result, rerender } = renderHook(useControlledRecordNavigation, { initialProps: options })
    expect(result.current.position).toBe(0)
    act(() => { expect(result.current.navigate(-1)).toBe(true) })
    expect(options.onSelect).toHaveBeenLastCalledWith('opaque 🦊')
    rerender({ ...options, boundaryPolicy: 'stop' })
    expect(result.current.availability).toEqual({ previous: false, next: true })
    expect(result.current.navigate(-1)).toBe(false)
    act(() => { result.current.navigate(1) })
    expect(options.onSelect).toHaveBeenLastCalledWith('message/7')
    rerender({ ...options, boundaryPolicy: 'stop', selectedId: 'opaque 🦊' })
    expect(result.current.availability).toEqual({ previous: true, next: false })
    expect(result.current.navigate(1)).toBe(false)
  })

  it.each([
    { selectedId: null }, { selectedId: 'not-admitted' }, { active: false },
    { accessible: false }, { orderedIds: [] }, { orderedIds: ['arbitrary:α'] },
  ])('denies unavailable state %j', patch => {
    const options = { ...defaults(), ...patch }
    const { result } = renderHook(() => useControlledRecordNavigation(options))
    expect(result.current.navigate(1)).toBe(false)
    expect(options.onSelect).not.toHaveBeenCalled()
  })

  it('retires retained callbacks on every frame and unmount with fresh positive controls', () => {
    const options = defaults()
    const { result, rerender, unmount } = renderHook(useControlledRecordNavigation, {
      initialProps: options, wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    })
    for (const patch of [
      { sourceGeneration: 'generation-two' }, { orderedIds: [...options.orderedIds].reverse() },
      { selectedId: 'message/7' }, { sourceGeneration: 'generation-one' }, {},
    ]) {
      const held = result.current.navigate
      act(() => { expect(held(1)).toBe(true) })
      rerender({ ...options, ...patch })
      expect(held(1)).toBe(false)
      act(() => { expect(result.current.navigate(1)).toBe(true) })
    }
    const held = result.current.navigate
    unmount()
    expect(held(1)).toBe(false)
  })

  it('retires popup and composition callbacks and leaves stop boundaries unconsumed', () => {
    const options = { ...defaults(), boundaryPolicy: 'stop' as const }
    const { result, rerender, unmount } = renderHook(useControlledRecordNavigation, { initialProps: options })
    const root = document.createElement('div')
    root.setAttribute('role', 'dialog')
    const target = document.createElement('h2')
    root.append(target)
    document.body.append(root)
    const event = (key: string) => ({
      key, currentTarget: root, target, nativeEvent: {}, preventDefault: vi.fn(),
    }) as unknown as Parameters<NonNullable<typeof result.current.popupHandlers.onKeyDown>>[0]
    const old = result.current.popupHandlers
    const boundary = event('ArrowLeft')
    old.onKeyDown!(boundary)
    expect(boundary.preventDefault).not.toHaveBeenCalled()
    const positive = event('ArrowRight')
    old.onKeyDown!(positive)
    expect(options.onSelect).toHaveBeenCalledWith('message/7')
    vi.mocked(options.onSelect).mockClear()
    rerender({ ...options, sourceGeneration: 'generation-two' })
    old.onCompositionStartCapture!({} as never)
    old.onKeyDown!(event('ArrowRight'))
    expect(options.onSelect).not.toHaveBeenCalled()
    result.current.popupHandlers.onKeyDown!(event('ArrowRight'))
    expect(options.onSelect).toHaveBeenCalledWith('message/7')
    const fresh = result.current.popupHandlers
    vi.mocked(options.onSelect).mockClear()
    unmount()
    fresh.onKeyDown!(event('ArrowRight'))
    expect(options.onSelect).not.toHaveBeenCalled()
    root.remove()
  })

  it('respects bubble consumption, native and composite owners, composition and nested overlays', () => {
    const options = defaults()
    function Popup() {
      const nav = useControlledRecordNavigation(options)
      return <div role="dialog" {...nav.popupHandlers}>
        <h2 data-testid="title">Records</h2>
        <input data-testid="input" /><input type="range" data-testid="range" />
        <div contentEditable="plaintext-only" data-testid="editable" />
        <div role="grid"><span data-testid="grid">Cell</span></div>
        <button>Native</button>
        <span data-testid="consumed" onKeyDown={event => event.preventDefault()}>Child</span>
        <div role="dialog"><span data-testid="nested">Nested</span></div>
      </div>
    }
    const view = render(<Popup />)
    const title = view.getByTestId('title')
    for (const id of ['input', 'range', 'editable', 'grid', 'consumed', 'nested']) {
      fireEvent.keyDown(view.getByTestId(id), { key: 'ArrowRight' })
    }
    for (const props of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }, { keyCode: 229 }]) {
      fireEvent.keyDown(title, { key: 'ArrowRight', ...props })
    }
    fireEvent.compositionStart(title)
    fireEvent.keyDown(title, { key: 'ArrowRight' })
    expect(options.onSelect).not.toHaveBeenCalled()
    fireEvent.compositionEnd(title)
    const child = view.getByTestId('nested').parentElement!
    vi.spyOn(child, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
    fireEvent.keyDown(title, { key: 'ArrowRight' })
    expect(options.onSelect).not.toHaveBeenCalled()
    child.remove()
    fireEvent.keyDown(title, { key: 'ArrowRight' })
    expect(options.onSelect).toHaveBeenCalledWith('message/7')
  })
})
