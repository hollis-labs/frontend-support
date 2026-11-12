import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { Envelope, EnvelopeBody, EnvelopeHeader } from './envelope'

export interface DocumentCardProps {
  readonly title: ReactNode
  /** Already-rendered content. The host chooses Markdown, text or trusted HTML. */
  readonly children: ReactNode
  readonly meta?: ReactNode
  readonly actions?: ReactNode
  /** Host-owned section links or controls; no global DOM IDs are assumed. */
  readonly navigation?: ReactNode
  readonly className?: string
}

/** A bounded reading pane, composing the existing card chassis. */
export function DocumentCard({ title, children, meta, actions, navigation, className }: DocumentCardProps) {
  return (
    <Envelope className={className}>
      <EnvelopeHeader icon={FileText} label="Document" tone="info" meta={meta} action={actions} />
      <EnvelopeBody title={title} />
      {navigation ? <div className="flex gap-2 overflow-x-auto border-y border-border-subtle bg-surface px-4 py-2">{navigation}</div> : null}
      <div data-slot="document-card-content" className="max-h-96 min-w-0 overflow-auto px-4 pb-3 text-control leading-relaxed text-fg [overflow-wrap:anywhere]">
        {children}
      </div>
    </Envelope>
  )
}
