import type { ReactNode } from 'react'
import { ChatInput, type ChatInputProps } from './chat-input'
import { useChatSessionBinding, type ChatSessionBinding, type ChatSessionPresence } from '../lib/chat-session'

export interface ChatSessionComposerProps extends Omit<ChatInputProps, 'value' | 'onValueChange' | 'onSubmit' | 'disabled' | 'error'> {
  readonly binding: ChatSessionBinding
  /** Presence is host supplied. Chathost currently exposes attachments but no presence query. */
  readonly renderPresence?: (members: readonly ChatSessionPresence[]) => ReactNode
}

/** Read-only until this view holds a current writer lease. Draft stays in the binding. */
export function ChatSessionComposer({ binding, renderPresence, ...input }: ChatSessionComposerProps) {
  const state = useChatSessionBinding(binding)
  const canType = state.access === 'controller' && state.lease !== null
  return <section data-slot="chat-session-composer" className="flex min-w-0 flex-col gap-2">
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-caption text-fg-muted">
      <span role="status">{state.access === 'controller' ? 'You control this conversation' : state.access === 'viewer' ? 'Viewing only' : state.access === 'waiting' ? 'Another view controls input' : 'Detached'}</span>
      {state.access === 'viewer' || state.access === 'waiting' ? <button type="button" onClick={() => { void binding.requestTakeover() }} disabled={state.takeoverPending} className="text-info underline">Take control</button> : null}
    </div>
    {renderPresence ? renderPresence(state.presence) : <ChatSessionPresence members={state.presence} />}
    <ChatInput {...input} value={state.draft} onValueChange={binding.setDraft} onSubmit={(text) => { void binding.submit(text) }} disabled={!canType} busy={state.pending || input.busy} error={state.error} />
  </section>
}

export function ChatSessionPresence({ members }: { readonly members: readonly ChatSessionPresence[] }) {
  return <div data-slot="chat-session-presence" className="text-caption text-fg-muted" aria-label="Conversation presence">
    {members.length ? members.map((member) => <span key={member.id} className="mr-2">{member.label} ({member.role})</span>) : 'No presence available'}
  </div>
}
