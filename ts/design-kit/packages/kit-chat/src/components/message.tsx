/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/message.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/message.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: actions/branching only; Base UI render tooltips; native grouped controls; controlled selection and normalized children; tokens; no ai/markdown imports.
 */
import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useState, type ComponentProps, type HTMLAttributes } from 'react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, cn } from '@hollis-labs/design-components'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export type MessageActionsProps = ComponentProps<'div'>
export function MessageActions({ className, ...props }: MessageActionsProps) {
  return <div className={cn('flex items-center gap-1', className)} {...props} />
}
export type MessageActionProps = ComponentProps<typeof Button> & { tooltip?: string; label?: string }
export function MessageAction({ tooltip, children, label, variant = 'ghost', size = 'icon-sm', ...props }: MessageActionProps) {
  const button = <Button size={size} variant={variant} {...props} type="button">{children}<span className="sr-only">{label || tooltip}</span></Button>
  return tooltip ? <TooltipProvider><Tooltip><TooltipTrigger render={button} /><TooltipContent>{tooltip}</TooltipContent></Tooltip></TooltipProvider> : button
}

interface MessageBranchContextType {
  currentBranch: number
  totalBranches: number
  setTotalBranches: (count: number) => void
  goToPrevious: () => void
  goToNext: () => void
}
const MessageBranchContext = createContext<MessageBranchContextType | null>(null)
function useMessageBranch() {
  const context = useContext(MessageBranchContext)
  if (!context) throw new Error('MessageBranch components must be used within MessageBranch')
  return context
}
function normalize(index: number, count: number) {
  return count > 0 && Number.isFinite(index) ? Math.max(0, Math.min(Math.trunc(index), count - 1)) : 0
}
export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number
  /** Controlled branch index. The host applies onBranchChange to accept a selection. */
  branch?: number
  onBranchChange?: (branchIndex: number) => void
}
export function MessageBranch({ defaultBranch = 0, branch, onBranchChange, className, ...props }: MessageBranchProps) {
  const [internalBranch, setInternalBranch] = useState(defaultBranch)
  const [totalBranches, setTotalBranches] = useState(0)
  const currentBranch = normalize(branch ?? internalBranch, totalBranches)
  const select = useCallback((index: number) => {
    if (totalBranches <= 1) return
    if (branch === undefined) setInternalBranch(index)
    onBranchChange?.(index)
  }, [branch, onBranchChange, totalBranches])
  const goToPrevious = useCallback(() => select(currentBranch > 0 ? currentBranch - 1 : totalBranches - 1), [currentBranch, select, totalBranches])
  const goToNext = useCallback(() => select(currentBranch < totalBranches - 1 ? currentBranch + 1 : 0), [currentBranch, select, totalBranches])
  const value = useMemo(() => ({ currentBranch, totalBranches, setTotalBranches, goToPrevious, goToNext }), [currentBranch, totalBranches, goToPrevious, goToNext])
  return <MessageBranchContext.Provider value={value}><div className={cn('grid w-full gap-2', className)} {...props} /></MessageBranchContext.Provider>
}
export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>
/** Use one Content per Branch. Inactive branches stay mounted, preserving local drafts. */
export function MessageBranchContent({ children, className, ...props }: MessageBranchContentProps) {
  const { currentBranch, setTotalBranches } = useMessageBranch()
  const branches = Children.toArray(children)
  const count = branches.length
  useEffect(() => { setTotalBranches(count) }, [count, setTotalBranches])
  // Normalize against the current children too, so a shrinking list never paints a blank branch.
  const selected = normalize(currentBranch, count)
  return branches.map((child, index) => <div key={isValidElement(child) ? child.key : index} className={cn('gap-2', index === selected ? 'grid' : 'hidden', className)} {...props} hidden={index !== selected}>{child}</div>)
}
export type MessageBranchSelectorProps = HTMLAttributes<HTMLDivElement>
export function MessageBranchSelector({ className, ...props }: MessageBranchSelectorProps) {
  const { totalBranches } = useMessageBranch()
  return totalBranches <= 1 ? null : <div role="group" aria-label="Message branches" className={cn('flex w-fit items-center gap-1 rounded-control border border-border', className)} {...props} />
}
export type MessageBranchPreviousProps = ComponentProps<typeof Button>
export function MessageBranchPrevious({ children, onClick, disabled, ...props }: MessageBranchPreviousProps) {
  const { goToPrevious, totalBranches } = useMessageBranch()
  return <Button aria-label="Previous branch" size="icon-sm" variant="ghost" {...props} type="button" disabled={disabled || totalBranches <= 1} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) goToPrevious() }}>{children ?? <ChevronLeftIcon className="size-3.5" />}</Button>
}
export type MessageBranchNextProps = ComponentProps<typeof Button>
export function MessageBranchNext({ children, onClick, disabled, ...props }: MessageBranchNextProps) {
  const { goToNext, totalBranches } = useMessageBranch()
  return <Button aria-label="Next branch" size="icon-sm" variant="ghost" {...props} type="button" disabled={disabled || totalBranches <= 1} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) goToNext() }}>{children ?? <ChevronRightIcon className="size-3.5" />}</Button>
}
export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>
export function MessageBranchPage({ className, ...props }: MessageBranchPageProps) {
  const { currentBranch, totalBranches } = useMessageBranch()
  return <span className={cn('px-2 text-caption text-fg-muted', className)} aria-live="polite" aria-atomic="true" {...props}>{totalBranches ? currentBranch + 1 : 0} of {totalBranches}</span>
}
