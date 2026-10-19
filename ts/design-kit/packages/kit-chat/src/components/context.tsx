/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/context.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/context.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Own numeric usage/cost props instead of ai/tokenlens; no pricing/fetching.
 * Base UI Popover for keyboard/touch; native progress, guarded arithmetic; unknown stays unknown.
 */
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@hollis-labs/design-components'
import { ChartPieIcon } from 'lucide-react'
import { createContext, useContext, type ComponentProps } from 'react'

export interface ContextUsage { inputTokens?: number; outputTokens?: number; reasoningTokens?: number; cachedInputTokens?: number }
export interface ContextCost { totalUSD?: number; inputUSD?: number; outputUSD?: number; reasoningUSD?: number; cacheUSD?: number }
interface ContextSchema { usedTokens?: number; maxTokens?: number; usage?: ContextUsage; cost?: ContextCost }
const ContextContext = createContext<ContextSchema | null>(null)
const useContextValue = () => { const value = useContext(ContextContext); if (!value) throw new Error('Context components must be used within Context'); return value }
const known = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value >= 0
const countText = (value: number | undefined) => known(value) ? new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value) : 'Unknown'
const costText = (value: number | undefined) => known(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : 'Unknown'
const fraction = ({ usedTokens, maxTokens }: ContextSchema) => known(usedTokens) && known(maxTokens) && maxTokens > 0 && Number.isFinite(usedTokens / maxTokens) ? Math.min(1, usedTokens / maxTokens) : undefined
const percentage = (value: number | undefined) => value === undefined ? 'Unknown' : new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value)

export type ContextProps = ComponentProps<typeof Popover> & ContextSchema
export const Context = ({ usedTokens, maxTokens, usage, cost, ...props }: ContextProps) => <ContextContext.Provider value={{ usedTokens, maxTokens, usage, cost }}><Popover {...props} /></ContextContext.Provider>
export type ContextTriggerProps = ComponentProps<typeof Button>
export const ContextTrigger = ({ children, ...props }: ContextTriggerProps) => {
  const value = useContextValue()
  return <PopoverTrigger render={<Button type="button" variant="ghost" {...props} />}>
    {children ?? <><span className="font-medium text-muted-foreground">{percentage(fraction(value))}</span><ChartPieIcon className="size-4" aria-hidden="true" /><span className="sr-only">Context usage</span></>}
  </PopoverTrigger>
}
export type ContextContentProps = ComponentProps<typeof PopoverContent>
export const ContextContent = ({ className, ...props }: ContextContentProps) => <PopoverContent className={cn('min-w-60 divide-y divide-border overflow-hidden rounded-panel border-border p-0', className)} {...props} />
export type ContextContentHeaderProps = ComponentProps<'div'>
export const ContextContentHeader = ({ children, className, ...props }: ContextContentHeaderProps) => {
  const value = useContextValue(), part = fraction(value)
  return <div className={cn('w-full space-y-2 p-3', className)} {...props}>{children ?? <>
    <div className="flex items-center justify-between gap-3 text-xs"><p>{percentage(part)}</p><p className="font-mono text-muted-foreground">{countText(value.usedTokens)} / {known(value.maxTokens) && value.maxTokens > 0 ? countText(value.maxTokens) : 'Unknown'}</p></div>
    {part !== undefined && <progress aria-label="Context capacity used" max={100} value={part * 100} className="h-2 w-full overflow-hidden appearance-none rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" />}
  </>}</div>
}
export type ContextContentBodyProps = ComponentProps<'div'>
export const ContextContentBody = ({ className, ...props }: ContextContentBodyProps) => <div className={cn('w-full space-y-2 p-3', className)} {...props} />
export type ContextContentFooterProps = ComponentProps<'div'>
export const ContextContentFooter = ({ children, className, ...props }: ContextContentFooterProps) => {
  const value = useContextValue()
  return <div className={cn('flex w-full items-center justify-between gap-3 bg-secondary p-3 text-xs', className)} {...props}>{children ?? <><span className="text-muted-foreground">Total cost</span><span>{costText(value.cost?.totalUSD)}</span></>}</div>
}
type UsageRowProps = ComponentProps<'div'>
const UsageRow = ({ label, tokens, cost, children, className, ...props }: UsageRowProps & { label: string; tokens?: number; cost?: number }) => <div className={cn('flex items-center justify-between gap-3 text-xs', className)} {...props}>{children ?? <><span className="text-muted-foreground">{label}</span><span>{countText(tokens)}<span className="ml-2 text-muted-foreground">• {costText(cost)}</span></span></>}</div>
export type ContextInputUsageProps = UsageRowProps
export const ContextInputUsage = (props: ContextInputUsageProps) => { const { usage, cost } = useContextValue(); return <UsageRow label="Input" tokens={usage?.inputTokens} cost={cost?.inputUSD} {...props} /> }
export type ContextOutputUsageProps = UsageRowProps
export const ContextOutputUsage = (props: ContextOutputUsageProps) => { const { usage, cost } = useContextValue(); return <UsageRow label="Output" tokens={usage?.outputTokens} cost={cost?.outputUSD} {...props} /> }
export type ContextReasoningUsageProps = UsageRowProps
export const ContextReasoningUsage = (props: ContextReasoningUsageProps) => { const { usage, cost } = useContextValue(); return <UsageRow label="Reasoning" tokens={usage?.reasoningTokens} cost={cost?.reasoningUSD} {...props} /> }
export type ContextCacheUsageProps = UsageRowProps
export const ContextCacheUsage = (props: ContextCacheUsageProps) => { const { usage, cost } = useContextValue(); return <UsageRow label="Cache" tokens={usage?.cachedInputTokens} cost={cost?.cacheUSD} {...props} /> }
