/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/file-tree.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/file-tree.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI disclosure and shared controlled state; contract tokens.
 *              Honest groups/native buttons rather than incomplete ARIA tree.
 *              Immutable expansion requests; direct action slots stay outside activation.
 */
"use client";
import { Children, createContext, isValidElement, useContext } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  cn,
  useControllableState,
} from "@hollis-labs/design-components";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";

interface TreeState {
  expandedPaths: Set<string>;
  setExpanded: (path: string, open: boolean) => void;
  selectedPath?: string;
  onSelect?: (path: string) => void;
}
const TreeContext = createContext<TreeState | null>(null);
function useTree() {
  const value = useContext(TreeContext);
  if (!value) throw Error("FileTree components require FileTree");
  return value;
}
export type FileTreeProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  expanded?: Set<string>;
  defaultExpanded?: Set<string>;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  onExpandedChange?: (expanded: Set<string>) => void;
};
export function FileTree({
  expanded,
  defaultExpanded = new Set(),
  selectedPath,
  onSelect,
  onExpandedChange,
  className,
  children,
  ...props
}: FileTreeProps) {
  const [expandedPaths, setPaths] = useControllableState({
    value: expanded,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });
  const setExpanded = (path: string, open: boolean) =>
    setPaths((previous) => {
      if (previous.has(path) === open) return previous;
      const next = new Set(previous);
      if (open) next.add(path);
      else next.delete(path);
      return next;
    });
  return (
    <TreeContext.Provider
      value={{ expandedPaths, setExpanded, selectedPath, onSelect }}
    >
      <div
        role="group"
        aria-label="Files"
        className={cn(
          "rounded-panel border border-border bg-bg p-2 font-mono text-sm text-fg",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </TreeContext.Provider>
  );
}
export type FileTreeIconProps = HTMLAttributes<HTMLSpanElement>;
export function FileTreeIcon({ className, ...props }: FileTreeIconProps) {
  return (
    <span aria-hidden="true" className={cn("shrink-0", className)} {...props} />
  );
}
export type FileTreeNameProps = HTMLAttributes<HTMLSpanElement>;
export function FileTreeName({ className, ...props }: FileTreeNameProps) {
  return <span className={cn("truncate", className)} {...props} />;
}
export type FileTreeFolderProps = HTMLAttributes<HTMLDivElement> & {
  path: string;
  name: string;
  actions?: ReactNode;
};
export function FileTreeFolder({
  path,
  name,
  actions,
  className,
  children,
  ...props
}: FileTreeFolderProps) {
  const { expandedPaths, setExpanded, selectedPath, onSelect } = useTree();
  const open = expandedPaths.has(path);
  const Icon = open ? FolderOpenIcon : FolderIcon;
  const label = (
    <>
      <FileTreeIcon>
        <Icon className="size-4 text-primary" />
      </FileTreeIcon>
      <FileTreeName>{name}</FileTreeName>
    </>
  );
  return (
    <Collapsible open={open} onOpenChange={(next) => setExpanded(path, next)}>
      <div className={className} {...props}>
        <div
          className={cn(
            "flex items-center gap-1 rounded-control px-2 py-1",
            selectedPath === path && "bg-surface-active",
          )}
        >
          <CollapsibleTrigger
            aria-label={`${open ? "Collapse" : "Expand"} ${name}`}
            className="group flex items-center gap-1 rounded-control p-1 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 text-fg-muted transition-transform group-aria-expanded:rotate-90 motion-reduce:transition-none"
            />
            {!onSelect && label}
          </CollapsibleTrigger>
          {onSelect && (
            <button
              type="button"
              aria-current={selectedPath === path ? "true" : undefined}
              className="flex min-w-0 flex-1 items-center gap-1 rounded-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onSelect(path)}
            >
              {label}
            </button>
          )}
          {actions}
        </div>
        <CollapsibleContent>
          <div
            role="group"
            aria-label={`${name} contents`}
            className="ml-4 border-l border-border pl-2"
          >
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
export type FileTreeFileProps = HTMLAttributes<HTMLDivElement> & {
  path: string;
  name: string;
  icon?: ReactNode;
  actions?: ReactNode;
};
export function FileTreeFile({
  path,
  name,
  icon,
  actions,
  className,
  children,
  ...props
}: FileTreeFileProps) {
  const { selectedPath, onSelect } = useTree();
  const nodes = Children.toArray(children);
  const isAction = (node: ReactNode) =>
    isValidElement(node) && node.type === FileTreeActions;
  const rowActions = nodes.filter(isAction);
  const content = nodes.filter((node) => !isAction(node));
  const label = content.length ? (
    content
  ) : (
    <>
      <span aria-hidden="true" className="size-4 shrink-0" />
      <FileTreeIcon>
        {icon ?? <FileIcon className="size-4 text-fg-muted" />}
      </FileTreeIcon>
      <FileTreeName>{name}</FileTreeName>
    </>
  );
  const style =
    "flex min-w-0 flex-1 items-center gap-1 rounded-control px-2 py-1 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div
      className={cn(
        "flex items-center rounded-control",
        selectedPath === path && "bg-surface-active",
        className,
      )}
      {...props}
    >
      {onSelect ? (
        <button
          type="button"
          aria-current={selectedPath === path ? "true" : undefined}
          className={style}
          onClick={() => onSelect(path)}
        >
          {label}
        </button>
      ) : (
        <span className={style}>{label}</span>
      )}
      {rowActions}
      {actions}
    </div>
  );
}
export type FileTreeActionsProps = HTMLAttributes<HTMLDivElement>;
export function FileTreeActions({ className, ...props }: FileTreeActionsProps) {
  return (
    <div
      role="group"
      className={cn("ml-auto flex items-center gap-1", className)}
      {...props}
    />
  );
}
