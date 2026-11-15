import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
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
    // stopping alone, without busy, is not a stop in progress
    rerender(<Controlled stopping onStop={onStop} />)
    expect(screen.queryByRole('button', { name: 'Stopping response' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy()
    rerender(<Controlled busy onStop={onStop} />)
    rerender(<Controlled busy stopping onStop={onStop} />)
    expect((screen.getByRole('button', { name: 'Stopping response' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Stop response' })).toBeNull()
    expect(screen.queryByText('Responding…')).toBeNull()
  })

  it('shows an inline error with Retry and keeps the draft', () => {
    const onRetry = vi.fn()
    render(<Controlled error="Could not send." onRetry={onRetry} />)
    expect(screen.getByRole('alert').textContent).toMatch(/Could not send/)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalled()
    expect((screen.getByRole('combobox') as HTMLTextAreaElement).value).toBe('draft')
  })

  it('disables Retry while busy', () => {
    render(<Controlled busy error="Could not stop." onRetry={() => {}} />)
    expect((screen.getByRole('button', { name: 'Retry' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('ChatComposer hands onRetry the kept draft', () => {
    const onRetry = vi.fn()
    render(<ChatComposer defaultValue="my draft" onSubmit={() => {}} error="boom" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledWith('my draft')
  })

  it('selecting a + menu item runs it', async () => {
    // Opening a menu makes floating-ui ask for ':fullscreen' and ':modal' thousands of times, and jsdom's
    // selector engine answers each slowly (about a minute in total). Neither state exists here.
    const matches = Element.prototype.matches
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      return selector === ':fullscreen' || selector === ':modal' ? false : matches.call(this, selector)
    })
    const onSelect = vi.fn()
    render(<Controlled menu={{ items: [{ id: 'up', label: 'Upload file', hint: '⌘U', onSelect }] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'More options' }))
    // A fixed wait, not findBy*: the open menu keeps mutating (positioning), and every mutation re-runs the query.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    const item = document.querySelector('[role="menuitem"]') as HTMLElement
    expect(item.textContent).toContain('Upload file')
    expect(item.textContent).toContain('⌘U')
    fireEvent.click(item)
    expect(onSelect).toHaveBeenCalled()
    vi.restoreAllMocks()
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
