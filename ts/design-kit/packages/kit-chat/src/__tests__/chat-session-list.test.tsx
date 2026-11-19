import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatSessionList } from '../components/chat-session-list'

const sessions = [
  { id: 'a', title: 'Planning', agent: 'Archie', unread: 2, presence: 'online' },
  { id: 'b', title: 'Review', agent: 'Blair', unread: 0, presence: 'away' },
  { id: 'c', title: 'Build', agent: 'Casey', unread: 1 },
]

describe('ChatSessionList', () => {
  it('filters plain sessions and selects with keyboard navigation', () => {
    const onSelect = vi.fn()
    render(<ChatSessionList sessions={sessions} selectedId="a" onSelect={onSelect} />)
    const first = screen.getByRole('option', { name: /Planning/ })
    act(() => first.focus())
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('option', { name: /Review/ }))
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(sessions[1])
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search sessions' }), { target: { value: 'Casey' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: /Build/ })).not.toBeNull()
  })

  it('renders host unread and presence slots and an empty search state', () => {
    render(<ChatSessionList sessions={sessions} onSelect={() => {}} renderUnread={(session) => <b>{session.unread ?? 0} unread</b>} renderPresence={(session) => <i>{session.presence ?? 'unknown'}</i>} />)
    expect(screen.getByText('2 unread')).not.toBeNull()
    expect(screen.getByText('online')).not.toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search sessions' }), { target: { value: 'missing' } })
    expect(screen.getByText('No sessions')).not.toBeNull()
  })
})
