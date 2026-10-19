import type { MouseEventHandler, ReactNode } from 'react'
import { Download, Package } from 'lucide-react'
import { Button } from '@hollis-labs/design-components'
import { Envelope } from './envelope'

export interface ArtifactCardProps {
  readonly name: ReactNode
  /** Preformatted MIME type, size, origin or other host-owned metadata. */
  readonly meta?: ReactNode
  readonly download?: {
    readonly href: string
    readonly filename?: string
    readonly onClick?: MouseEventHandler<HTMLAnchorElement>
  }
  readonly onDismiss?: () => void
  readonly className?: string
}

/** Compact artifact presentation. No API URL construction or drawer lifecycle. */
export function ArtifactCard({ name, meta, download, onDismiss, className }: ArtifactCardProps) {
  return (
    <Envelope className={className}>
      <div className="flex min-w-0 flex-wrap items-start gap-3 p-3">
        <Package className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          <h3 className="text-control font-medium text-fg">{name}</h3>
          {meta ? <div className="mt-1 flex flex-wrap gap-2 text-caption text-fg-muted">{meta}</div> : null}
        </div>
        {download || onDismiss ? (
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {download ? (
              <a href={download.href} download={download.filename} onClick={download.onClick}
                aria-label="Download artifact"
                className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-caption text-primary transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Download className="size-3.5" aria-hidden />Download
              </a>
            ) : null}
            {onDismiss ? <Button type="button" size="xs" variant="ghost" onClick={onDismiss}>Dismiss</Button> : null}
          </div>
        ) : null}
      </div>
    </Envelope>
  )
}
