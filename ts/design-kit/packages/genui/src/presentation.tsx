import type { ReactNode } from 'react'
import type { OverlayKind } from '@hollis-labs/app-shell'
import {
  Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  Popover, PopoverContent, PopoverTrigger, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@hollis-labs/design-components'

export interface PresentationRequest { id: string; kind: OverlayKind; title: string; purpose: 'surface' | 'confirmation'; trigger?: HTMLElement | null }

/** Host atomically admits placement through its current shell stack/policy. No browser content selects it. */
export interface GenuiPresentationHost {
  reserve(request: PresentationRequest): boolean
  dismiss(id: string): void
}

export interface SurfaceFrameProps {
  /** Host-selected placement. Content cannot name host regions or override this. */
  mode: 'inline' | 'fullscreen' | OverlayKind
  title: string
  open: boolean
  onClose(): void
  returnFocus?: HTMLElement | null
  children: ReactNode
}

/** Host reserves/releases its existing stack separately; closing only hides UI, never cancels work. */
export function SurfaceFrame({ mode, title, open, onClose, returnFocus, children }: SurfaceFrameProps) {
  if (mode === 'inline') return open ? <>{children}</> : null
  if (mode === 'toast') return open ? (
    <aside role="status" aria-label={title} className="flex flex-col gap-2 rounded-md border border-border bg-bg-elevated p-4 text-fg">
      {children}<Button variant="ghost" onClick={onClose}>Dismiss</Button>
    </aside>
  ) : null
  if (mode === 'drawer') return (
    <Sheet open={open} onOpenChange={next => { if (!next) onClose() }}>
      <SheetContent side="right" finalFocus={returnFocus === undefined ? undefined : () => returnFocus}>
        <SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>Review this surface before acting.</SheetDescription></SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
  if (mode === 'popover') return (
    <Popover open={open} onOpenChange={next => { if (!next) onClose() }}>
      <PopoverTrigger render={<Button variant="outline" />}>{title}</PopoverTrigger>
      <PopoverContent aria-label={title}>{children}</PopoverContent>
    </Popover>
  )
  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose() }}>
      <DialogContent fullscreen={mode === 'fullscreen'} finalFocus={returnFocus === undefined ? undefined : () => returnFocus}>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Closing this view does not cancel a submitted action.</DialogDescription></DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
