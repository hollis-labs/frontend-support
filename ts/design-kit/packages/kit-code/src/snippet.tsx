/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/snippet.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/snippet.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: InputGroup -> semantic group with shared Base UI Input/Button.
 *              Contract tokens, labelled copy, composed clicks, shared clipboard cleanup.
 */
"use client";
import { createContext, useContext } from "react";
import type { ComponentProps, HTMLAttributes } from "react";
import { Button, Input, cn } from "@hollis-labs/design-components";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useClipboard } from "./use-clipboard";
const SnippetContext = createContext<string | null>(null);
export type SnippetProps = HTMLAttributes<HTMLDivElement> & { code: string };
export function Snippet({ code, className, children, ...props }: SnippetProps) {
  return (
    <SnippetContext.Provider value={code}>
      <div
        role="group"
        className={cn(
          "flex items-center gap-2 rounded-control border border-border bg-bg px-2 font-mono text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SnippetContext.Provider>
  );
}
export function SnippetAddon({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}
export function SnippetText({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("font-normal text-fg-muted", className)} {...props} />
  );
}
export function SnippetInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "readOnly" | "value">) {
  const code = useContext(SnippetContext);
  if (code === null) throw new Error("SnippetInput requires Snippet");
  return (
    <Input
      className={cn(
        "min-w-0 flex-1 border-none bg-transparent font-mono shadow-none",
        className,
      )}
      {...props}
      readOnly
      value={code}
    />
  );
}
export type SnippetCopyButtonProps = Omit<ComponentProps<typeof Button>, "onCopy" | "onError"> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};
export function SnippetCopyButton({
  onCopy,
  onError,
  timeout,
  children,
  onClick,
  ...props
}: SnippetCopyButtonProps) {
  const code = useContext(SnippetContext);
  if (code === null) throw new Error("SnippetCopyButton requires Snippet");
  const { copied, copy } = useClipboard(code, { onCopy, onError, timeout });
  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={copied ? "Copied" : "Copy snippet"}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) void copy();
      }}
    >
      {children ?? <Icon className="size-4" aria-hidden="true" />}
    </Button>
  );
}
