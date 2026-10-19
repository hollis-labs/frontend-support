import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatInput } from '../components/chat-input'
import type { ChatInputProps } from '../components/chat-input'

function Controlled(props: Partial<ChatInputProps>) {
  const [value, setValue] = useState('')
  return <ChatInput value={value} onValueChange={setValue} onSubmit={() => {}} {...props} />
}

describe('ChatInput actions', () => {
  it('sends trimmed content from the visible action and suppresses blank sends', () => {
    const onSubmit = vi.fn()
    render(<Controlled onSubmit={onSubmit} />)
    const send = screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement
    expect(send.disabled).toBe(true)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '  hello  ' } })
    expect(send.disabled).toBe(false)
    fireEvent.click(send)
    expect(onSubmit).toHaveBeenCalledWith('hello')
  })

  it('does not send or select while Enter commits an IME composition', () => {
    const onSubmit = vi.fn()
    render(<Controlled onSubmit={onSubmit} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'こんにちは' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('こんにちは')
  })

  it('keeps the draft editable while busy and uses only the host stop callback', () => {
    const onSubmit = vi.fn()
    const onStop = vi.fn()
    render(<Controlled busy onSubmit={onSubmit} onStop={onStop} />)
    const input = screen.getByRole('combobox') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'next message' } })
    expect(input.disabled).toBe(false)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Stop response' }))
    expect(onStop).toHaveBeenCalledOnce()
    expect(input.value).toBe('next message')
  })

  it('recalls multiple sent messages and returns to the empty draft', () => {
    render(<Controlled history={['older', 'newer']} />)
    const input = screen.getByRole('combobox') as HTMLTextAreaElement
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('newer')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('older')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.value).toBe('newer')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.value).toBe('')
    fireEvent.change(input, { target: { value: 'real draft' } })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('real draft')
  })

  it('can defer the submit action to the host', () => {
    render(<Controlled showSubmitButton={false} />)
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull()
  })
})
