import type { ReactNode } from 'react'
import { GitCompare } from 'lucide-react'
import { cn } from '@hollis-labs/design-components'
import { Envelope, EnvelopeHeader } from './envelope'

/**
 * Before and after, side by side.
 *
 * THE TWO SIDES ARE A REQUIRED PAIR, NOT TWO OPTIONAL FIELDS. A diff with only a
 * `before` is not a diff — it is a quotation — and the type says so, so the invalid
 * composition does not compile. Nanite's version types both as required and then
 * normalises each with `?? { label: '', content: '' }`, which is the same knowledge
 * expressed twice and enforced neither time.
 *
 * IT STACKS ON A NARROW VIEWPORT. Two 50% columns of monospace at chat width are
 * unreadable on a phone, and a card in a transcript does not control its own width.
 * `sm:grid-cols-2` is the whole fix; the divider swaps axis with it.
 */

export interface DiffSide {
  readonly label: ReactNode
  readonly content: ReactNode
}

export interface DiffCardProps {
  readonly title?: ReactNode
  readonly before: DiffSide
  readonly after: DiffSide
  /** `code` renders monospace. Default `text`. */
  readonly format?: 'text' | 'code'
  readonly className?: string
}

export function DiffCard({ title, before, after, format = 'text', className }: DiffCardProps) {
  const contentClass = cn(
    'whitespace-pre-wrap break-words p-3 leading-relaxed text-fg-secondary',
    format === 'code' ? 'font-mono text-xs' : 'text-control',
  )

  return (
    <Envelope className={className}>
      <EnvelopeHeader icon={GitCompare} label={title ?? 'Diff'} />
      <div className="grid grid-cols-1 divide-y divide-border-subtle sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div>
          <div className="flex items-center gap-2 border-b border-border-subtle bg-danger/5 px-3 py-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
            <span className="truncate font-mono text-caption font-semibold uppercase tracking-label text-danger">
              {before.label}
            </span>
          </div>
          <div className={contentClass}>{before.content}</div>
        </div>
        <div>
          <div className="flex items-center gap-2 border-b border-border-subtle bg-success/5 px-3 py-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
            <span className="truncate font-mono text-caption font-semibold uppercase tracking-label text-success">
              {after.label}
            </span>
          </div>
          <div className={contentClass}>{after.content}</div>
        </div>
      </div>
    </Envelope>
  )
}
