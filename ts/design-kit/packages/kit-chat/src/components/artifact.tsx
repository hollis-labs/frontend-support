/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/artifact.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/artifact.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI render tooltips with explicit description linkage; contract tokens and labels.
 *              Bounded focusable host-content pane; native non-submitting buttons.
 *              Expanded shell beside ArtifactCard, no renderer/fetch/download/lifecycle.
 */
"use client";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@hollis-labs/design-components";
import { XIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ComponentProps, HTMLAttributes } from "react";

export type ArtifactProps = HTMLAttributes<HTMLDivElement>;
/** Expanded viewer shell; the host owns visibility and all rendered content. */
export function Artifact({ className, ...props }: ArtifactProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-surface shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
export type ArtifactHeaderProps = HTMLAttributes<HTMLDivElement>;
export function ArtifactHeader({ className, ...props }: ArtifactHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-hover px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}
export type ArtifactTitleProps = HTMLAttributes<HTMLParagraphElement>;
export function ArtifactTitle({ className, ...props }: ArtifactTitleProps) {
  return (
    <p
      className={cn(
        "text-control font-medium text-fg [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}
export type ArtifactDescriptionProps = HTMLAttributes<HTMLParagraphElement>;
export function ArtifactDescription({
  className,
  ...props
}: ArtifactDescriptionProps) {
  return (
    <p
      className={cn(
        "text-caption text-fg-muted [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}
export type ArtifactActionsProps = HTMLAttributes<HTMLDivElement>;
export function ArtifactActions({ className, ...props }: ArtifactActionsProps) {
  return (
    <div
      className={cn("flex shrink-0 flex-wrap items-center gap-1", className)}
      {...props}
    />
  );
}
type ActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  | "className"
  | "render"
  | "nativeButton"
  | "type"
  | "aria-label"
  | "aria-labelledby"
> & { className?: string };
function requireLabel(label: string) {
  if (!label.trim()) throw Error("Artifact action label must be nonempty");
  return label;
}
export type ArtifactCloseProps = ActionButtonProps & { label?: string };
export function ArtifactClose({
  className,
  children,
  label = "Close artifact",
  size = "icon-sm",
  variant = "ghost",
  ...props
}: ArtifactCloseProps) {
  return (
    <Button
      {...props}
      render={<button />}
      nativeButton
      type="button"
      aria-label={requireLabel(label)}
      size={size}
      variant={variant}
      className={cn("text-fg-muted hover:text-fg", className)}
    >
      {children ?? <XIcon aria-hidden="true" className="size-4" />}
    </Button>
  );
}
export type ArtifactActionProps = ActionButtonProps & {
  /** Required independently of optional tooltip text. */
  label: string;
  tooltip?: string;
  icon?: LucideIcon;
};
export function ArtifactAction({
  tooltip,
  label,
  icon: Icon,
  children,
  className,
  size = "icon-sm",
  variant = "ghost",
  ...props
}: ArtifactActionProps) {
  const tooltipId = useId();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const description =
    tooltip && tooltipOpen
      ? [props["aria-describedby"], tooltipId].filter(Boolean).join(" ")
      : props["aria-describedby"];
  const button = (
    <Button
      {...props}
      render={<button />}
      nativeButton
      type="button"
      aria-label={requireLabel(label)}
      aria-describedby={description}
      size={size}
      variant={variant}
      className={cn("text-fg-muted hover:text-fg", className)}
    >
      {Icon ? <Icon aria-hidden="true" className="size-4" /> : children}
    </Button>
  );
  return tooltip ? (
    <TooltipProvider>
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger render={button} />
        <TooltipContent id={tooltipId} role="tooltip">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    button
  );
}
export type ArtifactContentProps = HTMLAttributes<HTMLDivElement>;
/** Native bounded scrolling, keyboard-focusable even without interactive host children. */
export function ArtifactContent({
  className,
  "aria-label": label = "Artifact content",
  ...props
}: ArtifactContentProps) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "min-h-0 min-w-0 max-h-96 flex-1 overflow-auto p-4 [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
