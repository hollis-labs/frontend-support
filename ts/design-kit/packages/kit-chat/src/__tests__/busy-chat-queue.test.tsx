import { act, render, renderHook, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBusyChatQueue } from '../lib/use-busy-chat-queue'
import { BusyChatQueue } from '../components/busy-chat-queue'
import { ChatComposer } from '../components/chat-composer'

describe('busy chat queue', () => {
  it('holds busy sends, reorders and edits them, then delivers in order when idle', async () => {
    const send = vi.fn(async (text: string) => Boolean(text))
    let id = 0
    const { result, rerender } = renderHook(({ busy }) => useBusyChatQueue({ busy, send, createId: () => `q${++id}` }), { initialProps: { busy: true } })
    await act(async () => { expect(await result.current.submit('first')).toBe(true); expect(await result.current.submit('second')).toBe(true) })
    expect(send).not.toHaveBeenCalled()
    act(() => { result.current.edit('q2', 'edited'); result.current.move('q2', -1) })
    expect(result.current.items.map((item) => item.text)).toEqual(['edited', 'first'])
    rerender({ busy: false })
    await waitFor(() => expect(result.current.items).toEqual([]))
    expect(send.mock.calls.map(([text]) => text)).toEqual(['edited', 'first'])
  })

  it('keeps a failed immediate draft and a failed queued message editable until retry', async () => {
    const send = vi.fn().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(true)
    let busy = false
    const { result, rerender } = renderHook(() => useBusyChatQueue({ busy, send, createId: () => 'q1' }))
    await act(async () => { expect(await result.current.submit('draft')).toBe(false) })
    expect(result.current.items).toEqual([])
    busy = true; rerender()
    await act(async () => { expect(await result.current.submit('queued')).toBe(true) })
    busy = false; rerender()
    await waitFor(() => expect(result.current.items[0]?.status).toBe('failed'))
    expect(result.current.items[0]?.text).toBe('queued')
    act(() => result.current.edit('q1', 'revised'))
    expect(result.current.items[0]?.status).toBe('failed')
    act(() => result.current.retry('q1'))
    await waitFor(() => expect(result.current.items).toEqual([]))
    expect(send).toHaveBeenLastCalledWith('revised')
  })

  it('cancels queued work before an idle flush', async () => {
    const send = vi.fn(async (text: string) => Boolean(text))
    const { result, rerender } = renderHook(({ busy }) => useBusyChatQueue({ busy, send, createId: () => 'q1' }), { initialProps: { busy: true } })
    await act(async () => { await result.current.submit('discard me') })
    act(() => result.current.cancel('q1'))
    rerender({ busy: false })
    expect(result.current.items).toEqual([])
    expect(send).not.toHaveBeenCalled()
  })

  it('shows editable, cancellable queue controls', () => {
    const onEdit = vi.fn(), onCancel = vi.fn(), onMove = vi.fn(), onRetry = vi.fn()
    render(<BusyChatQueue items={[{ id: 'one', text: 'hello', status: 'failed', error: 'offline' }]} onEdit={onEdit} onCancel={onCancel} onMove={onMove} onRetry={onRetry} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Queued message 1' }), { target: { value: 'updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel message 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onEdit).toHaveBeenCalledWith('one', 'updated')
    expect(onCancel).toHaveBeenCalledWith('one')
    expect(onRetry).toHaveBeenCalledWith('one')
    expect(screen.getByRole('alert').textContent).toBe('offline')
  })

  it('connects to ChatComposer: failed direct send retains draft, busy send clears into queue', async () => {
    const send = vi.fn(async () => false)
    function Harness({ busy }: { busy: boolean }) {
      const queue = useBusyChatQueue({ busy, send, createId: () => 'q1' })
      return <><ChatComposer onSubmit={queue.submit} /><BusyChatQueue items={queue.items} onEdit={queue.edit} onCancel={queue.cancel} onMove={queue.move} onRetry={queue.retry} /></>
    }
    const { rerender } = render(<Harness busy={false} />)
    const box = screen.getByRole('combobox') as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'keep me' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(send).toHaveBeenCalledWith('keep me'))
    expect(box.value).toBe('keep me')
    rerender(<Harness busy />)
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(box.value).toBe(''))
    expect((screen.getByRole('textbox', { name: 'Queued message 1' }) as HTMLTextAreaElement).value).toBe('keep me')
  })
})
