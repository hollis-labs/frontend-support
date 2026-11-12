import { useState } from 'react'
import { Button, Callout, Input, JsonViewer, Pill } from '@hollis-labs/design-components'
import { ChatInput, ChatStream, InfoCard, MetricCard, ProgressCard } from '@hollis-labs/kit-chat'
import { StatusBadge } from '../../src/components/status-badge'
import { PriorityBadge } from '../../src/components/priority-badge'

const tones = ['success', 'warning', 'danger', 'info'] as const
const statuses = ['backlog', 'todo', 'queued', 'doing', 'review', 'done', 'blocked', 'paused', 'archived'] as const

/** A real mixed-package surface for reviewing every theme/mode pair. */
export function ThemeGalleryView() {
  const [draft, setDraft] = useState('')
  return (
    <main className="flex-1 overflow-auto bg-bg p-6 text-fg" data-testid="theme-gallery">
      <h1 className="mb-4 text-xl font-semibold">Light / dark theme proof</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4" aria-label="Base components">
          <h2 className="text-lg font-semibold">design-components</h2>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button><Button variant="outline">Outline</Button><Button variant="destructive">Delete</Button>
          </div>
          <Input aria-label="Example input" placeholder="Search components" />
          <div className="flex flex-wrap gap-2"><Pill>neutral</Pill>{tones.map((tone) => <Pill key={tone} tone={tone}>{tone}</Pill>)}</div>
          {tones.map((tone) => <Callout key={tone} tone={tone} title={tone}>Readable feedback on a tinted surface.</Callout>)}
          <div className="rounded-md border border-border bg-bg-elevated p-3"><JsonViewer value={{ ready: true, mode: 'theme proof', items: 3, pending: null }} /></div>
          <p className="text-sm text-fg-secondary">Secondary text</p>
          <p className="text-sm text-fg-muted">Muted text</p>
          <p className="text-sm text-fg-faint">Faint text</p>
        </section>
        <section className="space-y-4" aria-label="Dashboard components">
          <h2 className="text-lg font-semibold">kit-dashboard</h2>
          <div className="rounded-md border border-border bg-panel-2 p-4 text-text">
            <h3 className="mb-2 font-semibold">Operations</h3>
            <p className="mb-4 text-sm text-text-subtle">Workflow labels on a dashboard panel</p>
            <div className="flex flex-wrap gap-2">{statuses.map((status) => <StatusBadge key={status} status={status} />)}</div>
            <div className="mt-4 flex gap-2"><PriorityBadge priority={1} /><PriorityBadge priority={2} /><PriorityBadge priority={3} /></div>
          </div>
          <div className="rounded-md border border-divider bg-panel p-4 text-text-muted">
            <p className="font-semibold">Panel and borders</p>
            <p className="mt-2 text-sm text-text-soft">Dashboard text follows the active base theme.</p>
          </div>
          <div className="show-scrollbar h-32 overflow-auto rounded-md border border-border bg-bg-elevated p-3" role="region" tabIndex={0} aria-label="Visible scrollbar example">
            <p className="mb-3 text-label text-fg">Opt-in visible scrollbar</p>
            <div className="space-y-3">{statuses.map((status) => <div key={status}><StatusBadge status={status} /></div>)}</div>
          </div>
        </section>
        <section className="space-y-4" aria-label="Chat components">
          <h2 className="text-lg font-semibold">kit-chat</h2>
          <ChatStream items={[
            { kind: 'message', id: 'user', role: 'user', content: <p>Show the current theme.</p> },
            { kind: 'message', id: 'assistant', role: 'assistant', content: <p>All packages share the same palette.</p> },
          ]} />
          <InfoCard title="Theme ready" body="Status, heading, and body text remain legible." tone="info" />
          <MetricCard label="Components checked" value="3 packages" description="Base, dashboard, and chat" />
          <ProgressCard title="Verification" percent={75} />
          <ChatInput value={draft} onValueChange={setDraft} onSubmit={() => {}} placeholder="Write a message…" />
        </section>
      </div>
    </main>
  )
}
