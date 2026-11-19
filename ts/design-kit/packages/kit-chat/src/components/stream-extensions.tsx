import type { ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'

/** A compact app notice for a marker renderer or a status strip. */
export interface ChatNoticeProps {
  readonly children: ReactNode
  readonly tone?: 'info' | 'warning' | 'error'
  readonly className?: string
}

export function ChatNotice({ children, tone = 'info', className }: ChatNoticeProps) {
  return <div data-slot="chat-notice" role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-control border px-3 py-2 text-caption', tone === 'error' ? 'border-danger text-danger' : 'border-border text-fg-muted', className)}>{children}</div>
}

/** App-supplied step content; kit-chat owns only the fold interaction. */
export interface ChatStepItem {
  readonly id: string
  readonly content: ReactNode
  readonly failed?: boolean
}

export interface ChatStepsFoldProps {
  readonly steps: readonly ChatStepItem[]
  readonly label?: string
  readonly defaultOpen?: boolean
}

export function ChatStepsFold({ steps, label, defaultOpen = false }: ChatStepsFoldProps) {
  if (steps.length === 0) return null
  const failures = steps.filter((step) => step.failed).length
  return <details data-slot="chat-steps-fold" open={defaultOpen || undefined} className="rounded-control border border-border px-3 py-2 text-caption text-fg-secondary">
    <summary className="cursor-pointer select-none">{label ?? `${steps.length} steps`}{failures ? ` · ${failures} failed` : ''}</summary>
    <div className="mt-2 space-y-2">{steps.map((step) => <div key={step.id} data-slot="chat-step" data-failed={step.failed || undefined}>{step.content}</div>)}</div>
  </details>
}
