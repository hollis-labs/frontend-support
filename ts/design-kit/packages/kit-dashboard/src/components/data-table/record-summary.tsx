import type { ReactNode } from 'react'

export interface RecordSummaryProps {
  /** Text or an app-owned link. Navigation and accessible names stay with the app. */
  title: ReactNode
  /** Inline facts; omit when the record has no secondary information. */
  metadata?: ReactNode
}

/** Dense record identity, usable in a table cell, list or board row. */
export function RecordSummary({ title, metadata }: RecordSummaryProps) {
  return <div data-slot="record-summary" className="min-w-0 font-mono">
    <div data-slot="record-title" className="dash-record-title truncate text-fg [&_a]:block [&_a]:truncate [&_a]:text-inherit">
      {title}
    </div>
    {metadata != null && <div data-slot="record-metadata" className="dash-record-metadata flex h-5 min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-fg-faint">
      {metadata}
    </div>}
  </div>
}
