/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/code-block.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/code-block.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI/shared primitives; plain main entry and host-owned highlighting seam.
 *              Removed singleton/cache/subscribers, GitHub themes and raw scale values.
 *              Accessible copy label, composed clicks, duplicate-copy guard and timer cleanup.
 */
"use client";
import { createContext, useContext, useMemo } from "react";
import type { ComponentProps, HTMLAttributes } from "react";
import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hollis-labs/design-components";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { CodeHighlighter, HighlightToken } from "./highlighter-types";
import { useClipboard } from "./use-clipboard";

const CodeBlockContext = createContext<string | null>(null);
export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlighter?: CodeHighlighter;
};
export function CodeBlockContainer({
  className,
  language,
  ...props
}: HTMLAttributes<HTMLDivElement> & { language: string }) {
  return (
    <div
      data-language={language}
      className={cn(
        "w-full overflow-hidden rounded-panel border border-border bg-bg text-fg",
        className,
      )}
      {...props}
    />
  );
}
export function CodeBlockHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 text-xs text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
export function CodeBlockTitle({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}
export function CodeBlockFilename({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("font-mono", className)} {...props} />;
}
export function CodeBlockActions({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}
export function CodeBlockContent({
  code,
  language = "text",
  showLineNumbers = false,
  highlighter,
}: Pick<
  CodeBlockProps,
  "code" | "language" | "showLineNumbers" | "highlighter"
>) {
  const result = useMemo(() => {
    try {
      return (
        highlighter?.highlight({
          code,
          language,
          themes: highlighter.getThemes(),
        }) ?? null
      );
    } catch {
      return null;
    }
  }, [code, language, highlighter]);
  const lines: HighlightToken[][] =
    result?.tokens ?? code.split("\n").map((content) => [{ content }]);
  return (
    <div className="overflow-auto">
      <pre className="m-0 p-4 font-mono text-sm text-fg">
        <code>
          {lines.map((tokens, i) => (
            <span key={i}>
              {showLineNumbers && (
                <span
                  aria-hidden="true"
                  className="mr-4 inline-block w-8 select-none text-right text-fg-muted"
                >
                  {i + 1}
                </span>
              )}
              {tokens.map((token, j) => (
                <span key={j} style={{ color: token.color }}>
                  {token.content}
                </span>
              ))}
              {i < lines.length - 1 ? "\n" : ""}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
export function CodeBlock({
  code,
  language = "text",
  showLineNumbers = false,
  highlighter,
  children,
  ...props
}: CodeBlockProps) {
  return (
    <CodeBlockContext.Provider value={code}>
      <CodeBlockContainer language={language} {...props}>
        {children}
        <CodeBlockContent
          code={code}
          language={language}
          showLineNumbers={showLineNumbers}
          highlighter={highlighter}
        />
      </CodeBlockContainer>
    </CodeBlockContext.Provider>
  );
}
export type CodeBlockCopyButtonProps = Omit<ComponentProps<typeof Button>, "onCopy" | "onError"> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};
export function CodeBlockCopyButton({
  onCopy,
  onError,
  timeout,
  children,
  onClick,
  disabled,
  ...props
}: CodeBlockCopyButtonProps) {
  const code = useContext(CodeBlockContext);
  if (code === null) throw new Error("CodeBlockCopyButton requires CodeBlock");
  const { copied, copy } = useClipboard(code, { onCopy, onError, timeout });
  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={copied ? "Copied" : "Copy code"}
      {...props}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) void copy();
      }}
    >
      {children ?? <Icon className="size-4" aria-hidden="true" />}
    </Button>
  );
}
export const CodeBlockLanguageSelector = Select;
export function CodeBlockLanguageSelectorTrigger({
  className,
  ...props
}: ComponentProps<typeof SelectTrigger>) {
  return (
    <SelectTrigger
      size="sm"
      className={cn(
        "border-none bg-transparent text-xs shadow-none",
        className,
      )}
      {...props}
    />
  );
}
export const CodeBlockLanguageSelectorValue = SelectValue;
export function CodeBlockLanguageSelectorContent({
  align = "end",
  ...props
}: ComponentProps<typeof SelectContent>) {
  return <SelectContent align={align} {...props} />;
}
export const CodeBlockLanguageSelectorItem = SelectItem;
