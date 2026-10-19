/**
 * Vendored from shadcn/ui (MIT), inherited through sysop-ui.
 * Copyright (c) 2023 shadcn
 * Upstream: apps/v4/styles/base-nova/ui/dialog.tsx
 * Source:   https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/dialog.tsx
 * Version:  base-nova reference @ 36139f6 (2026-05-14); attribution audited 2026-10-02
 * History:  first recorded in sysop-ui 4bc6303 (2026-05-15).
 *           Original generator revision/copy date unrecorded; Source is a comparison reference.
 * Divergences: Local imports; scrollable Viewport composition, width override and card styling.
 */
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Maximize2, Minimize2, XIcon } from "lucide-react"
import { DialogOpenContext, useDialogOptions, type DialogOptions } from '../../hooks/use-dialog-options'

function Dialog({ children, onOpenChange, ...props }: DialogPrimitive.Root.Props) {
  const [internalOpen, setInternalOpen] = React.useState(props.defaultOpen ?? false)
  return <DialogOpenContext.Provider value={props.open ?? internalOpen}>
    <DialogPrimitive.Root data-slot="dialog" {...props} onOpenChange={(open, details) => {
      onOpenChange?.(open, details)
      if (!details.isCanceled) setInternalOpen(open)
    }}>{children}</DialogPrimitive.Root>
  </DialogOpenContext.Provider>
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  widthClassName,
  showFullscreenToggle, fullscreen: controlledFullscreen, onFullscreenChange, fullscreenSessionKey, returnFocus, finalFocus,
  ...props
}: DialogPrimitive.Popup.Props & DialogOptions & {
  showCloseButton?: boolean
  /**
   * Overrides the default responsive max-width (`max-w-[calc(100%-2rem)]
   * sm:max-w-sm`). Pass e.g. `max-w-3xl` for a wider dialog — set it here
   * rather than via `className`, where the `sm:`-prefixed default would
   * otherwise win at the `sm` breakpoint.
   */
  widthClassName?: string
}) {
  const { popupRef, fullscreen, toggle, finalFocus: admittedFinalFocus } = useDialogOptions({ fullscreen: controlledFullscreen, onFullscreenChange, fullscreenSessionKey, returnFocus, finalFocus }, props.ref)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Viewport
        data-slot="dialog-viewport"
        className={cn("fixed inset-0 z-[60] overflow-y-auto", fullscreen ? "p-0" : "p-4")}
      >
        <div className="flex min-h-full items-center justify-center">
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className={cn(
              "pointer-events-auto relative w-full rounded-md border border-border bg-card p-4 text-sm text-popover-foreground duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              widthClassName ?? "max-w-[calc(100%-2rem)] sm:max-w-sm",
              className
            )}
            {...props}
            ref={popupRef}
        data-fullscreen={fullscreen || undefined}
            finalFocus={admittedFinalFocus}
            style={fullscreen ? { ...props.style, top: 0, left: 0, translate: 'none', transform: 'none', width: '100%', maxWidth: 'none', height: '100dvh', maxHeight: 'none', borderRadius: 0, border: 'none' } : props.style}
          >
            {children}
            {showFullscreenToggle && <Button type="button" variant="ghost" size="icon-sm" className={cn("absolute top-2", showCloseButton ? "right-10" : "right-2")} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={fullscreen} onPointerDown={event => event.preventDefault()} onClick={toggle}>
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>}
            {showCloseButton && (
              <DialogPrimitive.Close
                data-slot="dialog-close"
                render={
                  <Button
                    variant="ghost"
                    className="absolute top-2 right-2"
                    size="icon-sm"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Viewport>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-md border-t border-border p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
