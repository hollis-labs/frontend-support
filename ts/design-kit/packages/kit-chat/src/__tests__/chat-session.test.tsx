import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createChatSessionBinding } from '../lib/chat-session'
import type { ChatSessionAttachment } from '../lib/chat-session'
import { SessionAttachDemo } from '../../demo/session-attach'
import { FakeChatSessionAdapter } from '../../demo/fake-session-adapter'

describe('durable session attachment', () => {
  it('renders two views, fences late controller input, and keeps its draft', async () => {
    render(<SessionAttachDemo />)
    fireEvent.click(screen.getByRole('button', { name: 'Attach both' }))
    const a = within(screen.getByRole('region', { name: 'A' }))
    const b = within(screen.getByRole('region', { name: 'B' }))
    await waitFor(() => expect(a.getByRole('combobox', { name: 'Message' }).hasAttribute('disabled')).toBe(false))
    expect(b.getByRole('combobox', { name: 'Message' }).hasAttribute('disabled')).toBe(true)
    expect(b.getByText('Viewing only')).toBeTruthy()
    expect(b.getByLabelText('Conversation presence').textContent).toContain('view-2 (viewer)')

    fireEvent.change(a.getByRole('combobox', { name: 'Message' }), { target: { value: 'first' } })
    fireEvent.click(a.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(a.getByText('first')).toBeTruthy())
    fireEvent.click(b.getByRole('button', { name: 'Refresh B' }))
    await waitFor(() => expect(b.getByText('first')).toBeTruthy())

    fireEvent.click(b.getByRole('button', { name: 'Take control' }))
    await waitFor(() => expect(b.getByRole('combobox', { name: 'Message' }).hasAttribute('disabled')).toBe(false))
    fireEvent.change(a.getByRole('combobox', { name: 'Message' }), { target: { value: 'late draft' } })
    fireEvent.click(a.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(a.getByText('Writer lease lost')).toBeTruthy())
    expect((a.getByRole('combobox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe('late draft')
    expect(a.getByRole('combobox', { name: 'Message' }).hasAttribute('disabled')).toBe(true)
    expect(b.queryByText('late draft')).toBeNull()

    fireEvent.change(b.getByRole('combobox', { name: 'Message' }), { target: { value: 'new controller' } })
    fireEvent.click(b.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(b.getByText('new controller')).toBeTruthy())
  })

  it('replays a cursor suffix once, shows a reported gap, and resumes after every view detaches', async () => {
    const adapter = new FakeChatSessionAdapter()
    adapter.publish('before cursor')
    adapter.publish('after cursor')
    const a = createChatSessionBinding(adapter)
    const b = createChatSessionBinding(adapter)
    await a.attach('controller', '1')
    await b.attach('viewer', '1')
    expect(a.getSnapshot().items.map((item) => item.id)).toEqual(['output-2'])
    expect(b.getSnapshot().items.map((item) => item.id)).toEqual(['output-2'])
    await a.refresh()
    await b.refresh()
    expect(a.getSnapshot().items).toHaveLength(1)

    adapter.reportGap('3', '4')
    await b.refresh()
    expect(b.getSnapshot().items[1]).toMatchObject({ kind: 'marker', variant: 'error', label: 'History gap 3–4: Earlier events unavailable' })
    const cursor = b.getSnapshot().cursor
    b.setDraft('kept draft')
    await a.detach()
    await b.detach()
    expect(a.getSnapshot().access).toBe('detached')
    expect(b.getSnapshot().checkpoint).toMatchObject({ cursor, draft: 'kept draft' })

    adapter.publish('while away')
    await b.attach('viewer')
    expect(b.getSnapshot().items.map((item) => item.id)).toEqual(['output-2', 'gap:gap-3', 'output-4'])
    expect(b.getSnapshot().draft).toBe('kept draft')
    await b.refresh()
    expect(b.getSnapshot().items).toHaveLength(3)
    expect(b.getSnapshot().cursor).toBe('4')
  })

  it('restores only a bounded render window and draft from a checkpoint', async () => {
    const adapter = new FakeChatSessionAdapter()
    adapter.publish('one')
    adapter.publish('two')
    adapter.publish('three')
    const first = createChatSessionBinding(adapter, {}, 2)
    await first.attach('viewer')
    expect(first.getSnapshot().items.map((item) => item.id)).toEqual(['output-2', 'output-3'])
    first.setDraft('remember me')
    const checkpoint = first.getSnapshot().checkpoint
    await first.detach()
    const restored = createChatSessionBinding(adapter, checkpoint, 2)
    adapter.publish('four')
    await restored.attach('viewer')
    expect(restored.getSnapshot().items.map((item) => item.id)).toEqual(['output-3', 'output-4'])
    expect(restored.getSnapshot().draft).toBe('remember me')
  })

  it('disables input when a lease expires while keeping the draft', async () => {
    class ExpiringAdapter extends FakeChatSessionAdapter {
      override async acquire(attachment: ChatSessionAttachment) {
        const lease = await super.acquire(attachment)
        return { ...lease, expiresAt: Date.now() + 100 }
      }
    }
    const binding = createChatSessionBinding(new ExpiringAdapter())
    binding.setDraft('unsent')
    await binding.attach('controller')
    expect(binding.getSnapshot().access).toBe('controller')
    await waitFor(() => expect(binding.getSnapshot().access).toBe('waiting'))
    expect(binding.getSnapshot().draft).toBe('unsent')
    expect(await binding.submit()).toBe(false)
  })
})
