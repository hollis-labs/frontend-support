import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChatHistory } from '../lib/use-chat-history'
import type { ChatHistoryPage, ChatHistoryRequest } from '../lib/use-chat-history'

interface Item { readonly id: string; readonly text: string }
type Page = ChatHistoryPage<Item, number>
const item = (id: string, text = id): Item => ({ id, text })
const seed: Page = { items: [item('m3'), item('m4')], olderCursor: 0 }

function deferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<Value>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('useChatHistory', () => {
  it('loads only the latest window, then older pages with zero as a valid cursor', async () => {
    const loadPage = vi.fn().mockResolvedValueOnce(seed).mockResolvedValueOnce({ items: [item('m1'), item('m2')], olderCursor: null })
    const { result } = renderHook(() => useChatHistory<Item, number>({ loadPage }))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.items).toEqual(seed.items))
    expect(loadPage).toHaveBeenCalledTimes(1)
    expect(loadPage.mock.calls[0][0].cursor).toBeNull()
    await act(() => result.current.loadOlder())
    expect(loadPage.mock.calls[1][0].cursor).toBe(0)
    expect(result.current.items.map((i) => i.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
    expect(result.current.history.hasOlder).toBe(false)
    await act(() => result.current.loadOlder())
    expect(loadPage).toHaveBeenCalledTimes(2)
  })

  it('coalesces rapid requests and preserves live updates/appends over overlapping pages', async () => {
    const page = deferred<Page>()
    const loadPage = vi.fn(() => page.promise)
    const { result } = renderHook(() => useChatHistory({ initialPage: seed, loadPage }))
    act(() => { void result.current.loadOlder(); void result.current.loadOlder() })
    expect(loadPage).toHaveBeenCalledTimes(1)
    expect(result.current.history.loading).toBe(true)
    act(() => result.current.append([item('m3', 'live edit'), item('m5'), item('m5', 'latest')]))
    await act(async () => page.resolve({ items: [item('m1'), item('m1'), item('m2'), item('m3', 'stale')], olderCursor: null }))
    expect(result.current.items).toEqual([item('m1'), item('m2'), item('m3', 'live edit'), item('m4'), item('m5', 'latest')])
  })

  it('retains messages and the cursor on failure so retry requests the same page', async () => {
    const loadPage = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ items: [item('m2')], olderCursor: null })
    const { result } = renderHook(() => useChatHistory<Item, number>({ initialPage: seed, loadPage }))
    await act(() => result.current.loadOlder())
    expect(result.current.items).toEqual(seed.items)
    expect(result.current.history.error).toBe('Offline')
    expect(result.current.history.hasOlder).toBe(true)
    await act(() => result.current.history.onLoadOlder())
    expect(loadPage.mock.calls.map(([r]) => r.cursor)).toEqual([0, 0])
    expect(result.current.error).toBeNull()
    expect(result.current.history.hasOlder).toBe(false)
  })

  it('offers initial-load retry through the same presentation seam', async () => {
    const loadPage = vi.fn().mockRejectedValueOnce('offline').mockResolvedValueOnce(seed)
    const { result } = renderHook(() => useChatHistory<Item, number>({ loadPage }))
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.loading).toBe(false)
    expect(result.current.history.error).toBe('Unable to load message history.')
    await act(() => result.current.history.onLoadOlder())
    expect(loadPage.mock.calls.map(([r]) => r.cursor)).toEqual([null, null])
    expect(result.current.items).toEqual(seed.items)
  })

  it('advances through empty/overlapping pages and rejects a stuck cursor without corrupting items', async () => {
    const loadPage = vi.fn().mockResolvedValueOnce({ items: [], olderCursor: 2 }).mockResolvedValueOnce({ items: [item('bad')], olderCursor: 2 }).mockResolvedValueOnce({ items: [item('m3')], olderCursor: null })
    const { result } = renderHook(() => useChatHistory<Item, number>({ initialPage: seed, loadPage }))
    await act(() => result.current.loadOlder())
    expect(result.current.history.hasOlder).toBe(true)
    await act(() => result.current.loadOlder())
    expect(result.current.error?.message).toMatch(/cursor did not advance/)
    expect(result.current.items).toEqual(seed.items)
    await act(() => result.current.loadOlder())
    expect(loadPage.mock.calls.map(([r]) => r.cursor)).toEqual([0, 2, 2])
    expect(result.current.items).toEqual(seed.items)
    expect(result.current.history.hasOlder).toBe(false)
  })

  it('does not replace initial windows or reload after a callback identity change', async () => {
    const loadPage = vi.fn().mockResolvedValue(seed)
    const { result, rerender } = renderHook(({ loader }) => useChatHistory<Item, number>({ loadPage: loader }), { initialProps: { loader: loadPage } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const replacement = vi.fn().mockResolvedValue({ items: [], olderCursor: null })
    rerender({ loader: replacement })
    expect(replacement).not.toHaveBeenCalled()
    expect(result.current.items).toEqual(seed.items)
    await act(() => result.current.loadOlder())
    expect(replacement).toHaveBeenCalledOnce()
  })

  it('does not auto-retry a failed initial load when the host recreates its loader', async () => {
    const loadPage = vi.fn().mockRejectedValue(new Error('Offline'))
    const { result, rerender } = renderHook(({ loader }) => useChatHistory<Item, number>({ loadPage: loader }), { initialProps: { loader: loadPage } })
    await waitFor(() => expect(result.current.error?.message).toBe('Offline'))
    const replacement = vi.fn().mockResolvedValue(seed)
    rerender({ loader: replacement })
    expect(replacement).not.toHaveBeenCalled()
    await act(() => result.current.loadOlder())
    expect(replacement).toHaveBeenCalledOnce()
    expect(result.current.items).toEqual(seed.items)
  })

  it('aborts old session work on unmount and ignores a transport that resolves despite abort', async () => {
    const page = deferred<Page>()
    const loadPage = vi.fn<(request: ChatHistoryRequest<number>) => Promise<Page>>().mockImplementation(() => page.promise)
    const old = renderHook(() => useChatHistory({ initialPage: seed, loadPage }))
    act(() => { void old.result.current.loadOlder() })
    old.unmount()
    expect(loadPage.mock.calls[0][0].signal.aborted).toBe(true)
    const next = renderHook(() => useChatHistory({ initialPage: { items: [item('other')], olderCursor: null }, loadPage }))
    await act(async () => page.resolve({ items: [item('stale')], olderCursor: null }))
    expect(next.result.current.items).toEqual([item('other')])
    expect(old.result.current.items).toEqual(seed.items)
  })

  it('survives StrictMode setup/cleanup and ignores the first canceled initial response', async () => {
    const first = deferred<Page>()
    const second = deferred<Page>()
    const loadPage = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useChatHistory<Item, number>({ loadPage }), { wrapper: StrictMode })
    expect(loadPage.mock.calls[0][0].signal.aborted).toBe(true)
    await act(async () => second.resolve(seed))
    await act(async () => first.resolve({ items: [item('stale')], olderCursor: null }))
    expect(result.current.items).toEqual(seed.items)
    expect(result.current.loading).toBe(false)
  })
})
