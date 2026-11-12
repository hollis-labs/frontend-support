// Disposable human-review fixture; real kit components and shared cn, no DOM preview.
import { useState } from 'react'
import { Button } from '@hollis-labs/design-components'
import { ArtifactCard, DocumentCard, PromptCard, ConfirmationCard, DiffCard, InfoCard, ListCard, MetricCard, ProgressCard, TableCard, TimelineCard, CardMiss, CardFallbackDeclined, ChatInput, ChatStream } from '@hollis-labs/kit-chat'
import { ChatMarkdown } from '@hollis-labs/kit-chat/markdown'

export function ChatReview({ state }: { state: string }) {
  const [value, setValue] = useState(state === 'suggestions' ? '/he' : 'Fixture draft')
  const priorStatus = state === 'locked' ? 'submitted' : undefined
  const respond = () => {}
  const promptRespond = () => { if (state === 'error') return Promise.reject(new Error('Fixture response failed')) }
  const cards = [
    <ArtifactCard name="report.txt" download={{ href: '#report', filename: 'report.txt' }} onDismiss={() => {}} />,
    <DocumentCard title="Document" actions={<Button size="sm">Document action</Button>} navigation={<Button size="xs">Document section</Button>}><p>Host content</p></DocumentCard>,
    <PromptCard questionId="fixture" title="Prompt" value={value} onValueChange={setValue} onRespond={promptRespond} priorStatus={priorStatus} />,
    <ConfirmationCard title="Confirm" actions={[{ id: 'approve', label: 'Approve', primary: true }]} onRespond={respond} priorStatus={priorStatus} priorActionId="approve" />,
    <DiffCard title="Diff" before={{ label: 'Before', content: 'old' }} after={{ label: 'After', content: 'new' }} />,
    <InfoCard title="Info" body="Read-only information" tone="info" />,
    <ListCard title="List" items={[{ id: 'one', label: 'First', checked: true }, { id: 'two', label: 'Second' }]} onToggle={() => {}} onRespond={respond} priorStatus={priorStatus} />,
    <MetricCard label="Metric" value={0} unit="count" trend="flat" />,
    <ProgressCard title="Progress" percent={50} steps={[{ id: 'one', label: 'First', done: true }, { id: 'two', label: 'Second', done: false }]} />,
    <TableCard title="Table" rows={[{ id: 'one', name: 'First', count: 0 }]} columns={[{ key: 'name', header: 'Name', sortable: true }, { key: 'count', header: 'Count', sortable: true }]} rowId={row => row.id} onRespond={respond} priorStatus={priorStatus} />,
    <TimelineCard title="Timeline" events={[{ id: 'one', timestamp: 'Now', label: 'Active', status: 'active' }]} />,
    ...(['unclassified', 'unavailable', 'quarantined', 'ambiguous'] as const).map(code => <CardMiss code={code} wireKind={`fixture.${code}`} payload="Bounded payload" />),
    <CardFallbackDeclined wireKind="fixture.declined" degradation="Unsupported fallback" />,
  ]
  return <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4 text-fg">
    <h1>Chat radius review: {state}</h1>
    {['cards', 'locked', 'error'].includes(state) ? cards.map((card, index) => <section key={index} data-review={`card-${index}`}>{card}</section>) : state === 'markdown' ? <ChatMarkdown>{'## Markdown\n\n```js\nconst sample = 1\n```\n\n- First\n- Second'}</ChatMarkdown> : state.includes('stream') || state === 'stalled' ? <div className="flex h-96 flex-col"><ChatStream items={[{ kind: 'message', id: 'user', role: 'user', content: 'User message' }, { kind: 'message', id: 'assistant', role: 'assistant', content: 'Assistant message' }, { kind: 'card', id: 'card', wireKind: 'fixture.info', content: <InfoCard title="Inline card" body="Details" /> }, { kind: 'marker', id: 'marker', variant: 'info', label: 'Marker' }]} status={state === 'stream-error' ? { status: 'error', message: 'Fixture stream failed' } : { status: state === 'stalled' ? 'stalled' : 'streaming', role: 'assistant', content: 'Partial reply' }} /></div> : <ChatInput value={value} onValueChange={setValue} onSubmit={() => {}} busy={state === 'busy'} disabled={state === 'disabled'} onStop={() => {}} menuSide="bottom" triggers={[{ kind: 'command', char: '/', items: [{ id: 'help', label: 'Help' }], onSelect: () => {} }]} />}
  </main>
}
