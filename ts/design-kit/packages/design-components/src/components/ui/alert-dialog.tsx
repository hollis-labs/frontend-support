/**
 * Vendored from shadcn/ui (MIT), inherited through sysop-ui.
 * Copyright (c) 2023 shadcn
 * Upstream: apps/v4/styles/base-nova/ui/alert-dialog.tsx
 * Source:   https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/alert-dialog.tsx
 * Version:  base-nova reference @ 36139f6 (2026-05-14); attribution audited 2026-10-02
 * History:  first recorded in sysop-ui f4c193c (2026-05-18).
 *           Original generator revision/copy date unrecorded; Source is a comparison reference.
 * Divergences: Local imports; heading class normalization.
 */
"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Maximize2, Minimize2 } from 'lucide-react'
import { DialogOpenContext, useDialogOptions, type DialogOptions } from '../../hooks/use-dialog-options'

function AlertDialog({ children, onOpenChange, ...props }: AlertDialogPrimitive.Root.Props) {
  const [internalOpen, setInternalOpen] = React.useState(props.defaultOpen ?? false)
  return <DialogOpenContext.Provider value={props.open ?? internalOpen}>
    <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} onOpenChange={(open, details) => {
      onOpenChange?.(open, details)
      if (!details.isCanceled) setInternalOpen(open)
    }}>{children}</AlertDialogPrimitive.Root>
  </DialogOpenContext.Provider>
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  size = "default", children, showFullscreenToggle, fullscreen: controlledFullscreen, onFullscreenChange, fullscreenSessionKey, returnFocus, finalFocus,
  ...props
}: AlertDialogPrimitive.Popup.Props & DialogOptions & {
  size?: "default" | "sm"
}) {
  const { popupRef, fullscreen, toggle, finalFocus: admittedFinalFocus } = useDialogOptions({ fullscreen: controlledFullscreen, onFullscreenChange, fullscreenSessionKey, returnFocus, finalFocus }, props.ref)
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          showFullscreenToggle && "max-h-[calc(100dvh-var(--spacing)*8)] overflow-auto",
          className
        )}
        {...props}
        ref={popupRef}
        data-fullscreen={fullscreen || undefined}
        finalFocus={admittedFinalFocus}
        style={fullscreen ? { ...props.style, inset: 0, translate: 'none', transform: 'none', width: '100%', maxWidth: 'none', height: '100dvh', maxHeight: 'none', borderRadius: 0, border: 'none', overflow: 'auto' } : props.style}
      >
        {children}
        {showFullscreenToggle && <Button type="button" variant="ghost" size="icon-sm" className="absolute top-2 right-2" aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={fullscreen} onPointerDown={event => event.preventDefault()} onClick={toggle}>
          {fullscreen ? <Minimize2 /> : <Maximize2 />}
        </Button>}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "font-heading text-base font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn(className)}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
