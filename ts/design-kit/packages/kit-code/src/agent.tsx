/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/agent.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/agent.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Local schema descriptor, shared JsonViewer and contract tokens.
 *              Independent Base UI disclosures rather than Accordion/AI SDK types.
 */
"use client";
import {
  Badge,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  JsonViewer,
  cn,
} from "@hollis-labs/design-components";
import { BotIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { memo } from "react";
/** Presentation-only descriptor. The host supplies JSON-serializable schema data. */
export interface AgentToolDefinition {
  description?: string;
  inputSchema: unknown;
}
export type AgentProps = ComponentProps<"div">;
export const Agent = memo(({ className, ...props }: AgentProps) => (
  <div
    className={cn(
      "not-prose w-full rounded-panel border border-border bg-bg text-fg",
      className,
    )}
    {...props}
  />
));
export type AgentHeaderProps = ComponentProps<"div"> & {
  name: string;
  model?: string;
};
export const AgentHeader = memo(
  ({ className, name, model, ...props }: AgentHeaderProps) => (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-4 p-3",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <BotIcon aria-hidden="true" className="size-4 text-fg-muted" />
        <span className="text-sm font-medium">{name}</span>
        {model && (
          <Badge variant="secondary" className="font-mono text-xs">
            {model}
          </Badge>
        )}
      </div>
    </div>
  ),
);
export type AgentContentProps = ComponentProps<"div">;
export const AgentContent = memo(
  ({ className, ...props }: AgentContentProps) => (
    <div className={cn("space-y-4 p-4 pt-0", className)} {...props} />
  ),
);
export type AgentInstructionsProps = ComponentProps<"div"> & {
  children: string;
};
export const AgentInstructions = memo(
  ({ className, children, ...props }: AgentInstructionsProps) => (
    <div className={cn("space-y-2", className)} {...props}>
      <span className="text-sm font-medium text-fg-muted">Instructions</span>
      <div className="rounded-control bg-surface p-3 text-sm text-fg-muted">
        <p className="whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  ),
);
/** Tools are independent disclosures; several can be open at once. */
export type AgentToolsProps = ComponentProps<"div">;
export const AgentTools = memo(
  ({ className, children, ...props }: AgentToolsProps) => (
    <div role="group" aria-label="Tools" className={cn("space-y-2", className)} {...props}>
      <span className="text-sm font-medium text-fg-muted">Tools</span>
      <div className="overflow-hidden rounded-panel border border-border">
        {children}
      </div>
    </div>
  ),
);
export type AgentToolProps = ComponentProps<typeof Collapsible> & {
  tool: AgentToolDefinition;
  value?: string;
};
export const AgentTool = memo(
  ({ className, tool, value, children, ...props }: AgentToolProps) => (
    <Collapsible
      data-tool={value}
      className={(state) =>
        cn(
          "border-b border-border last:border-b-0",
          typeof className === "function" ? className(state) : className,
        )
      }
      {...props}
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRightIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-fg-muted transition-transform group-aria-expanded:rotate-90 motion-reduce:transition-none"
        />
        {tool.description ?? "No description"}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3">
          {children ?? (
            <JsonViewer
              value={tool.inputSchema}
              className="rounded-control bg-surface"
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
);
export type AgentOutputProps = ComponentProps<"div"> & { schema: unknown };
export const AgentOutput = memo(
  ({ className, schema, children, ...props }: AgentOutputProps) => (
    <div className={cn("space-y-2", className)} {...props}>
      <span className="text-sm font-medium text-fg-muted">Output Schema</span>
      {children ?? (
        <JsonViewer value={schema} className="rounded-control bg-surface" />
      )}
    </div>
  ),
);
Agent.displayName = "Agent";
AgentHeader.displayName = "AgentHeader";
AgentContent.displayName = "AgentContent";
AgentInstructions.displayName = "AgentInstructions";
AgentTools.displayName = "AgentTools";
AgentTool.displayName = "AgentTool";
AgentOutput.displayName = "AgentOutput";
