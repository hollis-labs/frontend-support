import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface ChatSession {
  readonly id: string
  readonly title: string
  readonly agent: string
  readonly unread?: number
  readonly presence?: string
}

export interface ChatSessionListProps {
  readonly sessions: readonly ChatSession[]
  readonly selectedId?: string
  readonly onSelect: (session: ChatSession) => void
  readonly renderUnread?: (session: ChatSession) => ReactNode
  readonly renderPresence?: (session: ChatSession) => ReactNode
  readonly empty?: ReactNode
}

/** Searchable session/agent picker over plain host-owned data. */
export function ChatSessionList({ sessions, selectedId, onSelect, renderUnread, renderPresence, empty = 'No sessions' }: ChatSessionListProps) {
  const [query, setQuery] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return needle ? sessions.filter((item) => `${item.title} ${item.agent}`.toLocaleLowerCase().includes(needle)) : sessions
  }, [sessions, query])
  const activeId = matches.some((item) => item.id === focusId) ? focusId : (matches.find((item) => item.id === selectedId)?.id ?? matches[0]?.id)

  const move = (event: KeyboardEvent, from: string | undefined) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) return
    if (event.key === 'Enter' || event.key === ' ') {
      if (from) {
        const selected = matches.find((item) => item.id === from)
        if (selected) onSelect(selected)
        event.preventDefault()
      }
      return
    }
    if (matches.length === 0) return
    event.preventDefault()
    const index = matches.findIndex((item) => item.id === from)
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? matches.length - 1
      : event.key === 'ArrowDown' ? (index + 1 + matches.length) % matches.length
        : (index - 1 + matches.length) % matches.length
    const id = matches[nextIndex]!.id
    setFocusId(id)
    buttons.current.get(id)?.focus()
  }

  return <section aria-label="Sessions">
    <input type="search" aria-label="Search sessions" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'Enter') move(event, activeId ?? undefined) }} />
    <div role="listbox" aria-label="Choose a session">
      {matches.length === 0 ? <div>{empty}</div> : matches.map((session) => <button
        key={session.id}
        type="button"
        role="option"
        aria-selected={session.id === selectedId}
        tabIndex={session.id === activeId ? 0 : -1}
        ref={(node) => { if (node) buttons.current.set(session.id, node); else buttons.current.delete(session.id) }}
        onFocus={() => setFocusId(session.id)}
        onKeyDown={(event) => move(event, session.id)}
        onClick={() => onSelect(session)}
      >
        <span>{session.title}</span>
        <span>{session.agent}</span>
        {renderUnread ? renderUnread(session) : session.unread ? <span aria-label={`${session.unread} unread`}>{session.unread}</span> : null}
        {renderPresence ? renderPresence(session) : session.presence ? <span>{session.presence}</span> : null}
      </button>)}
    </div>
  </section>
}
