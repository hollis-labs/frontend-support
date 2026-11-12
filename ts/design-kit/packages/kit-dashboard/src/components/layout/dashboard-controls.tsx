import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'

/** A wrapping control row. Each field stays together; actions align to controls. */
export function DashboardToolbar({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('dash-toolbar', className)} />
}

export interface DashboardFieldProps extends ComponentProps<'label'> {
  label: ReactNode
  /** Inline for filter bands; stacked for forms and longer record selectors. */
  orientation?: 'inline' | 'stacked'
}

/** Wrap one labelable control, or use htmlFor for a separately rendered control. */
export function DashboardField({ label, orientation = 'inline', className, children, ...props }: DashboardFieldProps) {
  return <label {...props} data-orientation={orientation} className={cn('dash-field', className)}>
    <span className="dash-field-label">{label}</span>
    {children}
  </label>
}

/** Inset section label aligned with dashboard table cells, with space above the next group. */
export function DashboardSection({ title, summary, children }: { title: string; summary?: ReactNode; children: ReactNode }) {
  return <section aria-label={title} className="min-w-0">
    <DashboardToolbar className="px-3 pb-2 pt-4">
      <h2 className="dash-section-heading">{title}</h2>
      {summary && <span className="dash-support text-fg-faint">{summary}</span>}
    </DashboardToolbar>
    {children}
  </section>
}
