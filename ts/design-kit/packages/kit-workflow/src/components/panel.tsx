/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/panel.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/panel.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Shared cn; contract surfaces/radius/scale; caller options retained.
 */
import { cn } from "@hollis-labs/design-components";
import { Panel as PanelPrimitive } from "@xyflow/react";
import type { ComponentProps } from "react";

export type PanelProps = ComponentProps<typeof PanelPrimitive>;

export const Panel = ({ className, ...props }: PanelProps) => (
  <PanelPrimitive
    className={cn(
      "wf-panel m-4 overflow-hidden rounded-panel border border-border bg-bg-elevated p-1 text-fg",
      className
    )}
    {...props}
  />
);
