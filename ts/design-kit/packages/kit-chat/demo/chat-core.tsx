import { useState } from 'react'
import { Copy, ThumbsUp } from 'lucide-react'
import { MessageAction, MessageActions, MessageBranch, MessageBranchContent, MessageBranchNext, MessageBranchPage, MessageBranchPrevious, MessageBranchSelector, Shimmer } from '@hollis-labs/kit-chat'

/** Host fixture: no API, transport or persisted transcript state. */
export function ChatCoreDemo() {
  const [branch, setBranch] = useState(0)
  const [action, setAction] = useState('No action yet')
  return <main className="mx-auto max-w-3xl space-y-4 bg-bg p-4 text-fg">
    <h1 className="text-heading font-semibold">Message actions and alternatives</h1>
    <Shimmer>Thinking through the alternatives…</Shimmer>
    <MessageBranch branch={branch} onBranchChange={setBranch}>
      <MessageBranchContent>
        <p key="short" className="rounded-panel border border-border bg-surface p-4 text-control">A short answer supplied by the host.</p>
        <p key="long" className="rounded-panel border border-border bg-surface p-4 text-control">An alternative answer. Branch selection reports an index; the host decides whether to apply it.</p>
      </MessageBranchContent>
      <MessageBranchSelector><MessageBranchPrevious /><MessageBranchPage /><MessageBranchNext /></MessageBranchSelector>
    </MessageBranch>
    <MessageActions>
      <MessageAction tooltip="Copy answer" label="Copy answer" onClick={() => setAction('Copy requested')}><Copy /></MessageAction>
      <MessageAction tooltip="Helpful" label="Helpful" onClick={() => setAction('Feedback requested')}><ThumbsUp /></MessageAction>
    </MessageActions>
    <p role="status" className="text-caption text-fg-muted">{action}</p>
  </main>
}
