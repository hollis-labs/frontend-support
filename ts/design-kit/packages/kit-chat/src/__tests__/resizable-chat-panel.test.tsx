import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { ResizableChatPanel } from '../components/resizable-chat-panel'

afterEach(cleanup)
it('supports keyboard resizing, bounds and reset while keeping the panel on screen', () => {
  function Panel() { const [width, setWidth] = useState(480); return <ResizableChatPanel width={width} onWidthChange={setWidth} maxWidth={800}>Chat</ResizableChatPanel> }
  render(<Panel />)
  const handle = screen.getByRole('separator')
  fireEvent.keyDown(handle, { key: 'ArrowLeft' })
  expect(handle.getAttribute('aria-valuenow')).toBe('496')
  fireEvent.keyDown(handle, { key: 'End' })
  expect(handle.getAttribute('aria-valuenow')).toBe('800')
  fireEvent.keyDown(handle, { key: 'ArrowLeft' })
  expect(handle.getAttribute('aria-valuenow')).toBe('800')
  fireEvent.doubleClick(handle)
  expect(handle.getAttribute('aria-valuenow')).toBe('480')
  fireEvent.keyDown(handle, { key: 'Home' })
  expect(handle.getAttribute('aria-valuenow')).toBe('360')
})
