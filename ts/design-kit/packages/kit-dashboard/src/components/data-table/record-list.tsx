import type { ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'
import { RecordSummary } from './record-summary'

/** Shared columns for compact linked lists and draggable records. Host owns navigation. */
export function RecordListContent({ title, metadata, status, trailing }: {
  title: ReactNode; metadata?: ReactNode; status?: ReactNode; trailing?: ReactNode
}) {
  return <>
    <RecordSummary title={typeof title === 'string' ? <span title={title}>{title}</span> : title} metadata={metadata} />
    <span className="flex min-w-0 items-center">{status}</span>
    <span className="dash-record-number flex items-center justify-end text-right text-fg-faint tabular-nums">{trailing}</span>
  </>
}

export function RecordListHeader({ title = 'Item', status = 'Status', trailing }: {
  title?: string; status?: string; trailing?: ReactNode
}) {
  return <div className="dash-record-grid dash-record-list-header dash-table-heading text-fg-faint" aria-hidden="true">
    <span>{title}</span><span>{status}</span><span className="text-right">{trailing}</span>
  </div>
}

/** Inline metadata fact, separate from the larger status pill. */
export function RecordTag({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  return <span title={title} className={cn('dash-record-tag dash-record-metadata max-w-full rounded border border-border-subtle bg-panel-2/30 px-1.5 text-fg-faint', className)}>{children}</span>
}

/** Ordered rank, distinct from the fixed P1/P2/P3 severity vocabulary. */
export function RankBadge({ children }: { children: ReactNode }) {
  return <span className="dash-record-rank dash-record-priority rounded px-1.5 py-0.5">{children}</span>
}
