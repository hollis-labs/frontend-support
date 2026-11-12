import { render, fireEvent, cleanup } from '@testing-library/react'
import { it, expect, vi, afterEach } from 'vitest'
import { useShortcut } from '../hooks/use-shortcut'
import { useShiftShift } from '../hooks/use-shift-shift'
import { useLayeredEscape } from '../hooks/use-layered-escape'
import { EscapeStack } from '../lib/escape-stack'

afterEach(cleanup)

it('shortcut stays active across a committed stable-prop rerender', () => {
  const onTrigger = vi.fn()
  function Probe({ count }: { count: number }) {
    useShortcut({ key: '/', onTrigger })
    return <span>{count}</span>
  }
  const ui = render(<Probe count={0} />)
  fireEvent.keyDown(window, { key: '/' })
  expect(onTrigger).toHaveBeenCalledTimes(1)
  ui.rerender(<Probe count={1} />)
  fireEvent.keyDown(window, { key: '/' })
  expect(onTrigger).toHaveBeenCalledTimes(2)
})

it('Escape stays active across a committed stable-prop rerender', () => {
  const onEscape = vi.fn(() => 'closed' as const)
  const stack = new EscapeStack()
  function Probe({ count }: { count: number }) {
    useLayeredEscape({ active: true, onEscape, escapeStack: stack })
    return <span>{count}</span>
  }
  const ui = render(<Probe count={0} />)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onEscape).toHaveBeenCalledTimes(1)
  ui.rerender(<Probe count={1} />)
  fireEvent.keyDown(window, { key: 'Escape' })
  stack.reset()
  expect(onEscape).toHaveBeenCalledTimes(2)
})

it('nested child owns Escape on initial React mount', () => {
  const stack = new EscapeStack()
  const outer = vi.fn(() => 'closed' as const)
  const inner = vi.fn(() => 'closed' as const)
  function Inner() {
    useLayeredEscape({ active: true, onEscape: inner, escapeStack: stack })
    return <div role="dialog">inner</div>
  }
  function Outer() {
    useLayeredEscape({ active: true, onEscape: outer, escapeStack: stack })
    return (
      <div role="dialog">
        <Inner />
      </div>
    )
  }
  render(<Outer />)
  fireEvent.keyDown(window, { key: 'Escape' })
  stack.reset()
  expect(inner).toHaveBeenCalledTimes(1)
  expect(outer).not.toHaveBeenCalled()
})

it('held Shift repeat does not become a double tap', () => {
  const onTrigger = vi.fn()
  let time = 100
  const getTime = () => time
  function Probe() {
    useShiftShift({ onTrigger, getTime })
    return null
  }
  render(<Probe />)
  fireEvent.keyDown(window, { key: 'Shift', shiftKey: true })
  time = 150
  fireEvent.keyDown(window, { key: 'Shift', shiftKey: true, repeat: true })
  expect(onTrigger).not.toHaveBeenCalled()
})
