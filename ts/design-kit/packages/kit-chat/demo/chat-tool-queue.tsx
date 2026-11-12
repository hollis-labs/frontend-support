import { useState } from 'react'
import { ConfirmationCard, ConfirmationTitle, ConfirmationRequest, ConfirmationAccepted, ConfirmationRejected, Tool, ToolHeader, ToolContent, ToolInput, ToolOutput, Queue, QueueSection, QueueSectionTrigger, QueueSectionLabel, QueueSectionContent, QueueList, QueueItem, QueueItemIndicator, QueueItemContent, QueueItemActions, QueueItemAction, QueueItemAttachment, QueueItemFile } from '@hollis-labs/kit-chat'

export function ChatToolQueueDemo() {
  const [priorStatus, setPriorStatus] = useState<string>()
  const [priorActionId, setPriorActionId] = useState<string>()
  const [queued, setQueued] = useState(true)
  return <main className="mx-auto max-w-3xl space-y-4 bg-bg p-4 text-fg">
    <h1 className="text-heading font-semibold">Tool and queue presentation</h1>
    <Tool defaultOpen><ToolHeader toolName="file-search" state="completed" /><ToolContent><ToolInput input={{ query: 'handoff' }} /><ToolOutput output={{ found: 2 }} /></ToolContent></Tool>
    <ConfirmationCard title="Apply proposed changes?" actions={[{ id: 'decision-17', label: 'Proceed', primary: true }, { id: 'decision-42', label: 'Hold' }]} priorStatus={priorStatus} priorActionId={priorActionId} onRespond={outcome => { setPriorStatus(outcome.status); setPriorActionId(outcome.status === 'submitted' ? outcome.decisions?.[0]?.action : undefined) }}>
      <ConfirmationTitle>Review the host-provided diff before deciding.</ConfirmationTitle>
      <ConfirmationRequest><p className="mt-2 text-control">This request is waiting for your decision.</p></ConfirmationRequest>
      <ConfirmationAccepted actionId="decision-17"><p className="mt-2 text-control text-success">Host says: changes accepted.</p></ConfirmationAccepted>
      <ConfirmationRejected actionId="decision-42"><p className="mt-2 text-control text-warning">Host says: changes held.</p></ConfirmationRejected>
    </ConfirmationCard>
    <Queue><QueueSection><QueueSectionTrigger><QueueSectionLabel count={queued ? 1 : 0} label="queued items" /></QueueSectionTrigger><QueueSectionContent><QueueList aria-label="Queued work">
      {queued && <QueueItem><div className="flex items-center gap-2"><QueueItemIndicator /><QueueItemContent>Review report</QueueItemContent><QueueItemActions><QueueItemAction aria-label="Remove queued item" onClick={() => setQueued(false)}>×</QueueItemAction></QueueItemActions></div><QueueItemAttachment><QueueItemFile>report-with-a-long-filename.md</QueueItemFile></QueueItemAttachment></QueueItem>}
    </QueueList></QueueSectionContent></QueueSection></Queue>
  </main>
}
