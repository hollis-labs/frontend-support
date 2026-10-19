import type { ComponentProps, ReactNode, Ref } from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { cn } from '../lib/utils'

type PopupProps = ComponentProps<typeof DialogContent>

export interface InspectionDialogProps extends Omit<PopupProps, 'title' | 'children' | 'render'> {
  open: boolean
  onOpenChange: ComponentProps<typeof Dialog>['onOpenChange']
  title: ReactNode
  meta?: ReactNode
  navigation?: ReactNode
  navigationLabel?: string
  footer?: ReactNode
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  titleProps?: ComponentProps<typeof DialogTitle>
  /** Name and keyboard eligibility of the sole body scroll region are host policy. */
  bodyProps?: ComponentProps<'section'>
}

/** Controlled, content-independent chrome. Admission and navigation stay in the host. */
export function InspectionDialog({
  open, onOpenChange, title, meta, navigation, navigationLabel, footer, children,
  titleProps, bodyProps, className, widthClassName, ...popupProps
}: InspectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        {...popupProps}
        widthClassName={widthClassName ?? 'max-w-4xl'}
        className={cn('flex h-dvh max-h-[calc(100dvh-var(--spacing)*8)] min-w-0 flex-col gap-0 overflow-hidden p-0', className)}
      >
        <header data-slot="inspection-header" className={cn("shrink-0 px-4 pt-3 pb-2 [overflow-wrap:anywhere]", popupProps.showFullscreenToggle ? "pr-20" : "pr-12")}>
          <DialogTitle {...titleProps}>{title}</DialogTitle>
          {meta != null ? <div data-slot="inspection-meta" className="mt-1.5 text-caption text-fg-muted">{meta}</div> : null}
        </header>
        {navigation != null ? (
          <nav data-slot="inspection-navigation" aria-label={navigationLabel} className="flex shrink-0 items-center justify-between gap-2 border-y border-border px-3 py-2">
            {navigation}
          </nav>
        ) : null}
        <section {...bodyProps} data-slot="inspection-body" className={cn('min-h-0 min-w-0 flex-1 overflow-auto [overflow-wrap:anywhere]', bodyProps?.className)}>
          {children}
        </section>
        {footer != null ? <footer data-slot="inspection-footer" className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2 [overflow-wrap:anywhere]">{footer}</footer> : null}
      </DialogContent>
    </Dialog>
  )
}
