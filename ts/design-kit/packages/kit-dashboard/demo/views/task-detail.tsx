import { useListNavigation } from '../../src/data'
import { PriorityBadge } from '../../src'
import { formatRelativeTime } from '@hollis-labs/design-app-runtime'
import { Button, CopyableId, DetailSection, EmptyState, JsonViewer, MetaList, Pill } from '@hollis-labs/design-components'
import { DetailHeader } from '../../src/layout'
import { DetailPageLayout } from '@hollis-labs/design-components'
import { getTask } from '../fixtures/tasks'

/**
 * Torque-shaped task detail page, rebuilt on `DetailPageLayout` +
 * `DetailHeader` + `DetailSection` + `MetaList` + `JsonViewer`.
 */

interface TaskDetailViewProps {
  orderedIds: string[]
  onNavigate: (id: string) => void
  taskId: string
  onBack: () => void
}

export function TaskDetailView({ taskId, onBack, orderedIds, onNavigate }: TaskDetailViewProps) {
  const task = getTask(taskId)
  const navigation = useListNavigation({ ids: orderedIds, currentId: taskId, onNavigate })

  if (!task) {
    return (
      <DetailPageLayout
        header={<DetailHeader title="Not found" backLabel="Operations" onBack={onBack} />}
      >
        <EmptyState
          variant="error"
          title="Task not found"
          description={`No task with id ${taskId}.`}
        />
      </DetailPageLayout>
    )
  }

  return (
    <DetailPageLayout
      header={
        <DetailHeader
          title={task.title}
          backLabel="Operations"
          onBack={onBack}
          id={task.id}
          status={task.status}
        >
          <div className="flex items-center gap-2" aria-label="Task navigation">
            <Button size="sm" variant="outline" disabled={!navigation.previousId} onClick={navigation.onPrev} aria-label="Previous task">←</Button>
            <span className="text-label text-fg-muted">{navigation.index + 1} / {navigation.total}</span>
            <Button size="sm" variant="outline" disabled={!navigation.nextId} onClick={navigation.onNext} aria-label="Next task">→</Button>
          </div>
          <PriorityBadge priority={task.priority} />
          {task.manual ? (
            <Pill tone="info">manual</Pill>
          ) : null}
        </DetailHeader>
      }
      aside={
        <div className="space-y-2 p-4">
          <p className="text-caption font-semibold uppercase tracking-label text-text-subtle">
            Run stats
          </p>
          <MetaList
            columns={1}
            items={[
              { label: 'Runs', value: task.stats.run_count },
              { label: 'Prompt tokens', value: task.stats.prompt_tokens.toLocaleString() },
              {
                label: 'Completion tokens',
                value: task.stats.completion_tokens.toLocaleString(),
              },
              {
                label: 'Cost',
                value: task.stats.cost > 0 ? `$${task.stats.cost.toFixed(2)}` : '—',
              },
            ]}
          />
        </div>
      }
    >
      <DetailSection title="Description">
        <p className="whitespace-pre-wrap text-control leading-6 text-text-soft">
          {task.description}
        </p>
      </DetailSection>

      <DetailSection title="Facets">
        <MetaList
          columns={3}
          items={[
            { label: 'Kind', value: task.kind },
            { label: 'Executor', value: task.executor },
            { label: 'Agent profile', value: task.agent_profile },
            {
              label: 'Working dir',
              value: <span className="font-mono text-xs">{task.working_dir}</span>,
            },
            { label: 'Project', value: task.project_id ?? '—' },
            { label: 'Priority', value: `P${task.priority}` },
            { label: 'Created', value: formatRelativeTime(task.created_at) },
            { label: 'Updated', value: formatRelativeTime(task.updated_at) },
            {
              label: 'Tags',
              value: task.tags.length > 0 ? task.tags.map((t) => t.name).join(', ') : '—',
            },
          ]}
        />
      </DetailSection>

      {task.blocked_reason ? (
        <DetailSection title="Blocked reason">
          <p className="text-control leading-6 text-dash-status-blocked">{task.blocked_reason}</p>
        </DetailSection>
      ) : null}

      {task.depends_on.length > 0 ? (
        <DetailSection title="Depends on">
          <div className="flex flex-col items-start gap-1">
            {task.depends_on.map((id) => (
              <CopyableId key={id} id={id} />
            ))}
          </div>
        </DetailSection>
      ) : null}

      <DetailSection title="Metadata">
        <JsonViewer value={task.metadata} className="max-h-72" />
      </DetailSection>
    </DetailPageLayout>
  )
}
