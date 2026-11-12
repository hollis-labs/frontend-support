/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/chain-of-thought.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/chain-of-thought.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI/local state; one disclosure root connects header/panel; tokens; no implicit animations; bounded image slot.
 */
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'
import { Badge, Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@hollis-labs/design-components'
import { BrainIcon, ChevronDownIcon, DotIcon, type LucideIcon } from 'lucide-react'
import { useControllableOpen } from '../lib/use-controllable-open'

const ChainOfThoughtContext = createContext<boolean | null>(null)
function useChainOfThought() {
  const context = useContext(ChainOfThoughtContext)
  if (context === null) throw new Error('ChainOfThought components must be used within ChainOfThought')
  return context
}
export type ChainOfThoughtProps = Omit<ComponentProps<typeof Collapsible>, 'onOpenChange'> & { onOpenChange?: (open: boolean) => void }
export function ChainOfThought({ className, open, defaultOpen = false, onOpenChange, ...props }: ChainOfThoughtProps) {
  const [isOpen, setIsOpen] = useControllableOpen(open, defaultOpen, onOpenChange)
  return <ChainOfThoughtContext.Provider value={isOpen}><Collapsible className={cn('not-prose w-full space-y-4', className)} {...props} open={isOpen} onOpenChange={setIsOpen} /></ChainOfThoughtContext.Provider>
}
export type ChainOfThoughtHeaderProps = ComponentProps<typeof CollapsibleTrigger>
export function ChainOfThoughtHeader({ className, children, ...props }: ChainOfThoughtHeaderProps) {
  const isOpen = useChainOfThought()
  return <CollapsibleTrigger className={cn('flex w-full items-center gap-2 text-control text-fg-muted transition-colors hover:text-fg', className)} {...props}>
    <BrainIcon className="size-4" /><span className="flex-1 text-left">{children ?? 'Chain of Thought'}</span><ChevronDownIcon className={cn('size-4 transition-transform motion-reduce:transition-none', isOpen && 'rotate-180')} />
  </CollapsibleTrigger>
}
export type ChainOfThoughtStepProps = ComponentProps<'div'> & { icon?: LucideIcon; label: ReactNode; description?: ReactNode; status?: 'complete' | 'active' | 'pending' }
const stepStatusStyles = { active: 'text-fg', complete: 'text-fg-muted', pending: 'text-fg-muted opacity-50' }
export function ChainOfThoughtStep({ className, icon: Icon = DotIcon, label, description, status = 'complete', children, ...props }: ChainOfThoughtStepProps) {
  return <div className={cn('flex gap-2 text-control', stepStatusStyles[status], className)} data-status={status} {...props}>
    <div className="relative mt-0.5"><Icon className="size-4" /><div className="absolute bottom-0 left-1/2 top-7 -mx-px w-px bg-border" /></div>
    <div className="min-w-0 flex-1 space-y-2 overflow-hidden"><div>{label}</div>{description && <div className="text-caption text-fg-muted">{description}</div>}{children}</div>
  </div>
}
export type ChainOfThoughtSearchResultsProps = ComponentProps<'div'>
export function ChainOfThoughtSearchResults({ className, ...props }: ChainOfThoughtSearchResultsProps) { return <div className={cn('flex flex-wrap items-center gap-2', className)} {...props} /> }
export type ChainOfThoughtSearchResultProps = ComponentProps<typeof Badge>
export function ChainOfThoughtSearchResult({ className, ...props }: ChainOfThoughtSearchResultProps) { return <Badge variant="secondary" className={cn('gap-1 px-2 py-0.5 text-caption font-normal', className)} {...props} /> }
export type ChainOfThoughtContentProps = ComponentProps<typeof CollapsibleContent>
export function ChainOfThoughtContent({ className, ...props }: ChainOfThoughtContentProps) { useChainOfThought(); return <CollapsibleContent className={cn('mt-2 space-y-3 text-fg', className)} {...props} /> }
export type ChainOfThoughtImageProps = ComponentProps<'div'> & { caption?: string }
export function ChainOfThoughtImage({ className, children, caption, ...props }: ChainOfThoughtImageProps) {
  return <div className={cn('mt-2 space-y-2', className)} {...props}><div className="relative flex max-h-96 items-center justify-center overflow-hidden rounded-panel bg-surface p-3">{children}</div>{caption && <p className="text-caption text-fg-muted">{caption}</p>}</div>
}
