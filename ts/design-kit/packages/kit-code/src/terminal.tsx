/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/terminal.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/terminal.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Opt-in `/terminal` entry on the optional ansi-to-react peer; Base UI/shared primitives, contract tokens
 *              (no zinc), ANSI roles mapped to contract colours with utilities, no inline colours.
 *              Output is untrusted: rendered as React text with `useClasses` and `linkify={false}` (no anchors),
 *              control sequences other than colour/style removed, `\r`/`\b` normalised in linear time (the peer's helper is
 *              quadratic on a run of carriage returns), rendering bounded to the last `maxChars`.
 *              Copy puts the visible text on the clipboard, not raw escape sequences; shared clipboard lifecycle.
 *              Named status ("Streaming"), labelled copy/clear actions, a focusable `role="log"` scroll region,
 *              composed clicks, reduced-motion cursor. See ./terminal-text.ts for the text handling.
 */
"use client";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { ComponentProps, ComponentType, HTMLAttributes } from "react";
import { Button, cn } from "@hollis-labs/design-components";
import * as AnsiModule from "ansi-to-react";
import { CheckIcon, CopyIcon, TerminalIcon, Trash2Icon } from "lucide-react";
import type { CodeBlockCopyButtonProps } from "./code-block";
import { prepareForDisplay, tailOf, toCopyText } from "./terminal-text";
import { useClipboard } from "./use-clipboard";

type AnsiProps = {
  children?: string;
  className?: string;
  useClasses?: boolean;
  linkify?: boolean | "fuzzy";
};

// ansi-to-react is CommonJS with `exports.default`. A bundler hands us the component as `default`;
// Node's own ESM loader hands us `module.exports`, whose `default` is the component.
const Ansi = ((): ComponentType<AnsiProps> => {
  const first = (AnsiModule as unknown as { default: unknown }).default;
  return (
    typeof first === "function" ? first : (first as { default: unknown }).default
  ) as ComponentType<AnsiProps>;
})();

/** Most characters rendered at once; the rest of a longer output stays in the host's hands (and in Copy). */
export const DEFAULT_MAX_CHARS = 65_536;

interface TerminalContextType {
  output: string;
  isStreaming: boolean;
  autoScroll: boolean;
  maxChars: number;
  onClear?: () => void;
}

const TerminalContext = createContext<TerminalContextType>({
  autoScroll: true,
  isStreaming: false,
  maxChars: DEFAULT_MAX_CHARS,
  output: "",
});

export type TerminalHeaderProps = HTMLAttributes<HTMLDivElement>;
export const TerminalHeader = ({
  className,
  children,
  ...props
}: TerminalHeaderProps) => (
  <div
    className={cn(
      "flex items-center justify-between border-b border-border px-4 py-2",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type TerminalTitleProps = HTMLAttributes<HTMLDivElement>;
export const TerminalTitle = ({
  className,
  children,
  ...props
}: TerminalTitleProps) => (
  <div
    className={cn("flex items-center gap-2 text-sm text-fg-muted", className)}
    {...props}
  >
    <TerminalIcon aria-hidden="true" className="size-4" />
    {children ?? "Terminal"}
  </div>
);

export type TerminalStatusProps = HTMLAttributes<HTMLDivElement>;
export const TerminalStatus = ({
  className,
  children,
  ...props
}: TerminalStatusProps) => {
  const { isStreaming } = useContext(TerminalContext);
  if (!isStreaming) return null;
  return (
    <div
      role="status"
      className={cn("flex items-center gap-2 text-xs text-fg-muted", className)}
      {...props}
    >
      {children ?? "Streaming"}
    </div>
  );
};

export type TerminalActionsProps = HTMLAttributes<HTMLDivElement>;
export const TerminalActions = ({
  className,
  children,
  ...props
}: TerminalActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type TerminalCopyButtonProps = CodeBlockCopyButtonProps;
export function TerminalCopyButton({
  onCopy,
  onError,
  timeout,
  children,
  className,
  onClick,
  ...props
}: TerminalCopyButtonProps) {
  const { output } = useContext(TerminalContext);
  // The visible text of the whole output, not its raw bytes (escape sequences pasted into a terminal act),
  // computed when the button is pressed: a multi-megabyte output is not re-scanned on every render.
  const { copied, copy } = useClipboard(output, {
    getText: () => toCopyText(output),
    onCopy,
    onError,
    timeout,
  });
  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      aria-label={copied ? "Copied" : "Copy terminal output"}
      className={cn("shrink-0 text-fg-muted hover:text-fg", className)}
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

export type TerminalClearButtonProps = ComponentProps<typeof Button>;
export const TerminalClearButton = ({
  children,
  className,
  onClick,
  ...props
}: TerminalClearButtonProps) => {
  const { onClear } = useContext(TerminalContext);
  if (!onClear) return null;
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      aria-label="Clear terminal output"
      className={cn("shrink-0 text-fg-muted hover:text-fg", className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onClear();
      }}
    >
      {children ?? <Trash2Icon aria-hidden="true" className="size-3.5" />}
    </Button>
  );
};

// The renderer emits fixed class names (`ansi-red-fg`, `ansi-bright-red-bg`, `ansi-bold`, and `ansi-palette-N-fg` for
// 256-colour indices from 16 up; indices below 16 arrive as the named classes), never anything taken from the input, so these selectors are the whole of its styling surface. Colours are contract
// utilities (they follow theme and mode), grouped by role. Class strings are literal so Tailwind can see them.
// Not styled on purpose: 256-colour above 15 and true colour (no colour value is emitted for them: default text),
// reverse and blink (plain text), and conceal, because untrusted output must not be able to hide text.
const ANSI_STYLES = [
  "[&_:is(.ansi-black-fg,.ansi-bright-black-fg)]:text-fg-muted",
  "[&_:is(.ansi-red-fg,.ansi-bright-red-fg)]:text-danger",
  "[&_:is(.ansi-green-fg,.ansi-bright-green-fg)]:text-success",
  "[&_:is(.ansi-yellow-fg,.ansi-bright-yellow-fg)]:text-warning",
  "[&_:is(.ansi-blue-fg,.ansi-bright-blue-fg,.ansi-cyan-fg,.ansi-bright-cyan-fg)]:text-info",
  "[&_:is(.ansi-magenta-fg,.ansi-bright-magenta-fg)]:text-brand",
  "[&_:is(.ansi-white-fg,.ansi-bright-white-fg)]:text-fg",
  "[&_:is(.ansi-red-bg,.ansi-bright-red-bg)]:bg-danger-muted",
  "[&_:is(.ansi-green-bg,.ansi-bright-green-bg)]:bg-success-muted",
  "[&_:is(.ansi-yellow-bg,.ansi-bright-yellow-bg)]:bg-warning-muted",
  "[&_:is(.ansi-blue-bg,.ansi-bright-blue-bg,.ansi-cyan-bg,.ansi-bright-cyan-bg)]:bg-info-muted",
  "[&_:is(.ansi-magenta-bg,.ansi-bright-magenta-bg)]:bg-brand-muted",
  "[&_:is(.ansi-black-bg,.ansi-bright-black-bg,.ansi-white-bg,.ansi-bright-white-bg)]:bg-surface",
  "[&_.ansi-bold]:font-semibold",
  "[&_.ansi-dim]:opacity-70",
  "[&_.ansi-italic]:italic",
  "[&_.ansi-underline]:underline",
  "[&_.ansi-strikethrough]:line-through",
].join(" ");

export type TerminalContentProps = HTMLAttributes<HTMLDivElement>;
export const TerminalContent = ({
  className,
  children,
  ...props
}: TerminalContentProps) => {
  const { output, isStreaming, autoScroll, maxChars } =
    useContext(TerminalContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => {
    const tail = tailOf(output, maxChars);
    return {
      text: prepareForDisplay(tail.text),
      truncated: tail.truncated,
    };
  }, [output, maxChars]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  return (
    <div
      aria-label="Terminal output"
      className={cn(
        "max-h-96 overflow-auto p-4 font-mono text-sm leading-relaxed",
        className,
      )}
      data-truncated={shown.truncated ? "true" : undefined}
      ref={containerRef}
      role="log"
      tabIndex={0}
      {...props}
    >
      {children ?? (
        <>
          {shown.truncated && (
            <p
              className="sticky top-0 z-10 mb-2 bg-bg pb-1 font-sans text-xs text-fg-muted"
              data-slot="terminal-truncated"
            >
              Showing the last {shown.text.length.toLocaleString("en-US")} of{" "}
              {output.length.toLocaleString("en-US")} characters.
            </p>
          )}
          <pre className={cn("break-words whitespace-pre-wrap", ANSI_STYLES)}>
            <Ansi linkify={false} useClasses>
              {shown.text}
            </Ansi>
            {isStreaming && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-fg motion-reduce:animate-none"
              />
            )}
          </pre>
        </>
      )}
    </div>
  );
};

export type TerminalProps = HTMLAttributes<HTMLDivElement> & {
  output: string;
  isStreaming?: boolean;
  autoScroll?: boolean;
  /** Most characters rendered (the last ones); default 65,536. Copy always takes the whole output. */
  maxChars?: number;
  onClear?: () => void;
};

export const Terminal = ({
  output,
  isStreaming = false,
  autoScroll = true,
  maxChars = DEFAULT_MAX_CHARS,
  onClear,
  className,
  children,
  ...props
}: TerminalProps) => {
  const contextValue = useMemo(
    () => ({ autoScroll, isStreaming, maxChars, onClear, output }),
    [autoScroll, isStreaming, maxChars, onClear, output],
  );

  return (
    <TerminalContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-panel border border-border bg-bg text-fg",
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <TerminalHeader>
              <TerminalTitle />
              <div className="flex items-center gap-1">
                <TerminalStatus />
                <TerminalActions>
                  <TerminalCopyButton />
                  {onClear && <TerminalClearButton />}
                </TerminalActions>
              </div>
            </TerminalHeader>
            <TerminalContent />
          </>
        )}
      </div>
    </TerminalContext.Provider>
  );
};
