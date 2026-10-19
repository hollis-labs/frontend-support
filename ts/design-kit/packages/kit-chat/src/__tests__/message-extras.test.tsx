import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageAction, MessageActions, MessageBranch, MessageBranchContent, MessageBranchNext, MessageBranchPage, MessageBranchPrevious, MessageBranchSelector } from '../components/message'
import { Shimmer } from '../components/shimmer'

afterEach(cleanup)
function Branch({ count = 3, branch, defaultBranch = 0, onBranchChange }: { count?: number; branch?: number; defaultBranch?: number; onBranchChange?: (index: number) => void }) {
  return <MessageBranch branch={branch} defaultBranch={defaultBranch} onBranchChange={onBranchChange}>
    <MessageBranchContent>{Array.from({ length: count }, (_, i) => <input key={i} aria-label={`Draft ${i}`} defaultValue={`Answer ${i}`} />)}</MessageBranchContent>
    <MessageBranchSelector><MessageBranchPrevious /><MessageBranchPage /><MessageBranchNext /></MessageBranchSelector>
  </MessageBranch>
}
describe('message extras', () => {
  it('renders accessible actions and merges Base UI tooltip events without submitting a form', () => {
    const action = vi.fn(), submit = vi.fn()
    render(<form onSubmit={submit}><MessageActions><MessageAction label="Copy answer" tooltip="Copy" onClick={action}>Copy icon</MessageAction></MessageActions></form>)
    const button = screen.getByRole('button', { name: 'Copy icon Copy answer' })
    fireEvent.click(button)
    expect(action).toHaveBeenCalledOnce()
    expect(submit).not.toHaveBeenCalled()
    expect(button.getAttribute('type')).toBe('button')
  })
  it('wraps both ways, reports changes and preserves inactive local drafts', () => {
    const changed = vi.fn()
    render(<Branch onBranchChange={changed} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Draft 0' }), { target: { value: 'edited' } })
    fireEvent.click(screen.getByRole('button', { name: 'Previous branch' }))
    expect(screen.getByRole('textbox', { name: 'Draft 2' })).toBeTruthy()
    expect(changed).toHaveBeenLastCalledWith(2)
    fireEvent.click(screen.getByRole('button', { name: 'Next branch' }))
    expect(screen.getByRole('textbox', { name: 'Draft 0' })).toHaveProperty('value', 'edited')
    expect(screen.getByText('1 of 3')).toBeTruthy()
  })
  it('lets the host accept or reject a controlled selection', () => {
    const changed = vi.fn()
    const view = render(<Branch branch={1} onBranchChange={changed} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next branch' }))
    expect(changed).toHaveBeenCalledWith(2)
    expect(screen.getByRole('textbox', { name: 'Draft 1' })).toBeTruthy()
    view.rerender(<Branch branch={2} onBranchChange={changed} />)
    expect(screen.getByRole('textbox', { name: 'Draft 2' })).toBeTruthy()
  })
  it('handles empty, single, shrinking and out-of-range branches without false pages', async () => {
    const view = render(<Branch defaultBranch={9} />)
    expect(screen.getByRole('textbox', { name: 'Draft 2' })).toBeTruthy()
    view.rerender(<Branch count={2} />)
    await waitFor(() => expect(screen.getByText('2 of 2')).toBeTruthy())
    expect(screen.getByRole('textbox', { name: 'Draft 1' })).toBeTruthy()
    view.rerender(<Branch count={1} />)
    expect(screen.queryByRole('group')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Draft 0' })).toBeTruthy()
    view.rerender(<Branch count={0} />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('normalizes a scalar child and disables single-branch navigation', () => {
    const changed = vi.fn()
    render(<MessageBranch onBranchChange={changed}><MessageBranchContent><p>Only answer</p></MessageBranchContent><MessageBranchNext /></MessageBranch>)
    expect(screen.getByText('Only answer')).toBeTruthy()
    expect(screen.getByRole('button')).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button'))
    expect(changed).not.toHaveBeenCalled()
  })
})
describe('Shimmer', () => {
  it('renders readable text and chosen element without a motion dependency', () => {
    render(<Shimmer as="span" duration={3} spread={1}>Thinking</Shimmer>)
    const text = screen.getByText('Thinking')
    expect(text.tagName).toBe('SPAN')
    expect(text.className).toContain('text-fg-muted')
    expect(text.style.getPropertyValue('--hl-chat-shimmer-duration')).toBe('3s')
  })
  it('keeps invalid and zero timing inputs valid', () => {
    const view = render(<Shimmer duration={NaN} spread={Infinity}>Thinking</Shimmer>)
    expect(screen.getByText('Thinking').style.getPropertyValue('--hl-chat-shimmer-duration')).toBe('2s')
    view.rerender(<Shimmer duration={0}>Thinking</Shimmer>)
    expect(screen.getByText('Thinking').style.getPropertyValue('--hl-chat-shimmer-duration')).toBe('0s')
  })
})
