import type { ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'

/** Controlled record directory. The app owns filtering, selection, drafts and commands. */
export function AdminDirectory({ label, records, detail, controls, layout = 'balanced' }: { label: string; records: ReactNode; detail: ReactNode; controls?: ReactNode; layout?: 'balanced' | 'wide' | 'compact' }) {
  return <section aria-label={label} className="min-w-0">
    {controls}
    <div className={cn('min-w-0', layout === 'balanced' ? 'grid lg:grid-cols-3' : 'flex flex-col lg:flex-row')}>
      <div className={cn('min-w-0 max-h-80 overflow-y-auto border-b border-border lg:max-h-none lg:border-b-0 lg:border-r', layout === 'wide' && 'lg:w-104 lg:shrink-0', layout === 'compact' && 'lg:w-84 lg:shrink-0')}>{records}</div>
      <div className={cn('min-w-0', layout === 'balanced' ? 'lg:col-span-2' : 'flex-1')}>{detail}</div>
    </div>
  </section>
}

/** One selectable directory row with shared type, spacing and selected/keyboard feedback. */
export function AdminRecordButton({ title, description, avatar, badge, selected, onSelect, muted = false }: {
  title: ReactNode; description?: ReactNode; avatar?: ReactNode; badge?: ReactNode; selected: boolean; onSelect: () => void; muted?: boolean; /** @deprecated Both legacy sizes now follow the dashboard typography profile. */ size?: 'default' | 'comfortable'
}) {
  return <button type="button" aria-current={selected ? 'true' : undefined} onClick={onSelect}
    className={cn('flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none', selected && 'bg-panel-2', muted && 'opacity-60')}>
    {avatar && <span className="shrink-0">{avatar}</span>}
    <span className="min-w-0 flex-1">
      <span className="block break-words dash-record-title text-fg">{title}</span>
      {description && <span className="block break-words dash-record-metadata text-fg-muted">{description}</span>}
    </span>
    {badge && <span className="shrink-0 dash-support">{badge}</span>}
  </button>
}

/** Reusable metadata presentation; missing values stay explicit. */
export function AdminFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="grid grid-cols-1 min-w-0 gap-x-4 gap-y-2 dash-support sm:grid-cols-3">
    {items.map(({label,value})=><div key={label} className="contents"><dt className="text-fg-faint">{label}</dt><dd className="min-w-0 break-words sm:col-span-2">{value ?? 'Not captured'}</dd></div>)}
  </dl>
}
