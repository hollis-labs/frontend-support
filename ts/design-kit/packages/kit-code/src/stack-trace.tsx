/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/stack-trace.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/stack-trace.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: One Base UI disclosure root, shared controlled state, contract tokens.
 *              Real trigger, separate action slots, retained unknown frames, safe coordinates.
 *              Read-only file paths without a host callback; shared clipboard lifecycle.
 *              Linear delimiter parsing with a per-frame length cap.
 */
"use client";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from "react";
import {
  Button,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  cn,
  useControllableState,
} from "@hollis-labs/design-components";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
} from "lucide-react";
import type { CodeBlockCopyButtonProps } from "./code-block";
import { useClipboard } from "./use-clipboard";

interface StackFrame {
  raw: string;
  functionName: string | null;
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  isInternal: boolean;
}
interface ParsedStackTrace {
  errorType: string | null;
  errorMessage: string;
  frames: StackFrame[];
  raw: string;
}
function coordinate(value: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
// Bound each frame's parsing work while retaining oversized input as inert text.
const MAX_FRAME_CHARS = 1000;
function parseFrame(raw: string): StackFrame {
  const text = raw.trim();
  const unknown: StackFrame = {
    raw: text,
    functionName: null,
    filePath: null,
    lineNumber: null,
    columnNumber: null,
    isInternal: false,
  };
  if (
    text.length > MAX_FRAME_CHARS ||
    !text.startsWith("at") ||
    !/^\s$/.test(text[2] ?? "")
  ) return unknown;

  const body = text.slice(2).trim();
  let functionName: string | null = null;
  let location = body;
  if (body.endsWith(")")) {
    const open = body.indexOf(" (");
    if (open < 1) return unknown;
    functionName = body.slice(0, open).trim();
    location = body.slice(open + 2, -1);
    if (!functionName) return unknown;
  }
  // Read coordinates from the right so URL schemes and Windows drives remain paths.
  const columnSeparator = location.lastIndexOf(":");
  const lineSeparator = location.lastIndexOf(":", columnSeparator - 1);
  if (lineSeparator < 1 || columnSeparator <= lineSeparator) return unknown;
  const line = location.slice(lineSeparator + 1, columnSeparator);
  const column = location.slice(columnSeparator + 1);
  // Each anchored check scans a bounded digit slice once; no ambiguous frame regex.
  if (!/^\d+$/.test(line) || !/^\d+$/.test(column)) return unknown;
  const lineNumber = coordinate(line);
  const columnNumber = coordinate(column);
  if (lineNumber === null || columnNumber === null) return unknown;
  const path = location.slice(0, lineSeparator);
  return {
    raw: text,
    functionName,
    filePath: path,
    lineNumber,
    columnNumber,
    isInternal:
      path.includes("node_modules") ||
      path.startsWith("node:") ||
      path.includes("internal/"),
  };
}
function parseTrace(raw: string): ParsedStackTrace {
  const lines = raw.split("\n").filter((line) => line.trim());
  if (!lines.length)
    return { raw, errorType: null, errorMessage: raw, frames: [] };
  const first = lines[0].trim(),
    error = first.match(/^(\w+Error|Error):\s*(.*)$/);
  const firstIsFrame = first.startsWith("at ");
  return {
    raw,
    errorType: error?.[1] ?? null,
    errorMessage: firstIsFrame ? "" : (error?.[2] ?? first),
    frames: lines.slice(firstIsFrame ? 0 : 1).map(parseFrame),
  };
}
type FilePathClick = (path: string, line?: number, column?: number) => void;
interface StackState {
  trace: ParsedStackTrace;
  isOpen: boolean;
  onFilePathClick?: FilePathClick;
}
const StackContext = createContext<StackState | null>(null);
function useStackTrace() {
  const state = useContext(StackContext);
  if (!state) throw Error("StackTrace components require StackTrace");
  return state;
}
export type StackTraceProps = HTMLAttributes<HTMLDivElement> & {
  trace: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFilePathClick?: FilePathClick;
};
export function StackTrace({
  trace,
  open,
  defaultOpen = false,
  onOpenChange,
  onFilePathClick,
  className,
  children,
  ...props
}: StackTraceProps) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const parsed = useMemo(() => parseTrace(trace), [trace]);
  return (
    <StackContext.Provider value={{ trace: parsed, isOpen, onFilePathClick }}>
      <Collapsible
        open={isOpen}
        onOpenChange={setOpen}
        className={cn(
          "w-full overflow-hidden rounded-panel border border-border bg-bg font-mono text-sm text-fg",
          className,
        )}
        {...props}
      >
        {children}
      </Collapsible>
    </StackContext.Provider>
  );
}
export type StackTraceHeaderProps = ComponentProps<
  typeof CollapsibleTrigger
> & { actions?: ReactNode };
export function StackTraceHeader({
  children,
  actions,
  className,
  ...props
}: StackTraceHeaderProps) {
  const { trace } = useStackTrace();
  const nodes = Children.toArray(children);
  const isAction = (node: ReactNode) =>
    isValidElement(node) && node.type === StackTraceActions;
  return (
    <div className="flex items-center gap-2">
      <CollapsibleTrigger
        aria-label={
          trace.errorType
            ? `${trace.errorType}: ${trace.errorMessage}`
            : "Stack trace"
        }
        className={(state) =>
          cn(
            "group flex min-w-0 flex-1 items-center gap-3 p-3 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
export type StackTraceErrorProps = HTMLAttributes<HTMLSpanElement>;
export function StackTraceError({
  className,
  children,
  ...props
}: StackTraceErrorProps) {
  return (
    <span
      className={cn("flex min-w-0 flex-1 items-center gap-2", className)}
      {...props}
    >
      <AlertTriangleIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-danger"
      />
      {children}
    </span>
  );
}
export type StackTraceErrorTypeProps = HTMLAttributes<HTMLSpanElement>;
export function StackTraceErrorType({
  className,
  children,
  ...props
}: StackTraceErrorTypeProps) {
  const { trace } = useStackTrace();
  return (
    <span
      className={cn("shrink-0 font-semibold text-danger", className)}
      {...props}
    >
      {children ?? trace.errorType}
    </span>
  );
}
export type StackTraceErrorMessageProps = HTMLAttributes<HTMLSpanElement>;
export function StackTraceErrorMessage({
  className,
  children,
  ...props
}: StackTraceErrorMessageProps) {
  const { trace } = useStackTrace();
  return (
    <span className={cn("truncate text-fg", className)} {...props}>
      {children ?? trace.errorMessage}
    </span>
  );
}
export type StackTraceActionsProps = HTMLAttributes<HTMLDivElement>;
export function StackTraceActions({
  className,
  ...props
}: StackTraceActionsProps) {
  return (
    <div
      role="group"
      aria-label="Stack trace actions"
      className={cn("flex shrink-0 items-center gap-1 pr-2", className)}
      {...props}
    />
  );
}
export type StackTraceCopyButtonProps = CodeBlockCopyButtonProps;
export function StackTraceCopyButton({
  onCopy,
  onError,
  timeout,
  children,
  onClick,
  ...props
}: StackTraceCopyButtonProps) {
  const { trace } = useStackTrace();
  const { copied, copy } = useClipboard(trace.raw, {
    onCopy,
    onError,
    timeout,
  });
  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={copied ? "Copied" : "Copy stack trace"}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) void copy();
      }}
    >
      {children ?? <Icon aria-hidden="true" className="size-4" />}
    </Button>
  );
}
export type StackTraceExpandButtonProps = HTMLAttributes<HTMLSpanElement>;
export function StackTraceExpandButton({
  className,
  ...props
}: StackTraceExpandButtonProps) {
  const { isOpen } = useStackTrace();
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-7 items-center justify-center", className)}
      {...props}
    >
      <ChevronDownIcon
        className={cn(
          "size-4 text-fg-muted transition-transform motion-reduce:transition-none",
          isOpen && "rotate-180",
        )}
      />
    </span>
  );
}
export type StackTraceContentProps = ComponentProps<
  typeof CollapsibleContent
> & { maxHeight?: CSSProperties["maxHeight"] };
export function StackTraceContent({
  className,
  style,
  maxHeight,
  ...props
}: StackTraceContentProps) {
  return (
    <CollapsibleContent
      className={(state) =>
        cn(
          "max-h-96 overflow-auto border-t border-border bg-surface",
          typeof className === "function" ? className(state) : className,
        )
      }
      style={(state) => ({
        ...(typeof style === "function" ? style(state) : style),
        ...(maxHeight !== undefined ? { maxHeight } : {}),
      })}
      {...props}
    />
  );
}
export type StackTraceFramesProps = HTMLAttributes<HTMLDivElement> & {
  showInternalFrames?: boolean;
};
export function StackTraceFrames({
  showInternalFrames = true,
  className,
  ...props
}: StackTraceFramesProps) {
  const { trace, onFilePathClick } = useStackTrace();
  const frames = trace.frames.filter(
    (frame) => showInternalFrames || !frame.isInternal,
  );
  return (
    <div className={cn("space-y-1 p-3", className)} {...props}>
      {frames.length ? (
        frames.map((frame, i) => (
          <div
            key={i}
            className={cn(
              "text-xs",
              frame.isInternal ? "text-fg-muted" : "text-fg",
            )}
          >
            {frame.filePath ? (
              <>
                <span className="text-fg-muted">at </span>
                {frame.functionName && `${frame.functionName} (`}
                {onFilePathClick ? (
                  <button
                    type="button"
                    className="rounded-control underline decoration-dotted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() =>
                      onFilePathClick(
                        frame.filePath!,
                        frame.lineNumber ?? undefined,
                        frame.columnNumber ?? undefined,
                      )
                    }
                  >
                    {frame.filePath}
                    {frame.lineNumber !== null && `:${frame.lineNumber}`}
                    {frame.columnNumber !== null && `:${frame.columnNumber}`}
                  </button>
                ) : (
                  <span>
                    {frame.filePath}
                    {frame.lineNumber !== null && `:${frame.lineNumber}`}
                    {frame.columnNumber !== null && `:${frame.columnNumber}`}
                  </span>
                )}
                {frame.functionName && ")"}
              </>
            ) : (
              frame.raw
            )}
          </div>
        ))
      ) : (
        <p className="text-xs text-fg-muted">No stack frames</p>
      )}
    </div>
  );
}
