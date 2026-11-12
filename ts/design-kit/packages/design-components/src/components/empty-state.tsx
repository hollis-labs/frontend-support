import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { AlertCircle, Inbox, SearchX } from 'lucide-react'

export type EmptyStateVariant = 'empty' | 'no-results' | 'error'

interface EmptyStateProps {
  variant: EmptyStateVariant
  title: string
  description: string
  /** Small uppercase eyebrow above the title. */
  eyebrow?: string
  action?: {
    label: string
    onClick: () => void
  }
  /** Optional shell command shown in a code block (e.g. a setup hint). */
  command?: string
}

const ICONS: Record<EmptyStateVariant, ReactNode> = {
  empty: <Inbox className="h-10 w-10 text-fg-faint" />,
  'no-results': <SearchX className="h-10 w-10 text-fg-faint" />,
  error: <AlertCircle className="h-10 w-10 text-danger-muted" />,
}

/**
 * Centered empty / no-results / error panel. Borderless and compact — sits
 * inside a page body or table region.
 */
export function EmptyState({
  variant,
  title,
  description,
  eyebrow,
  action,
  command,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {ICONS[variant]}
      <div className="space-y-1">
        {eyebrow ? (
          // `tracking-eyebrow` — the step added in review round 2, at the 0.28em
          // this site had before the contract had a name for it. It rendered
          // visibly tighter in the interim, because an arbitrary value could not
          // pass a gate enforced at zero and `tracking-label` (0.16) was the
          // nearest that existed. Restored, not changed.
          <p className="text-caption font-semibold uppercase tracking-eyebrow text-fg-faint">
            {eyebrow}
          </p>
        ) : null}
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-md text-sm text-fg-faint">{description}</p>
      </div>
      {command ? (
        <pre className="mt-1 w-full max-w-md overflow-x-auto rounded-md border border-border bg-bg px-3 py-2 text-left text-xs text-fg-secondary">
          <code>{command}</code>
        </pre>
      ) : null}
      {action ? (
        <Button variant="outline" size="sm" className="mt-1" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}
