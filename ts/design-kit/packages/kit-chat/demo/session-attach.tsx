import { useState } from 'react'
import { FakeChatSessionAdapter } from './fake-session-adapter'
import {
  ChatSessionComposer, ChatStream, createChatSessionBinding, useChatSessionBinding,
  type ChatSessionBinding,
} from '@hollis-labs/kit-chat'

function SessionView({ label, binding }: { readonly label: string; readonly binding: ChatSessionBinding }) {
  const state = useChatSessionBinding(binding)
  return <section aria-label={label} className="space-y-3">
    <h2>{label}</h2>
    <ChatStream items={state.items} />
    <ChatSessionComposer binding={binding} />
    <div className="flex gap-2">
      <button type="button" onClick={() => { void binding.detach() }}>Detach {label}</button>
      <button type="button" onClick={() => { void binding.attach(label === 'A' ? 'controller' : 'viewer') }}>Attach {label}</button>
      <button type="button" onClick={() => { void binding.refresh() }}>Refresh {label}</button>
    </div>
  </section>
}

/** Two views share one durable fake. Detach leaves events and draft in their owners. */
export function SessionAttachDemo() {
  const [{ adapter, a, b }] = useState(() => {
    const adapter = new FakeChatSessionAdapter()
    return { adapter, a: createChatSessionBinding(adapter), b: createChatSessionBinding(adapter) }
  })
  return <main className="grid gap-6 p-4">
    <button type="button" onClick={() => { void a.attach('controller').then(() => b.attach('viewer')) }}>Attach both</button>
    <button type="button" onClick={() => { adapter.publish('Output while detached'); void a.refresh(); void b.refresh() }}>Publish output</button>
    <button type="button" onClick={() => { adapter.reportGap('2', '4'); void a.refresh(); void b.refresh() }}>Report gap</button>
    <SessionView label="A" binding={a} />
    <SessionView label="B" binding={b} />
  </main>
}
