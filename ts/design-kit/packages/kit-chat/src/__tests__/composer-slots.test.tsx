import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatComposer } from '../components/chat-composer'
import { ChatInput, type ChatInputProps } from '../components/chat-input'
import { ChatStream } from '../components/chat-stream'

function Controlled(props: Partial<ChatInputProps>) {
  const [value, setValue] = useState('draft')
  return <ChatInput value={value} onValueChange={setValue} onSubmit={() => {}} {...props} />
}

describe('ChatInput slots and states (CW-20261115-0032)', () => {
  it('renders above and footer slots around the textarea', () => {
    const { container } = render(<Controlled above={<span>strip</span>} footer={<span>disclaimer</span>} />)
    const above = container.querySelector('[data-slot="chat-input-above"]')!
    const footer = container.querySelector('[data-slot="chat-input-footer"]')!
    const box = screen.getByRole('combobox')
    expect(above.textContent).toBe('strip')
    expect(footer.textContent).toBe('disclaimer')
    expect(above.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(box.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows a disabled Stopping state in place of Stop', () => {
    const onStop = vi.fn()
    const { rerender } = render(<Controlled busy onStop={onStop} />)
    expect(screen.getByRole('button', { name: 'Stop response' })).toBeTruthy()
    rerender(<Controlled busy stopping onStop={onStop} />)
    expect((screen.getByRole('button', { name: 'Stopping response' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Stop response' })).toBeNull()
  })

  it('shows an inline error with Retry and keeps the draft', () => {
    const onRetry = vi.fn()
    render(<Controlled error="Could not send." onRetry={onRetry} />)
    expect(screen.getByRole('alert').textContent).toMatch(/Could not send/)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalled()
    expect((screen.getByRole('combobox') as HTMLTextAreaElement).value).toBe('draft')
  })

  it('toggle buttons expose and flip a pressed state', () => {
    const onToggle = vi.fn()
    render(<Controlled toggles={[{ id: 'files', label: 'Files', pressed: true, onToggle }]} />)
    const button = screen.getByRole('button', { name: 'Files' })
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('has a + menu button when items are given, and none otherwise', () => {
    const { rerender } = render(<Controlled />)
    expect(screen.queryByRole('button', { name: 'More options' })).toBeNull()
    rerender(<Controlled menu={{ items: [{ id: 'up', label: 'Upload', hint: '⌘U', onSelect: () => {} }] }} />)
    expect(screen.getByRole('button', { name: 'More options' })).toBeTruthy()
  })

  it('the slots reach ChatComposer, which owns the draft', () => {
    render(<ChatComposer onSubmit={() => {}} above={<span>strip</span>} error="boom" />)
    expect(screen.getByText('strip')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toMatch(/boom/)
  })
})

describe('ChatStream custom message actions', () => {
  it('renders host actions after the built-ins and passes the message', () => {
    const onSelect = vi.fn()
    const item = { kind: 'message', id: 'm1', role: 'assistant', source: 'hi', content: 'hi' } as never
    render(
      <ChatStream
        items={[item]}
        messageActions={{ copy: true, custom: [{ id: 'bm', label: 'Bookmark', icon: <span>★</span>, onSelect }] }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Bookmark/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }))
  })
})
