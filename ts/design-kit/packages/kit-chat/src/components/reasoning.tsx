/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/reasoning.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/reasoning.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI disclosure/local controllable state; host-rendered content and duration, no Streamdown/plugins; auto-open once per streaming run preserves user collapse; opt-in Shimmer CSS; tokens.
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@hollis-labs/design-components'
import { BrainIcon, ChevronDownIcon } from 'lucide-react'
import { useControllableOpen } from '../lib/use-controllable-open'
import { Shimmer } from './shimmer'

interface ReasoningContextValue { isStreaming: boolean; isOpen: boolean; duration?: number }
const ReasoningContext = createContext<ReasoningContextValue | null>(null)
function useReasoning() {
  const context = useContext(ReasoningContext)
  if (!context) throw new Error('Reasoning components must be used within Reasoning')
  return context
}
export type ReasoningProps = Omit<ComponentProps<typeof Collapsible>, 'onOpenChange'> & {
  isStreaming?: boolean
  /** Host-computed elapsed seconds; no local wall-clock measurement. */
  duration?: number
  onOpenChange?: (open: boolean) => void
}
export function Reasoning({ className, isStreaming = false, open, defaultOpen, onOpenChange, duration, ...props }: ReasoningProps) {
  const [isOpen, setIsOpen] = useControllableOpen(open, defaultOpen ?? isStreaming, onOpenChange)
  const streamed = useRef(isStreaming)
  const wasStreaming = useRef(false)
  const autoClosed = useRef(false)
  useEffect(() => {
    // Open once per streaming run; later user/host collapse must remain authoritative.
    const started = isStreaming && !wasStreaming.current
    wasStreaming.current = isStreaming
    if (isStreaming) {
      streamed.current = true
      if (started && defaultOpen !== false && !isOpen) setIsOpen(true)
      return
    }
    if (!streamed.current || !isOpen || autoClosed.current) return
    const timer = setTimeout(() => { autoClosed.current = true; setIsOpen(false) }, 1000)
    return () => clearTimeout(timer)
  }, [isStreaming, isOpen, defaultOpen, setIsOpen])
  const value = useMemo(() => ({ isStreaming, isOpen, duration }), [isStreaming, isOpen, duration])
  return <ReasoningContext.Provider value={value}><Collapsible className={cn('not-prose mb-4', className)} {...props} open={isOpen} onOpenChange={setIsOpen} /></ReasoningContext.Provider>
}
export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & { getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode }
function defaultGetThinkingMessage(isStreaming: boolean, duration?: number) {
  return isStreaming ? <Shimmer as="span" duration={1}>Thinking…</Shimmer> : duration === undefined ? 'Thought for a few seconds' : `Thought for ${duration} seconds`
}
export function ReasoningTrigger({ className, children, getThinkingMessage = defaultGetThinkingMessage, ...props }: ReasoningTriggerProps) {
  const { isStreaming, isOpen, duration } = useReasoning()
  return <CollapsibleTrigger className={cn('flex w-full items-center gap-2 text-control text-fg-muted transition-colors hover:text-fg', className)} {...props}>
    {children ?? <><BrainIcon className="size-4" />{getThinkingMessage(isStreaming, duration)}<ChevronDownIcon className={cn('size-4 transition-transform motion-reduce:transition-none', isOpen && 'rotate-180')} /></>}
  </CollapsibleTrigger>
}
export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent>
export function ReasoningContent({ className, ...props }: ReasoningContentProps) {
  useReasoning()
  return <CollapsibleContent className={cn('mt-4 text-control text-fg-muted', className)} {...props} />
}
