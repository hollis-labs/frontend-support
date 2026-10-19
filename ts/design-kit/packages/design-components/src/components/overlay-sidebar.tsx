import type { DialogOptions } from '../hooks/use-dialog-options'
import { useLayoutEffect, useRef, type ReactElement, type ReactNode, type Ref } from 'react'
import { restoreAdmittedFocus, type FocusReturnOptions } from '../lib/focus-return'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'

export interface OverlaySidebarProps extends DialogOptions {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** A button element. Sheet owns activation and focus return. */
  readonly trigger: ReactElement
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly side?: 'left' | 'right'
  readonly header?: ReactNode
  readonly footer?: ReactNode
  /** Caller-owned eligibility for return focus. Omit to preserve Sheet's default. */
  readonly focusReturn?: Omit<FocusReturnOptions, 'trigger'>
  /** Observe the actual portaled popup for a host-owned layout transition. */
  readonly contentRef?: Ref<HTMLDivElement>
  readonly children: ReactNode
}

/**
 * A modal sidebar with pinned chrome and a scrolling body. Composes the existing
 * Sheet; Base UI owns focus containment, Escape and backdrop dismissal. The host
 * owns navigation, selection and content. No layout store or viewport breakpoint.
 */
export function OverlaySidebar({ open, onOpenChange, trigger, title, description, side = 'left', header, footer, focusReturn, contentRef, children, finalFocus, ...dialogOptions }: OverlaySidebarProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const committedReturn = useRef<{ open: boolean; focusReturn: typeof focusReturn } | null>(null)
  useLayoutEffect(() => {
    const frame = { open, focusReturn }
    committedReturn.current = frame
    return () => { if (committedReturn.current === frame) committedReturn.current = null }
  })
  const returnFocus = () => {
    const frame = committedReturn.current
    // The primitive resolves finalFocus during cleanup, before removing its
    // modal aria-hidden markers. Check visibility after that cleanup completes.
    queueMicrotask(() => {
      if (!frame || frame.open || committedReturn.current !== frame) return
      restoreAdmittedFocus({ ...frame.focusReturn, trigger: triggerRef.current })
    })
    return false as const
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger ref={triggerRef} render={trigger} />
      <SheetContent {...dialogOptions} ref={contentRef} finalFocus={finalFocus ?? (focusReturn ? returnFocus : undefined)} side={side} className="min-w-0 max-w-full gap-0 overflow-hidden bg-bg-elevated text-control text-fg data-[side=left]:w-80 data-[side=right]:w-80">
        <SheetHeader className="shrink-0 border-b border-border-subtle pr-12">
          <SheetTitle className="text-control font-semibold text-fg">{title}</SheetTitle>
          {description ? <SheetDescription className="text-caption text-fg-muted">{description}</SheetDescription> : null}
          {header}
        </SheetHeader>
        <div data-slot="overlay-sidebar-body" className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 [overflow-wrap:anywhere]">{children}</div>
        {footer ? <div data-slot="overlay-sidebar-footer" className="shrink-0 border-t border-border-subtle p-4">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  )
}
