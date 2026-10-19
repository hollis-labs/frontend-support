import type { ComponentProps, ReactNode } from 'react'
import { Button, cn, Input, Tabs, TabsList, TabsTrigger, Textarea } from '@hollis-labs/design-components'

/** Configuration section shared by inspectors, editors and review plans. */
export function AdminHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 font-mono dash-caption uppercase tracking-widest text-fg-faint">{children}</h3>
}

export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return <section aria-label={title} className="min-w-0 border-b border-border px-5 py-4">
    <AdminHeading>{title}</AdminHeading>{children}
  </section>
}

/** A semantic definition pair. Supply application-specific missing-value text. */
export function AdminFact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-wrap gap-x-3 gap-y-1 py-0.5 dash-body">
    <dt className="w-28 shrink-0 font-mono dash-label uppercase tracking-wider text-fg-faint">{label}</dt>
    <dd className="min-w-0 flex-1 basis-40 break-words text-fg">{children}</dd>
  </div>
}

export function AdminBadge({ className, ...props }: ComponentProps<'span'>) {
  return <span {...props} className={cn('inline-flex border border-border px-1.5 py-0.5 font-mono dash-label text-fg-muted', className)} />
}

/** Standard button behavior with the compact configuration idiom. */
export function AdminActionButton({ tone = 'ghost', className, type = 'button', ...props }: ComponentProps<'button'> & { tone?: 'primary' | 'danger' | 'ghost' }) {
  return <Button {...props} type={type} variant={tone === 'primary' ? 'default' : tone === 'danger' ? 'destructive' : 'outline'} className={cn('font-mono dash-label uppercase tracking-widest', className)} />
}

/** Controlled tabs: the base primitive owns arrow-key navigation and disabled tabs. */
export function AdminTabs<K extends string>({ label, value, onChange, items, actions }: {
  label: string; value: K; onChange: (value: K) => void;
  items: readonly { key: K; label: string; disabled?: boolean; title?: string }[]; actions?: ReactNode
}) {
  return <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-border px-4 py-1.5">
    <Tabs value={value} onValueChange={next => onChange(next as K)}>
      <TabsList aria-label={label} className="h-auto flex-wrap gap-1 bg-transparent p-0">
        {items.map(item => <TabsTrigger key={item.key} value={item.key} disabled={item.disabled} title={item.title}
          className="h-auto px-2.5 py-1 font-mono dash-label font-normal uppercase tracking-widest data-active:bg-panel-2 data-active:text-fg">{item.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
    {actions && <div className="ml-auto">{actions}</div>}
  </div>
}

/** Validation remains host-owned; field presentation is shared. */
export function AdminField({ label, htmlFor, changed, issues, children }: {
  label: string; htmlFor?: string; changed?: boolean;
  issues?: readonly { level: string; message: string }[]; children: ReactNode
}) {
  return <div className={cn('min-w-0 border-l-2 py-1 pl-3', changed ? 'border-warning/70' : 'border-transparent')}>
    <label htmlFor={htmlFor} className="mb-1 block font-mono dash-label uppercase tracking-wider text-fg-faint">{label}{changed && <span className="ml-2 text-warning">changed</span>}</label>
    {children}
    {issues?.map((issue, i) => <p key={i} className={cn('mt-1 dash-support', issue.level === 'error' ? 'text-danger' : 'text-warning')}>{issue.message}</p>)}
  </div>
}

export function AdminInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input {...props} className={cn('min-w-0 font-mono dash-control', className)} />
}

/** Native select preserves option/form semantics and uses dashboard control tokens. */
export function AdminSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} className={cn('w-full min-w-0', className)} />
}

export function AdminTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  return <Textarea {...props} className={cn('min-w-0 font-mono dash-control', className)} />
}
