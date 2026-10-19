/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/inline-citation.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/inline-citation.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI HoverCard render trigger; accessible interactive body with visible tabbability and verified focus handoffs; host trigger label; controlled local pager instead of embla; tokens.
 */
import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps, Ref, RefObject } from 'react'
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { focusable, focusFirst } from '../lib/citation-focus'
import { Button, HoverCard, HoverCardContent, HoverCardTrigger, cn } from '@hollis-labs/design-components'

export type InlineCitationProps = ComponentProps<'span'>
export function InlineCitation({ className, ...props }: InlineCitationProps) {
  return <span className={cn('group inline', className)} {...props} />
}
export type InlineCitationTextProps = ComponentProps<'span'>
export function InlineCitationText({ className, ...props }: InlineCitationTextProps) {
  return <span className={cn('transition-colors group-hover:bg-surface', className)} {...props} />
}
export type InlineCitationCardProps = ComponentProps<typeof HoverCard>
interface CitationFocus {
  trigger: RefObject<HTMLElement | null>
  body: RefObject<HTMLDivElement | null>
  setTrigger: (node: HTMLElement | null) => void
  setBody: (node: HTMLDivElement | null) => void
  close: () => void
}
const Citation = createContext<CitationFocus | null>(null)
function useCitation() {
  const value = useContext(Citation)
  if (!value) throw new Error('InlineCitationCard components must be used within InlineCitationCard')
  return value
}
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}
export function InlineCitationCard({ actionsRef, ...props }: InlineCitationCardProps) {
  const trigger = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const internalActions = useRef<{ close: () => void; unmount: () => void }>(null)
  const actions = actionsRef ?? internalActions
  const value = useMemo(() => ({ trigger, body,
    setTrigger: (node: HTMLElement | null) => { trigger.current = node },
    setBody: (node: HTMLDivElement | null) => { body.current = node },
    close: () => actions.current?.close(),
  }), [actions])
  return <Citation.Provider value={value}><HoverCard {...props} actionsRef={actions} /></Citation.Provider>
}
export type InlineCitationCardTriggerProps = ComponentProps<typeof HoverCardTrigger>
/** Supply a human-readable citation label; no URL parsing or inferred destination. */
export function InlineCitationCardTrigger({ className, children, onKeyDown, ref, ...props }: InlineCitationCardTriggerProps) {
  const citation = useCitation()
  const mergeRef = useCallback((node: HTMLAnchorElement | null) => { citation.setTrigger(node); assignRef(ref, node) }, [citation, ref])
  return <HoverCardTrigger delay={0} closeDelay={0} render={<button type="button" />} {...props} ref={mergeRef}
    onKeyDown={(event) => {
      onKeyDown?.(event)
      if (!event.defaultPrevented && event.key === 'Tab' && !event.shiftKey && citation.body.current) {
        if (focusFirst(focusable(citation.body.current))) event.preventDefault()
      }
    }}
    className={(state) => cn('ml-1 inline-flex items-center rounded-control border border-border bg-surface px-2 py-0.5 text-caption font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', typeof className === 'function' ? className(state) : className)}>{children ?? 'Sources'}</HoverCardTrigger>
}
export type InlineCitationCardBodyProps = Omit<ComponentProps<typeof HoverCardContent>, 'aria-hidden'>
/** This popup contains interactive controls, so it must be exposed to assistive technology. */
export function InlineCitationCardBody({ className, onKeyDown, onBlur, ref, ...props }: InlineCitationCardBodyProps) {
  const citation = useCitation()
  const mergeRef = useCallback((node: HTMLDivElement | null) => { citation.setBody(node); assignRef(ref, node) }, [citation, ref])
  return <HoverCardContent {...props} ref={mergeRef} aria-hidden={false}
    onBlur={(event) => {
      onBlur?.(event)
      if (!event.defaultPrevented && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== citation.trigger.current) citation.close()
    }}
    onKeyDown={(event) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      if (event.key === 'Escape') citation.trigger.current?.focus()
      if (event.key !== 'Tab') return
      const controls = focusable(event.currentTarget)
      if (event.shiftKey && event.target === controls[0] && citation.trigger.current) {
        if (focusFirst([citation.trigger.current])) event.preventDefault()
      }
      else if (!event.shiftKey && event.target === controls.at(-1) && citation.trigger.current) {
        // Portals are appended to body. Continue from the trigger's place in the host's tab order.
        const hostControls = focusable(event.currentTarget.ownerDocument.body).filter((element) => !event.currentTarget.contains(element))
        const triggerIndex = hostControls.indexOf(citation.trigger.current)
        if (triggerIndex >= 0 && focusFirst(hostControls.slice(triggerIndex + 1))) event.preventDefault()
      }
    }} className={(state) => cn('w-80 max-w-full p-0', typeof className === 'function' ? className(state) : className)} />
}

interface PagerContext {
  index: number
  count: number
  setCount: (count: number) => void
  select: (index: number) => void
}
const Pager = createContext<PagerContext | null>(null)
function usePager() {
  const value = useContext(Pager)
  if (!value) throw new Error('InlineCitationCarousel components must be used within InlineCitationCarousel')
  return value
}
function normalize(index: number, count: number) {
  return count > 0 && Number.isFinite(index) ? Math.max(0, Math.min(Math.trunc(index), count - 1)) : 0
}
export type InlineCitationCarouselProps = ComponentProps<'div'> & {
  index?: number
  defaultIndex?: number
  /** A controlled host must apply the requested index to accept a selection. */
  onIndexChange?: (index: number) => void
}
export function InlineCitationCarousel({ index, defaultIndex = 0, onIndexChange, className, ...props }: InlineCitationCarouselProps) {
  const [internal, setInternal] = useState(defaultIndex)
  const [count, setCount] = useState(0)
  const current = normalize(index ?? internal, count)
  const select = useCallback((next: number) => {
    if (count <= 1) return
    if (index === undefined) setInternal(next)
    onIndexChange?.(next)
  }, [count, index, onIndexChange])
  const value = useMemo(() => ({ index: current, count, setCount, select }), [current, count, select])
  return <Pager.Provider value={value}><div className={cn('w-full', className)} {...props} /></Pager.Provider>
}
export type InlineCitationCarouselContentProps = ComponentProps<'div'>
/** One Content per Carousel. Inactive pages stay mounted but hidden and unfocusable. */
export function InlineCitationCarouselContent({ children, ...props }: InlineCitationCarouselContentProps) {
  const { index, setCount } = usePager()
  const pages = Children.toArray(children)
  const count = pages.length
  useEffect(() => { setCount(count) }, [count, setCount])
  const selected = normalize(index, count)
  return <div {...props}>{pages.map((page, i) => <div key={isValidElement(page) ? page.key : i} hidden={i !== selected}>{page}</div>)}</div>
}
export type InlineCitationCarouselItemProps = ComponentProps<'div'>
export function InlineCitationCarouselItem({ className, ...props }: InlineCitationCarouselItemProps) {
  return <div className={cn('space-y-2 p-4', className)} {...props} />
}
export type InlineCitationCarouselHeaderProps = ComponentProps<'div'>
export function InlineCitationCarouselHeader({ className, ...props }: InlineCitationCarouselHeaderProps) {
  return <div className={cn('flex items-center justify-between gap-2 rounded-t-panel border-b border-border bg-surface p-2', className)} {...props} />
}
export type InlineCitationCarouselIndexProps = ComponentProps<'span'>
export function InlineCitationCarouselIndex({ children, className, ...props }: InlineCitationCarouselIndexProps) {
  const { index, count } = usePager()
  return <span aria-live="polite" aria-atomic="true" className={cn('px-2 text-caption text-fg-muted', className)} {...props}>{children ?? `${count ? index + 1 : 0} of ${count}`}</span>
}
export type InlineCitationCarouselPrevProps = ComponentProps<typeof Button>
export function InlineCitationCarouselPrev({ children, onClick, disabled, ...props }: InlineCitationCarouselPrevProps) {
  const { index, count, select } = usePager()
  return <Button aria-label="Previous citation" size="icon-sm" variant="ghost" {...props} type="button" disabled={disabled || count <= 1} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) select(index > 0 ? index - 1 : count - 1) }}>{children ?? <ArrowLeftIcon className="size-4" aria-hidden />}</Button>
}
export type InlineCitationCarouselNextProps = ComponentProps<typeof Button>
export function InlineCitationCarouselNext({ children, onClick, disabled, ...props }: InlineCitationCarouselNextProps) {
  const { index, count, select } = usePager()
  return <Button aria-label="Next citation" size="icon-sm" variant="ghost" {...props} type="button" disabled={disabled || count <= 1} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) select(index < count - 1 ? index + 1 : 0) }}>{children ?? <ArrowRightIcon className="size-4" aria-hidden />}</Button>
}
export type InlineCitationSourceProps = ComponentProps<'div'> & { title?: string; url?: string; description?: string }
export function InlineCitationSource({ title, url, description, children, className, ...props }: InlineCitationSourceProps) {
  return <div className={cn('space-y-1', className)} {...props}>
    {title && <h4 className="text-control font-medium [overflow-wrap:anywhere]">{title}</h4>}
    {url && <p className="text-caption text-fg-muted [overflow-wrap:anywhere]">{url}</p>}
    {description && <p className="text-control text-fg-muted [overflow-wrap:anywhere]">{description}</p>}
    {children}
  </div>
}
export type InlineCitationQuoteProps = ComponentProps<'blockquote'>
export function InlineCitationQuote({ className, ...props }: InlineCitationQuoteProps) {
  return <blockquote className={cn('border-l-2 border-border pl-3 text-control italic text-fg-muted', className)} {...props} />
}
