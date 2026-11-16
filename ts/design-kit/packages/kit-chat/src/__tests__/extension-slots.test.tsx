import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatComposer } from '../components/chat-composer'
import { ChatStream } from '../components/chat-stream'
import { ChatContextChips, ChatDrawerToggles, ChatSharedItemsStrip, ChatSlotPicker } from '../components/chat-extensions'
import { ChatNotice, ChatStepsFold } from '../components/stream-extensions'
import { ExtensionSlotsDemo } from '../../demo/extension-slots'

describe('host extension slots', () => {
  it('composer strips and drawer controls report host actions', () => {
    const removeContext = vi.fn(), removeShared = vi.fn(), toggle = vi.fn(), select = vi.fn()
    render(<ChatComposer onSubmit={() => {}}
      above={<><ChatContextChips chips={[{ id: 'ctx', label: 'Current page', removeLabel: 'Remove page', onRemove: removeContext }]} /><ChatSharedItemsStrip items={[{ id: 'file', label: 'Plan.md', removeLabel: 'Remove file', onRemove: removeShared }]} /></>}
      toolbarStart={<ChatDrawerToggles drawers={[{ id: 'scratch', label: 'Scratchpad', open: false, onToggle: toggle }]} />}
      footer={<ChatSlotPicker options={[{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]} value="one" onChange={select} />}
    />)
    expect(screen.getByText('Current page')).toBeTruthy()
    expect(screen.getByText('Plan.md')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Scratchpad' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Context slot' }), { target: { value: 'two' } })
    expect(removeContext).toHaveBeenCalledWith('ctx')
    expect(removeShared).toHaveBeenCalledWith('file')
    expect(toggle).toHaveBeenCalledWith('scratch', true)
    expect(select).toHaveBeenCalledWith('two')
  })

  it('a second editor uses the same send contract and keeps failed drafts', async () => {
    const send = vi.fn().mockResolvedValue(false)
    render(<ChatComposer defaultValue="hello" onSubmit={send} renderEditor={({ value, onValueChange, onSubmit }) => <div>
      <input aria-label="Rich text" value={value} onChange={(event) => onValueChange(event.target.value)} />
      <button type="button" onClick={onSubmit}>Send rich</button>
    </div>} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Rich text' }), { target: { value: 'formatted text' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send rich' }))
    expect(send).toHaveBeenCalledWith('formatted text')
    await Promise.resolve()
    expect((screen.getByRole('textbox', { name: 'Rich text' }) as HTMLInputElement).value).toBe('formatted text')
  })

  it('per-kind stream renderers preserve default rows and show notices and folded steps', () => {
    render(<ChatStream items={[
      { kind: 'message', id: 'm', role: 'assistant', content: 'Default message' },
      { kind: 'marker', id: 'n', variant: 'compaction', label: 'Compacted' },
      { kind: 'card', id: 's', wireKind: 'app.steps', content: <ChatStepsFold steps={[{ id: 'one', content: 'Read' }, { id: 'two', content: 'Failed', failed: true }]} /> },
    ]} renderers={{ marker: (item) => <ChatNotice>{item.label}</ChatNotice> }} />)
    expect(screen.getByText('Default message')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Compacted')
    const fold = screen.getByText('2 steps · 1 failed')
    expect(fold).toBeTruthy()
    fireEvent.click(fold)
    expect((fold.closest('details') as HTMLDetailsElement).open).toBe(true)
  })

  it('message and card renderers receive their typed item; renderItem still wins', () => {
    const message = vi.fn((item: { id: string }) => <span>Message {item.id}</span>)
    const card = vi.fn((item: { wireKind: string }) => <span>Card {item.wireKind}</span>)
    const items = [
      { kind: 'message' as const, id: 'm', role: 'assistant' as const, content: 'Default' },
      { kind: 'card' as const, id: 'c', wireKind: 'app.notice', content: 'Default card' },
    ]
    const { rerender } = render(<ChatStream items={items} renderers={{ message, card }} />)
    expect(screen.getByText('Message m')).toBeTruthy()
    expect(screen.getByText('Card app.notice')).toBeTruthy()
    expect(message).toHaveBeenCalledWith(items[0])
    expect(card).toHaveBeenCalledWith(items[1])
    rerender(<ChatStream items={items} renderers={{ message, card }} renderItem={(item) => <span>Full {item.id}</span>} />)
    expect(screen.getByText('Full m')).toBeTruthy()
    expect(screen.queryByText('Message m')).toBeNull()
  })

  it('renders the complete extension fixture with a second editor', () => {
    render(<ExtensionSlotsDemo />)
    expect(screen.getByText('Focused window')).toBeTruthy()
    expect(screen.getByText('Shared document')).toBeTruthy()
    expect(screen.getByText('2 steps')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Use rich editor' }))
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeTruthy()
  })
})
