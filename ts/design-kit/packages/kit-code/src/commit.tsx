/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/commit.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/commit.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI native trigger and sibling actions; phrasing metadata slots.
 *              Contract tokens, initials without Avatar dependency, safe dates/counts,
 *              shared clipboard lifecycle and accessible copy/status names.
 */
"use client";

import { Button } from "@hollis-labs/design-components";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hollis-labs/design-components";
import { cn } from "@hollis-labs/design-components";
import {
  CheckIcon,
  CopyIcon,
  FileIcon,
  GitCommitIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { useClipboard } from "./use-clipboard";
import type { CodeBlockCopyButtonProps } from "./code-block";

export type CommitProps = ComponentProps<typeof Collapsible>;

export const Commit = ({ className, children, ...props }: CommitProps) => (
  <Collapsible
    className={(state) =>
      cn(
        "rounded-panel border border-border bg-bg text-fg",
        typeof className === "function" ? className(state) : className,
      )
    }
    {...props}
  >
    {children}
  </Collapsible>
);

export type CommitHeaderProps = ComponentProps<typeof CollapsibleTrigger> & {
  actions?: ReactNode;
};
export function CommitHeader({
  className,
  children,
  actions,
  ...props
}: CommitHeaderProps) {
  const nodes = Children.toArray(children);
  const isAction = (node: ReactNode) =>
    isValidElement(node) && node.type === CommitActions;
  return (
    <div className="flex items-center gap-2">
      <CollapsibleTrigger
        className={(state) =>
          cn(
            "group flex min-w-0 flex-1 items-center gap-4 p-3 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            typeof className === "function" ? className(state) : className,
          )
        }
        {...props}
      >
        {nodes.filter((node) => !isAction(node))}
      </CollapsibleTrigger>
      {nodes.filter(isAction)}
      {actions}
    </div>
  );
}

export type CommitHashProps = HTMLAttributes<HTMLSpanElement>;

export const CommitHash = ({
  className,
  children,
  ...props
}: CommitHashProps) => (
  <span className={cn("font-mono text-xs", className)} {...props}>
    <GitCommitIcon aria-hidden="true" className="mr-1 inline-block size-3" />
    {children}
  </span>
);

export type CommitMessageProps = HTMLAttributes<HTMLSpanElement>;

export const CommitMessage = ({
  className,
  children,
  ...props
}: CommitMessageProps) => (
  <span className={cn("font-medium text-sm", className)} {...props}>
    {children}
  </span>
);

export type CommitMetadataProps = HTMLAttributes<HTMLSpanElement>;

export const CommitMetadata = ({
  className,
  children,
  ...props
}: CommitMetadataProps) => (
  <span
    className={cn("flex items-center gap-2 text-fg-muted text-xs", className)}
    {...props}
  >
    {children}
  </span>
);

export type CommitSeparatorProps = HTMLAttributes<HTMLSpanElement>;

export const CommitSeparator = ({
  className,
  children,
  ...props
}: CommitSeparatorProps) => (
  <span className={className} {...props}>
    {children ?? "•"}
  </span>
);

export type CommitInfoProps = HTMLAttributes<HTMLSpanElement>;

export const CommitInfo = ({
  className,
  children,
  ...props
}: CommitInfoProps) => (
  <span className={cn("flex flex-1 flex-col", className)} {...props}>
    {children}
  </span>
);

export type CommitAuthorProps = HTMLAttributes<HTMLSpanElement>;

export const CommitAuthor = ({
  className,
  children,
  ...props
}: CommitAuthorProps) => (
  <span className={cn("flex items-center", className)} {...props}>
    {children}
  </span>
);

export type CommitAuthorAvatarProps = HTMLAttributes<HTMLSpanElement> & {
  initials: string;
};
export function CommitAuthorAvatar({
  initials,
  className,
  ...props
}: CommitAuthorAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-surface text-xs text-fg-muted",
        className,
      )}
      {...props}
    >
      {initials}
    </span>
  );
}

export type CommitTimestampProps = HTMLAttributes<HTMLTimeElement> & {
  date: Date;
};

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const formatRelativeDate = (date: Date) => {
  const days = Math.round(
    (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return relativeTimeFormat.format(days, "day");
};

export function CommitTimestamp({
  date,
  className,
  children,
  ...props
}: CommitTimestampProps) {
  const valid = Number.isFinite(date.getTime());
  return (
    <time
      className={cn("text-xs", className)}
      dateTime={valid ? date.toISOString() : undefined}
      suppressHydrationWarning
      {...props}
    >
      {children ?? (valid ? formatRelativeDate(date) : "Unknown date")}
    </time>
  );
}
export type CommitActionsProps = HTMLAttributes<HTMLDivElement>;
export function CommitActions({ className, ...props }: CommitActionsProps) {
  return (
    <div
      role="group"
      aria-label="Commit actions"
      className={cn("flex shrink-0 items-center gap-1 pr-2", className)}
      {...props}
    />
  );
}
export type CommitCopyButtonProps = CodeBlockCopyButtonProps & { hash: string };
export function CommitCopyButton({
  hash,
  onCopy,
  onError,
  timeout,
  children,
  className,
  onClick,
  ...props
}: CommitCopyButtonProps) {
  const { copied, copy } = useClipboard(hash, { onCopy, onError, timeout });
  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button
      type="button"
      aria-label={copied ? "Copied" : "Copy commit hash"}
      size="icon"
      variant="ghost"
      className={cn("size-7 shrink-0", className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) void copy();
      }}
    >
      {children ?? <Icon aria-hidden="true" className="size-3.5" />}
    </Button>
  );
}

export type CommitContentProps = ComponentProps<typeof CollapsibleContent>;

export const CommitContent = ({
  className,
  children,
  ...props
}: CommitContentProps) => (
  <CollapsibleContent
    className={(state) =>
      cn(
        "border-t border-border p-3",
        typeof className === "function" ? className(state) : className,
      )
    }
    {...props}
  >
    {children}
  </CollapsibleContent>
);

export type CommitFilesProps = HTMLAttributes<HTMLDivElement>;

export const CommitFiles = ({
  className,
  children,
  ...props
}: CommitFilesProps) => (
  <div className={cn("space-y-1", className)} {...props}>
    {children}
  </div>
);

export type CommitFileProps = HTMLAttributes<HTMLDivElement>;

export const CommitFile = ({
  className,
  children,
  ...props
}: CommitFileProps) => (
  <div
    className={cn(
      "flex items-center justify-between gap-2 rounded-control px-2 py-1 text-sm hover:bg-surface-hover",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type CommitFileInfoProps = HTMLAttributes<HTMLDivElement>;

export const CommitFileInfo = ({
  className,
  children,
  ...props
}: CommitFileInfoProps) => (
  <div className={cn("flex min-w-0 items-center gap-2", className)} {...props}>
    {children}
  </div>
);

const fileStatusStyles = {
  added: "text-success",
  deleted: "text-danger",
  modified: "text-warning",
  renamed: "text-info",
};

const fileStatusLabels = {
  added: "A",
  deleted: "D",
  modified: "M",
  renamed: "R",
};

export type CommitFileStatusProps = HTMLAttributes<HTMLSpanElement> & {
  status: "added" | "modified" | "deleted" | "renamed";
};

export const CommitFileStatus = ({
  status,
  className,
  children,
  ...props
}: CommitFileStatusProps) => (
  <span
    aria-label={status}
    className={cn(
      "font-medium font-mono text-xs",
      fileStatusStyles[status],
      className,
    )}
    {...props}
  >
    {children ?? fileStatusLabels[status]}
  </span>
);

export type CommitFileIconProps = ComponentProps<typeof FileIcon>;

export const CommitFileIcon = ({
  className,
  ...props
}: CommitFileIconProps) => (
  <FileIcon
    aria-hidden="true"
    className={cn("size-3.5 shrink-0 text-fg-muted", className)}
    {...props}
  />
);

export type CommitFilePathProps = HTMLAttributes<HTMLSpanElement>;

export const CommitFilePath = ({
  className,
  children,
  ...props
}: CommitFilePathProps) => (
  <span className={cn("truncate font-mono text-xs", className)} {...props}>
    {children}
  </span>
);

export type CommitFileChangesProps = HTMLAttributes<HTMLDivElement>;

export const CommitFileChanges = ({
  className,
  children,
  ...props
}: CommitFileChangesProps) => (
  <div
    className={cn(
      "flex shrink-0 items-center gap-1 font-mono text-xs",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type CommitFileAdditionsProps = HTMLAttributes<HTMLSpanElement> & {
  count: number;
};

export const CommitFileAdditions = ({
  count,
  className,
  children,
  ...props
}: CommitFileAdditionsProps) => {
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} additions`}
      className={cn("text-success", className)}
      {...props}
    >
      {children ?? (
        <>
          <PlusIcon aria-hidden="true" className="inline-block size-3" />
          {count}
        </>
      )}
    </span>
  );
};

export type CommitFileDeletionsProps = HTMLAttributes<HTMLSpanElement> & {
  count: number;
};

export const CommitFileDeletions = ({
  count,
  className,
  children,
  ...props
}: CommitFileDeletionsProps) => {
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} deletions`}
      className={cn("text-danger", className)}
      {...props}
    >
      {children ?? (
        <>
          <MinusIcon aria-hidden="true" className="inline-block size-3" />
          {count}
        </>
      )}
    </span>
  );
};
