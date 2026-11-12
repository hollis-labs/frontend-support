/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/model-selector.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/model-selector.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Shared Base UI Dialog/Command/cn; token radius/surfaces;
 * consumer logo slot replaces third-party hotlinks and forced theme inversion.
 * No bundled brands, fetching, model catalog or model execution semantics.
 */
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@hollis-labs/design-components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@hollis-labs/design-components";
import { cn } from "@hollis-labs/design-components";
import type { ComponentProps, ReactNode } from "react";

export type ModelSelectorProps = ComponentProps<typeof Dialog>;

export const ModelSelector = (props: ModelSelectorProps) => (
  <Dialog {...props} />
);

export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <DialogTrigger {...props} />
);

export type ModelSelectorContentProps = Omit<ComponentProps<typeof DialogContent>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  /** Accessible name supplied to Command's search input. */
  searchLabel?: string;
};

export const ModelSelectorContent = ({
  className,
  children,
  title = "Model Selector",
  description,
  searchLabel = "Search models",
  ...props
}: ModelSelectorContentProps) => (
  <DialogContent
    {...(description ? {} : { "aria-describedby": undefined })}
    className={cn(
      "rounded-panel border-border p-0",
      className
    )}
    {...props}
  >
    <DialogTitle className="sr-only">{title}</DialogTitle>
    {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
    <Command label={searchLabel} className="rounded-panel! **:data-[slot=command-input-wrapper]:h-auto">
      {children}
    </Command>
  </DialogContent>
);

export type ModelSelectorDialogProps = Omit<ModelSelectorProps, 'children'> & {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Accessible name supplied to Command's search input. */
  searchLabel?: string;
  className?: string;
  showCloseButton?: boolean;
};
/** Dialog title/description live inside the real popup, and Command supplies list semantics. */
export const ModelSelectorDialog = ({ title, description, searchLabel, className, showCloseButton = false, children, ...props }: ModelSelectorDialogProps) => (
  <ModelSelector {...props}><ModelSelectorContent title={title} description={description} searchLabel={searchLabel}
    className={className} showCloseButton={showCloseButton}>{children}</ModelSelectorContent></ModelSelector>
);

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>;

export const ModelSelectorInput = ({
  className,
  ...props
}: ModelSelectorInputProps) => (
  <CommandInput className={cn("h-auto py-3.5", className)} {...props} />
);

export type ModelSelectorListProps = ComponentProps<typeof CommandList>;

export const ModelSelectorList = (props: ModelSelectorListProps) => (
  <CommandList {...props} />
);

export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => (
  <CommandEmpty {...props} />
);

export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>;

export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => (
  <CommandGroup {...props} />
);

export type ModelSelectorItemProps = ComponentProps<typeof CommandItem>;

export const ModelSelectorItem = (props: ModelSelectorItemProps) => (
  <CommandItem {...props} />
);

export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;

export const ModelSelectorShortcut = (props: ModelSelectorShortcutProps) => (
  <CommandShortcut {...props} />
);

export type ModelSelectorSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;

export const ModelSelectorSeparator = (props: ModelSelectorSeparatorProps) => (
  <CommandSeparator {...props} />
);

/** Consumer-supplied logo; no default asset, URL generation or provider registry. */
export type ModelSelectorLogoProps = ComponentProps<'span'> & {
  provider?: string;
  /** Omit for decorative logos beside an already-labelled model name. */
  label?: string;
};
export const ModelSelectorLogo = ({ provider, label, children, className, ...props }: ModelSelectorLogoProps) => (
  <span data-provider={provider} role={label ? 'img' : undefined}
    aria-label={label} aria-hidden={label ? undefined : true}
    className={cn('inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-full [&_img]:size-full [&_img]:object-contain', className)} {...props}>
    {children}
  </span>
);

export type ModelSelectorLogoGroupProps = ComponentProps<"div">;

export const ModelSelectorLogoGroup = ({
  className,
  ...props
}: ModelSelectorLogoGroupProps) => (
  <div
    className={cn(
      "flex shrink-0 items-center -space-x-1 [&>*]:rounded-pill [&>*]:bg-background [&>*]:p-px [&>*]:ring-1 [&>*]:ring-border",
      className
    )}
    {...props}
  />
);

export type ModelSelectorNameProps = ComponentProps<"span">;

export const ModelSelectorName = ({
  className,
  ...props
}: ModelSelectorNameProps) => (
  <span className={cn("flex-1 truncate text-left", className)} {...props} />
);
