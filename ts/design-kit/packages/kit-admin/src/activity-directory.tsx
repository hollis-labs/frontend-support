import type { ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'

/** Compact grouped activity list. Ranking and aggregation remain host-owned. */
export function ActivityGroup({ title, metadata, summary, children }: {
  title: string; metadata?: ReactNode; summary?: ReactNode; children: ReactNode
}) {
  return <section aria-label={title} className="min-w-0">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border bg-panel px-4 py-1.5 font-mono">
      <h2 className="text-label font-normal uppercase tracking-widest">{title}</h2>
      {metadata && <span className="min-w-0 break-all dash-record-metadata text-fg-faint">{metadata}</span>}
      {summary && <span className="ml-auto dash-support tabular-nums text-warning">{summary}</span>}
    </div>
    {children}
  </section>
}

/** Value-first metric, shared by activity rows and detail summaries. */
export function ActivityMetric({ label, value, title, highlight = false, size = 'default' }: {
  label: string; value: ReactNode; title?: string; highlight?: boolean; size?: 'default' | 'prominent'
}) {
  return <span className="block min-w-0" title={title}>
    <span className={cn('block truncate font-mono tabular-nums', size === 'prominent' ? 'text-xl' : 'text-sm', highlight && 'text-warning')}>{value}</span>
    <span className="block dash-shortcut font-mono uppercase tracking-widest text-fg-faint">{label}</span>
  </span>
}

/** Unboxed status for dense activity lists. A label always accompanies the dot. */
export function ActivityStatus({ label, detail, tone = 'muted' }: {
  label: string; detail?: string; tone?: 'positive' | 'attention' | 'neutral' | 'muted'
}) {
  const color = { positive: 'text-success', attention: 'text-warning', neutral: 'text-info', muted: 'text-fg-faint' }[tone]
  return <span className={cn('inline-flex flex-wrap items-center gap-1.5 font-mono dash-caption leading-normal uppercase tracking-widest', color)}>
    <span className="size-1.5 shrink-0 bg-current" aria-hidden />
    {label}
    {detail && <span className="normal-case tracking-normal text-fg-faint">· {detail}</span>}
  </span>
}

/** One inspectable identity with aligned ranks, metrics and optional history.
 * Slots are presentation only; the host supplies evidence and handles selection. */
export function ActivityRecord({ label, onSelect, rank, avatar, name, metadata, description, status, metrics, history, accessory, score, muted = false, attention = false }: {
  label: string; onSelect: () => void; rank: ReactNode; avatar: ReactNode;
  name: string; metadata?: ReactNode; description?: ReactNode; status: ReactNode;
  metrics?: ReactNode; history?: ReactNode; accessory?: ReactNode; score: ReactNode;
  muted?: boolean; attention?: boolean
}) {
  return <li className="border-b border-border">
    <button type="button" aria-label={label} onClick={onSelect}
      className={cn('group flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none', attention && 'bg-warning-muted', muted && 'opacity-70')}>
      <span className="w-8 shrink-0 text-center dash-record-metadata text-fg-faint">{rank}</span>
      <span className="shrink-0 border-2 border-fg-faint/50 bg-bg p-1 group-hover:border-fg-faint">{avatar}</span>
      <span className="flex min-h-16 min-w-0 flex-1 basis-48 flex-col justify-center">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="min-w-0 truncate font-mono text-sm uppercase tracking-wide"><strong className="font-semibold">{name}</strong></span>
          {metadata && <span className="min-w-0 truncate dash-record-metadata uppercase text-fg-faint">{metadata}</span>}
        </span>
        {description && <span className="mt-0.5 block truncate text-xs leading-4.5 text-fg-muted">{description}</span>}
        {status}
      </span>
      {metrics && <span className="hidden shrink-0 gap-4 sm:flex">{metrics}</span>}
      {history && <span className="hidden w-30 shrink-0 md:block">{history}</span>}
      {accessory && <span className="flex w-4 shrink-0 justify-center">{accessory}</span>}
      <span className="w-20 shrink-0 text-right">{score}</span>
    </button>
  </li>
}
