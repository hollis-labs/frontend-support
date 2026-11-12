/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/tool.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/tool.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI; own presentational state/name, no AI SDK types; JsonViewer/host content instead of CodeBlock; falsy output retained; tokens.
 */
import { Badge, Collapsible, CollapsibleContent, CollapsibleTrigger, JsonViewer, cn } from '@hollis-labs/design-components'
import { CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon } from 'lucide-react'
import { isValidElement, type ComponentProps, type ReactNode } from 'react'

/** Presentation only; the host maps its own tool lifecycle onto these states. */
export type ToolState = 'pending' | 'running' | 'awaiting-confirmation' | 'confirmed' | 'completed' | 'denied' | 'error'
export type ToolProps = ComponentProps<typeof Collapsible>
export function Tool({ className, ...props }: ToolProps) {
  return <Collapsible className={cn('group not-prose mb-4 w-full rounded-panel border border-border', className)} {...props} />
}
const statusPresentation = {
  pending: { label: 'Pending', icon: CircleIcon, color: 'text-fg-muted' },
  running: { label: 'Running', icon: ClockIcon, color: 'text-info' },
  'awaiting-confirmation': { label: 'Awaiting confirmation', icon: ClockIcon, color: 'text-warning' },
  confirmed: { label: 'Confirmed', icon: CheckCircleIcon, color: 'text-info' },
  completed: { label: 'Completed', icon: CheckCircleIcon, color: 'text-success' },
  denied: { label: 'Denied', icon: XCircleIcon, color: 'text-warning' },
  error: { label: 'Error', icon: XCircleIcon, color: 'text-danger' },
} as const
export type ToolHeaderProps = ComponentProps<typeof CollapsibleTrigger> & { toolName: string; title?: string; state: ToolState }
export function ToolHeader({ className, title, toolName, state, ...props }: ToolHeaderProps) {
  const { label, icon: Icon, color } = statusPresentation[state]
  return <CollapsibleTrigger className={cn('flex w-full items-center justify-between gap-4 p-3 text-control', className)} {...props}>
    <span className="flex min-w-0 flex-wrap items-center gap-2"><WrenchIcon className="size-4 shrink-0 text-fg-muted" /><span className="break-words font-medium">{title ?? toolName}</span><Badge variant="secondary" className="gap-1.5 rounded-full text-caption"><Icon className={cn('size-4', color)} />{label}</Badge></span>
    <ChevronDownIcon className="size-4 shrink-0 text-fg-muted transition-transform motion-reduce:transition-none group-data-[open]:rotate-180" />
  </CollapsibleTrigger>
}
export type ToolContentProps = ComponentProps<typeof CollapsibleContent>
export function ToolContent({ className, ...props }: ToolContentProps) { return <CollapsibleContent className={cn('space-y-4 p-4 text-fg', className)} {...props} /> }
function renderValue(value: unknown): ReactNode {
  return isValidElement(value) ? value : <JsonViewer value={value} />
}
export type ToolInputProps = ComponentProps<'div'> & { input: unknown }
export function ToolInput({ className, input, children, ...props }: ToolInputProps) {
  return <div className={cn('space-y-2 overflow-hidden', className)} {...props}><h4 className="text-caption font-medium uppercase tracking-wide text-fg-muted">Parameters</h4>{children ?? renderValue(input)}</div>
}
export type ToolOutputProps = ComponentProps<'div'> & { output?: unknown; errorText?: string }
export function ToolOutput({ className, output, errorText, children, ...props }: ToolOutputProps) {
  if (output === undefined && errorText === undefined && children === undefined) return null
  return <div className={cn('space-y-2', className)} {...props}><h4 className="text-caption font-medium uppercase tracking-wide text-fg-muted">{errorText !== undefined ? 'Error' : 'Result'}</h4><div className={cn('overflow-x-auto rounded-panel p-2 text-control', errorText !== undefined ? 'bg-danger-muted text-danger-fg' : 'bg-surface text-fg')}>
    {errorText !== undefined && <p>{errorText}</p>}{children ?? (output !== undefined ? renderValue(output) : null)}
  </div></div>
}
