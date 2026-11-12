/**
 * Vendored from shadcn/ui (MIT), via the pinned AI Elements copy.
 * Copyright (c) 2023 shadcn
 * Upstream: packages/shadcn-ui/components/ui/hover-card.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/shadcn-ui/components/ui/hover-card.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Radix HoverCard -> Base UI PreviewCard, with Positioner/Popup split.
 *              Base UI delay/closeDelay on Trigger; callback/render props retained.
 *              Explicit aria-hidden for supplementary content (Base UI usage guidance).
 *              Contract radius, shared cn; CSS transitions instead of animation utilities.
 */
"use client"

import { PreviewCard as HoverCardPrimitive } from "@base-ui/react/preview-card"
import { cn } from "../../lib/utils"

function HoverCard<Payload = unknown>(props: HoverCardPrimitive.Root.Props<Payload>) {
  return <HoverCardPrimitive.Root {...props} />
}

function HoverCardTrigger<Payload = unknown>(props: HoverCardPrimitive.Trigger.Props<Payload>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
}

function HoverCardContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: HoverCardPrimitive.Popup.Props &
  Pick<HoverCardPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <HoverCardPrimitive.Popup
          data-slot="hover-card-content"
          className={(state) => cn(
            "bg-popover text-popover-foreground z-50 w-64 origin-(--transform-origin) rounded-panel border border-border p-4 text-sm shadow-md outline-hidden transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none",
            typeof className === "function" ? className(state) : className,
          )}
          aria-hidden="true"
          {...props}
        />
      </HoverCardPrimitive.Positioner>
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
