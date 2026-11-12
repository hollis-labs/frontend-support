/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/suggestion.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/suggestion.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Shared Button/cn; focusable native scrolling region; token radius; host callback only.
 */
"use client";

import { Button } from "@hollis-labs/design-components";
import { cn } from "@hollis-labs/design-components";
import type { ComponentProps } from "react";
import { useCallback } from "react";

export type SuggestionsProps = ComponentProps<'div'>;
export const Suggestions = ({ className, children, tabIndex = 0, role = 'group', 'aria-label': label = 'Suggestions', ...props }: SuggestionsProps) => (
  <div role={role} aria-label={label} tabIndex={tabIndex}
    className={cn('w-full overflow-x-auto rounded-control focus-visible:outline-2 focus-visible:outline-ring', className)} {...props}>
    <div className="flex w-max flex-nowrap items-center gap-2">{children}</div>
  </div>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion);
  }, [onClick, suggestion]);

  return (
    <Button
      className={cn("cursor-pointer rounded-full! px-4", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children ?? suggestion}
    </Button>
  );
};
