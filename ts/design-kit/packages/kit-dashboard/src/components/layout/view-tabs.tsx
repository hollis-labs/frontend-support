import { Tabs, TabsList, TabsTrigger, cn } from '@hollis-labs/design-components'
import { statusTone, type StatusKey } from '../../lib/status'

export interface DashboardViewTab {
  value: string
  label: string
  count?: number
  tone?: StatusKey
}

/** Compact view navigation; the base tabs own keyboard and selection semantics. */
export function DashboardViewTabs({ label, value, onChange, items, variant = 'pills' }: {
  variant?: 'pills' | 'segments'
  label: string; value: string; onChange: (value: string) => void; items: readonly DashboardViewTab[]
}) {
  return <Tabs value={value} onValueChange={onChange} className={cn('min-w-0 shrink-0 border-b border-border bg-panel', variant === 'pills' && 'px-4 py-2')}>
    <TabsList aria-label={label} className={cn('max-w-full flex-wrap justify-start bg-transparent p-0 group-data-horizontal/tabs:h-auto', variant === 'segments' ? 'dash-segment-tabs gap-0' : 'dash-view-tabs gap-1')}>
      {items.map(item => {
        const tone = statusTone(item.tone ?? 'doing')
        return <TabsTrigger key={item.value} value={item.value} data-dashboard-tone={item.tone ?? 'doing'} className={cn(variant === 'pills' && value === item.value && `${tone.border} ${tone.bg} ${tone.text}`)}>
          {variant === 'pills' && <span className={cn('size-1.5 shrink-0 rounded-full', tone.dot)} />}
          {item.label}
          {item.count != null && <span className="font-mono tabular-nums opacity-70">{item.count}</span>}
        </TabsTrigger>
      })}
    </TabsList>
  </Tabs>
}
