import type { AgentSession, Item } from "@hollis-labs/ade-agent"
import { type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react"

/** The conversation as it stands; re-renders as it changes. */
export function useAgentSession(session: AgentSession) {
  return useSyncExternalStore(session.subscribe, session.get, session.get)
}

/** The little of markdown a model writes in a sentence: **bold**, *italic*, `code`. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        // biome-ignore lint/suspicious/noArrayIndexKey: pieces of one string, in order
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
          return <strong key={i}>{p.slice(2, -2)}</strong>
        // biome-ignore lint/suspicious/noArrayIndexKey: pieces of one string, in order
        if (p.startsWith("`") && p.endsWith("`") && p.length > 2)
          return <code key={i}>{p.slice(1, -1)}</code>
        // biome-ignore lint/suspicious/noArrayIndexKey: pieces of one string, in order
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2)
          return <em key={i}>{p.slice(1, -1)}</em>
        return p
      })}
    </>
  )
}

function Row({
  item,
  describe,
}: {
  item: Item
  describe: (name: string, input: unknown) => string
}) {
  switch (item.kind) {
    case "user":
      return item.auto ? (
        <div className="ade-chat-auto">{item.auto}</div>
      ) : (
        <div className="ade-chat-user">{item.text}</div>
      )
    case "text":
      return item.text ? (
        <div className="ade-chat-text">
          <Inline text={item.text} />
        </div>
      ) : null
    case "tool":
      return (
        <details className="ade-chat-tool" data-error={item.isError ? "true" : undefined}>
          <summary>
            <span data-running={item.running ? "true" : undefined} />
            {describe(item.name, item.input) || item.name}
          </summary>
          {item.result && <pre>{item.result.slice(0, 4000)}</pre>}
        </details>
      )
    case "notice":
      return (
        <div className="ade-chat-notice" data-tone={item.tone}>
          {item.text}
        </div>
      )
  }
}

/**
 * A conversation with the agent: what was said, the calls it made (folded), the question
 * when it needs permission, and a box to write in. Plain on purpose: an application with a
 * chat of its own draws the same session its own way.
 */
export function AgentPanel({
  session,
  title = "Agent",
  placeholder = "Ask, or say what you want to do…",
}: {
  session: AgentSession
  title?: string
  placeholder?: string
}) {
  const s = useAgentSession(session)
  const [draft, setDraft] = useState("")
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void session.start()
  }, [session])
  // Stay at the end as it grows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the items change
  useEffect(() => {
    const el = list.current
    if (el) el.scrollTop = el.scrollHeight
  }, [s.items])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || s.run) return
    setDraft("")
    void session.send(text).then((ok) => {
      if (!ok) setDraft(text)
    })
  }
  const off = s.loaded && s.state && (!s.state.available || !s.state.ready)

  return (
    <section className="ade-chat" aria-label={title}>
      <header>
        <strong>{title}</strong>
        <span>{s.run ? "working…" : (s.state?.model ?? "")}</span>
        <button
          type="button"
          disabled={!!s.run || !s.items.length}
          onClick={() => void session.newThread()}
        >
          New
        </button>
      </header>
      <div className="ade-chat-list" ref={list}>
        {off && (
          <div className="ade-chat-notice" data-tone="quiet">
            No model is connected. The surface still works by hand.
          </div>
        )}
        {s.items.map((it) => (
          <Row key={it.id} item={it} describe={session.describeCall} />
        ))}
        {s.error && (
          <div className="ade-chat-notice" data-tone="error">
            {s.error}
          </div>
        )}
      </div>
      {s.approval && (
        <div className="ade-chat-ask" role="alertdialog" aria-label="Permission">
          <p>
            {s.approval.description ||
              session.describeCall(s.approval.tool, s.approval.input) ||
              s.approval.tool}
          </p>
          <div>
            <button type="button" data-primary="true" onClick={() => void session.answer("once")}>
              Allow
            </button>
            {s.approval.standing && (
              <>
                <button type="button" onClick={() => void session.answer("session")}>
                  This session
                </button>
                <button type="button" onClick={() => void session.answer("always")}>
                  Always
                </button>
              </>
            )}
            <button type="button" onClick={() => void session.answer("deny")}>
              Don't
            </button>
          </div>
        </div>
      )}
      <form onSubmit={submit}>
        <textarea
          value={draft}
          rows={2}
          placeholder={placeholder}
          aria-label="Message"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e)
          }}
        />
        {s.run ? (
          <button type="button" onClick={() => session.stop()}>
            Stop
          </button>
        ) : (
          <button type="submit" data-primary="true" disabled={!draft.trim()}>
            Send
          </button>
        )}
      </form>
    </section>
  )
}
