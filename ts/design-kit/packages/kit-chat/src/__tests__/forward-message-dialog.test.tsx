import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ForwardMessageDialog } from '../components/forward-message-dialog'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const recipients = [{ id: 'architect', label: 'Architect', keywords: ['msg://agent/agt-123', 'session-xyz'] }, { id: 'manager', label: 'Manager' }]

it('searches an identity alias, selects with Enter, and sends only on explicit Send', async () => {
  const send = vi.fn().mockResolvedValue(undefined)
  const close = vi.fn()
  render(<ForwardMessageDialog recipients={recipients} source={'Long original '.repeat(70)} sourceLabel="Source agent" onSend={send} onClose={close} />)
  const input = screen.getByRole('combobox')
  fireEvent.change(input, { target: { value: 'session-xyz' } })
  await waitFor(() => expect(screen.queryByRole('option', { name: 'Manager' })).toBeNull())
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Change' })).toBeTruthy())
  expect(send).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox', { name: /Your message/ }), { target: { value: 'Please review.' } })
  fireEvent.click(screen.getByRole('button', { name: /^Send$/ }))
  await waitFor(() => expect(send).toHaveBeenCalledWith('architect', 'Please review.'))
  expect(close).toHaveBeenCalledOnce()
})

it('retains the recipient and note on failure, and prevents duplicate sends while pending', async () => {
  let reject: (e: Error) => void = () => undefined
  const send = vi.fn(() => new Promise<void>((_, no) => { reject = no }))
  render(<ForwardMessageDialog recipients={recipients} source="Full source" sourceLabel="Source" onSend={send} onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('option', { name: 'Architect' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Your message/ }), { target: { value: 'Keep this draft' } })
  const button = screen.getByRole('button', { name: /^Send$/ })
  fireEvent.click(button); fireEvent.click(button)
  expect(send).toHaveBeenCalledOnce()
  reject(new Error('Delivery unavailable'))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Delivery unavailable'))
  expect((screen.getByRole('textbox', { name: /Your message/ }) as HTMLTextAreaElement).value).toBe('Keep this draft')
  expect(screen.getByText('To Architect')).toBeTruthy()
})
