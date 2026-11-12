/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/open-in-chat.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/open-in-chat.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI primitives and contract tokens; host destination/icon slots.
 *              No providers, brand marks, query prop or URL construction bundled.
 *              HTTP(S) validation, native explicit links, noopener noreferrer.
 */
"use client";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@hollis-labs/design-components";
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import { createContext, useContext } from "react";
import type { ComponentProps, ReactNode } from "react";

export interface OpenInProvider {
  /** Stable, unique identity supplied by the host. */
  readonly id: string;
  /** Nonempty accessible destination name supplied by the host. */
  readonly label: string;
  /** Explicit absolute HTTP(S) URL; the kit never adds content to it. */
  readonly href: string;
  /** Consumer-owned icon or brand mark. No icons are fetched. */
  readonly icon?: ReactNode;
}
const OpenInContext = createContext<readonly OpenInProvider[] | null>(null);
function useProviders() {
  const providers = useContext(OpenInContext);
  if (!providers) throw Error("OpenIn components require OpenIn");
  return providers;
}
function isHttpHref(href: string) {
  try {
    const protocol = new URL(href).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
export type OpenInProps = ComponentProps<typeof DropdownMenu> & {
  providers: readonly OpenInProvider[];
};
export function OpenIn({ providers, children, ...props }: OpenInProps) {
  return (
    <OpenInContext.Provider value={providers}>
      <DropdownMenu {...props}>
        {children ?? (
          <>
            <OpenInTrigger />
            <OpenInContent />
          </>
        )}
      </DropdownMenu>
    </OpenInContext.Provider>
  );
}
export type OpenInContentProps = Omit<
  ComponentProps<typeof DropdownMenuContent>,
  "className"
> & { className?: string };
export function OpenInContent({
  className,
  children,
  ...props
}: OpenInContentProps) {
  const providers = useProviders();
  return (
    <DropdownMenuContent
      align="start"
      className={cn(
        "min-w-56 max-w-sm rounded-panel border border-border bg-surface text-fg motion-reduce:animate-none",
        className,
      )}
      {...props}
    >
      {children ??
        providers.map((provider) => (
          <OpenInItem key={provider.id} provider={provider} />
        ))}
    </DropdownMenuContent>
  );
}
export type OpenInItemProps = Omit<
  ComponentProps<typeof DropdownMenuItem>,
  "render" | "nativeButton" | "children" | "className"
> & {
  provider: OpenInProvider;
  className?: string;
};
export function OpenInItem({ provider, className, ...props }: OpenInItemProps) {
  const content = (
    <>
      {provider.icon !== undefined && (
        <span aria-hidden="true" className="shrink-0">
          {provider.icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{provider.label}</span>
      <ExternalLinkIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-fg-muted"
      />
    </>
  );
  const classes = cn(
    "rounded-control text-fg focus:bg-surface-hover focus:text-fg data-highlighted:bg-surface-hover data-disabled:text-fg-muted",
    className,
  );
  if (!isHttpHref(provider.href))
    return (
      <DropdownMenuItem className={classes} {...props} disabled>
        {content}
        <span className="sr-only">Unavailable destination</span>
      </DropdownMenuItem>
    );
  return (
    <DropdownMenuItem
      className={classes}
      {...props}
      nativeButton={false}
      render={
        <a href={provider.href} target="_blank" rel="noopener noreferrer" />
      }
    >
      {content}
    </DropdownMenuItem>
  );
}
export type OpenInTriggerProps = ComponentProps<typeof DropdownMenuTrigger>;
export function OpenInTrigger({
  children,
  disabled,
  render,
  ...props
}: OpenInTriggerProps) {
  const providers = useProviders();
  return (
    <DropdownMenuTrigger
      disabled={disabled ?? providers.length === 0}
      render={render ?? <Button variant="outline" />}
      {...props}
    >
      {children ?? (
        <>
          Open in
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </>
      )}
    </DropdownMenuTrigger>
  );
}
export type OpenInLabelProps = ComponentProps<typeof DropdownMenuLabel>;
export function OpenInLabel(props: OpenInLabelProps) {
  return <DropdownMenuLabel {...props} />;
}
export type OpenInSeparatorProps = ComponentProps<typeof DropdownMenuSeparator>;
export function OpenInSeparator(props: OpenInSeparatorProps) {
  return <DropdownMenuSeparator {...props} />;
}
export type OpenInGroupProps = ComponentProps<typeof DropdownMenuGroup>;
export function OpenInGroup(props: OpenInGroupProps) {
  return <DropdownMenuGroup {...props} />;
}
