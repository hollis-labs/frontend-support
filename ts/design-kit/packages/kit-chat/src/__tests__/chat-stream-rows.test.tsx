import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatStream } from '../components/chat-stream'
import type { ChatItem } from '../lib/types'

afterEach(cleanup)
const msg = (id: string, source = `text ${id}`): ChatItem => ({ kind: 'message', id, role: 'assistant', content: source, source })

describe('ChatStream rows', () => {
  it('does not re-render unchanged rows when a sibling item changes', () => {
    const items = [msg('a'), msg('b')]
    const renderItem = vi.fn((item: ChatItem) => <p>{item.id}</p>)
    const { rerender } = render(<ChatStream items={items} renderItem={renderItem} />)
    expect(renderItem).toHaveBeenCalledTimes(2)
    rerender(<ChatStream items={[items[0]!, msg('b', 'edited'), msg('c')]} renderItem={renderItem} />)
    // a is skipped; b changed and c is new.
    expect(renderItem.mock.calls.map(([i]) => i.id)).toEqual(['a', 'b', 'b', 'c'])
  })

  it('keeps row DOM nodes across a parent re-render', () => {
    const items = [msg('a')]
    const { rerender } = render(<ChatStream items={items} />)
    const row = screen.getByText('text a')
    rerender(<ChatStream items={items} className="other" />)
    expect(screen.getByText('text a')).toBe(row)
  })

  it('offers Copy, Download and Details only when asked and a source exists', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const onDetails = vi.fn()
    const items: ChatItem[] = [msg('a'), { kind: 'message', id: 'b', role: 'user', content: 'no source' }]
    const { rerender } = render(<ChatStream items={items} />)
    expect(screen.queryByRole('button', { name: /Copy/ })).toBeNull()
    rerender(<ChatStream items={items} messageActions={{ copy: true, download: true, onDetails }} />)
    expect(screen.getAllByRole('button', { name: /Copy message/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /Download message/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /Message details/ })).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /Copy message/ }))
    expect(writeText).toHaveBeenCalledWith('text a')
    await waitFor(() => expect(screen.getByRole('button', { name: /Copied/ })).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: /Message details/ })[1]!)
    expect(onDetails).toHaveBeenCalledWith(items[1])
  })
})
