/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/sources.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/sources.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI disclosure; corrected root props; tokens; no implicit animations; non-link provenance without href; class merging.
 */
import { Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@hollis-labs/design-components'
import { BookIcon, ChevronDownIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

export type SourcesProps = ComponentProps<typeof Collapsible>;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn("not-prose mb-4 text-primary text-caption", className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn("flex items-center gap-2", className)}
    {...props}
  >
    {children ?? (
      <>
        <span className="font-medium">Used {count} sources</span>
        <ChevronDownIcon className="h-4 w-4" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-3 flex w-fit flex-col gap-2",
      "outline-none",
      className
    )}
    {...props}
  />
);

export type SourceProps = Omit<ComponentProps<'a'>, 'ref'>
/** Without href this is provenance text, not a pretend link. */
export function Source({ href, title, children, className, ...props }: SourceProps) {
  const content = children ?? <><BookIcon className="size-4" /><span className="block font-medium">{title}</span></>
  return href ? <a className={cn('flex items-center gap-2', className)} href={href} rel="noreferrer" target="_blank" {...props}>{content}</a>
    : <span className={cn('flex items-center gap-2', className)} title={title} {...props}>{content}</span>
}
