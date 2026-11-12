import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatComposer } from '../components/chat-composer'

afterEach(cleanup)
const box = () => screen.getByRole('combobox') as HTMLTextAreaElement
const type = (v: string) => fireEvent.change(box(), { target: { value: v } })
const enter = () => fireEvent.keyDown(box(), { key: 'Enter' })

describe('ChatComposer', () => {
  it('owns the draft and clears after a successful submit', () => {
    const onSubmit = vi.fn()
    render(<ChatComposer onSubmit={onSubmit} />)
    type('  hello ')
    enter()
    expect(onSubmit).toHaveBeenCalledWith('hello')
    expect(box().value).toBe('')
  })
  it('keeps the draft when the host returns false or the send rejects', async () => {
    const onSubmit = vi.fn().mockReturnValueOnce(false).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(undefined)
    render(<ChatComposer onSubmit={onSubmit} />)
    type('hi'); enter()
    expect(box().value).toBe('hi')
    enter()
    await Promise.resolve(); await Promise.resolve()
    expect(box().value).toBe('hi')
    enter()
    await waitFor(() => expect(box().value).toBe(''))
  })
  it('does not submit an empty draft and does not re-render on parent renders', () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<ChatComposer onSubmit={onSubmit} />)
    enter()
    expect(onSubmit).not.toHaveBeenCalled()
    type('keep')
    rerender(<ChatComposer onSubmit={onSubmit} />)
    expect(box().value).toBe('keep')
  })
  it('keeps and does not report a newer draft typed while a send is pending', async () => {
    let finish!: (v: boolean | void) => void
    const onSubmit = vi.fn(() => new Promise<boolean | void>((r) => { finish = r }))
    const onDraftChange = vi.fn()
    render(<ChatComposer onSubmit={onSubmit} onDraftChange={onDraftChange} />)
    type('A'); enter()
    type('B')
    onDraftChange.mockClear()
    finish(undefined)
    await Promise.resolve(); await Promise.resolve()
    expect(box().value).toBe('B')
    expect(onDraftChange).not.toHaveBeenCalled()
  })
  it('clears and reports once when the sent draft is still current', async () => {
    let finish!: (v: boolean | void) => void
    const onSubmit = vi.fn(() => new Promise<boolean | void>((r) => { finish = r }))
    const onDraftChange = vi.fn()
    render(<ChatComposer onSubmit={onSubmit} onDraftChange={onDraftChange} />)
    type('A'); enter()
    onDraftChange.mockClear()
    finish(undefined)
    await waitFor(() => expect(box().value).toBe(''))
    expect(onDraftChange).toHaveBeenCalledTimes(1)
    expect(onDraftChange).toHaveBeenCalledWith('')
  })
  it('a late completion after unmount or a keyed conversation switch touches nothing', async () => {
    let finish!: (v: boolean | void) => void
    const onSubmit = vi.fn(() => new Promise<boolean | void>((r) => { finish = r }))
    const first = vi.fn()
    const second = vi.fn()
    const { rerender, unmount } = render(<ChatComposer key="c1" onSubmit={onSubmit} onDraftChange={first} />)
    type('A'); enter()
    rerender(<ChatComposer key="c2" defaultValue="A" onSubmit={onSubmit} onDraftChange={second} />)
    first.mockClear(); second.mockClear()
    finish(undefined)
    await Promise.resolve(); await Promise.resolve()
    expect(box().value).toBe('A')
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
    unmount()
  })
  it('does not report anything when a pending send finishes after unmount', async () => {
    let finish!: (v: boolean | void) => void
    const onSubmit = vi.fn(() => new Promise<boolean | void>((r) => { finish = r }))
    const onDraftChange = vi.fn()
    const { unmount } = render(<ChatComposer onSubmit={onSubmit} onDraftChange={onDraftChange} />)
    type('A'); enter()
    onDraftChange.mockClear()
    unmount()
    finish(undefined)
    await Promise.resolve(); await Promise.resolve()
    expect(onDraftChange).not.toHaveBeenCalled()
  })
})
