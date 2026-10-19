import type { ComponentProps, ReactNode } from 'react'
import { cn, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@hollis-labs/design-components'
import { ActivityMetric } from './activity-directory'

/** Content-sized activity inspection. The host owns selection and evidence;
 * the dialog primitive owns focus, Escape and the viewport's scrolling. */
export function ActivityDialog({ open, onClose, title, avatar, description, metadata, status, accessory, score, children }: {
  open: boolean; onClose: () => void; title: string; avatar: ReactNode;
  description: ReactNode; metadata?: ReactNode; status: ReactNode;
  accessory?: ReactNode; score?: ReactNode; children: ReactNode
}) {
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose() }}>
    <DialogContent widthClassName="max-w-2xl">
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-4">
          <span className="shrink-0 border-2 border-fg-faint/50 bg-bg p-1.5">{avatar}</span>
          <div className="min-w-0 flex-1 basis-32">
            <DialogTitle className="break-words font-mono text-base font-medium uppercase leading-none tracking-wide">{title}</DialogTitle>
            <DialogDescription className="mt-1 break-words font-mono text-label tracking-wider">{description}</DialogDescription>
            {metadata && <div className="break-words font-mono text-label tracking-wider text-fg-muted">{metadata}</div>}
            <div className="mt-1">{status}</div>
          </div>
          <div className="ml-auto flex shrink-0 items-start gap-4 pt-4 text-right">
            {accessory}
            {score}
          </div>
        </div>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
}

/** Dense value-first facts, with full values available as text/title. */
export function ActivityFacts({ label = 'Activity facts', items }: {
  label?: string; items: { label: string; value: ReactNode; title?: string }[]
}) {
  return <div role="group" aria-label={label} className="grid grid-cols-2 gap-3 border-y border-border py-3 sm:grid-cols-4">
    {items.map(item => <ActivityMetric key={item.label} {...item} />)}
  </div>
}

/** Compact observation/action section, without an additional card surface. */
export function ActivitySection({ title, children, spacing = 'default' }: {
  title: string; children: ReactNode; spacing?: 'default' | 'tight'
}) {
  return <section aria-label={title} className={spacing === 'tight' ? 'mt-1' : 'mt-3'}>
    <h3 className="mb-1 font-mono text-caption font-normal uppercase tracking-widest text-fg-faint">{title}</h3>
    {children}
  </section>
}

/** Small outlined action for activity inspectors; availability is host-owned. */
export function ActivityActionButton({ className, type = 'button', ...props }: ComponentProps<'button'>) {
  return <button {...props} type={type} className={cn('border border-border px-2.5 py-1 font-mono text-caption uppercase tracking-widest text-fg-muted transition-colors hover:border-fg-faint hover:text-fg focus-visible:bg-panel-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40', className)} />
}
