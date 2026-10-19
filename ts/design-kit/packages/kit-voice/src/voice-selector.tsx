/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/voice-selector.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/voice-selector.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences:
 *  - Radix -> Base UI: Dialog and Command from design-components; Radix useControllableState -> design-components' (value/defaultValue params)
 *  - the context and `useVoiceSelector` moved to ./voice-selector-context.ts (react-refresh: components and hooks do not share a file)
 *  - `onOpenChange` is `(open: boolean) => void`, as upstream's, not Base UI's (open, eventDetails): the context's `setOpen` also calls it,
 *    and a programmatic close (choosing a voice) has no event details to give
 *  - `aria-describedby={undefined}` dropped (a Radix warning workaround; Base UI warns about nothing here)
 *  - VoiceSelectorAccent: a lookup table in place of a 30-case switch (same flags); the flag and the gender icon get an accessible name
 *    (role="img" + aria-label) when they are the only content, since an emoji or an icon alone is not announced as the value it stands for
 *  - VoiceSelectorPreview: Spinner (not in the kit) is lucide's LoaderCircleIcon with animate-spin (off under prefers-reduced-motion); aria-busy while loading
 */
"use client";

import {
  Button,
  cn,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  useControllableState,
} from "@hollis-labs/design-components";
import {
  CircleSmallIcon,
  LoaderCircleIcon,
  MarsIcon,
  MarsStrokeIcon,
  NonBinaryIcon,
  PauseIcon,
  PlayIcon,
  TransgenderIcon,
  VenusAndMarsIcon,
  VenusIcon,
} from "lucide-react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { VoiceSelectorContext } from "./voice-selector-context";

export type VoiceSelectorProps = Omit<
  ComponentProps<typeof Dialog>,
  "open" | "defaultOpen" | "onOpenChange"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string | undefined) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const VoiceSelector = ({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: VoiceSelectorProps) => {
  const [value, setValue] = useControllableState<string | undefined>({
    defaultValue,
    onChange: onValueChange,
    value: valueProp,
  });

  const [open, setOpen] = useControllableState({
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    value: openProp,
  });

  const voiceSelectorContext = useMemo(
    () => ({ open, setOpen, setValue, value }),
    [value, setValue, open, setOpen]
  );

  return (
    <VoiceSelectorContext.Provider value={voiceSelectorContext}>
      <Dialog onOpenChange={(next) => setOpen(next)} open={open} {...props}>
        {children}
      </Dialog>
    </VoiceSelectorContext.Provider>
  );
};

export type VoiceSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

export const VoiceSelectorTrigger = (props: VoiceSelectorTriggerProps) => (
  <DialogTrigger {...props} />
);

export type VoiceSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
};

export const VoiceSelectorContent = ({
  className,
  children,
  title = "Voice Selector",
  ...props
}: VoiceSelectorContentProps) => (
  <DialogContent className={cn("p-0", className)} {...props}>
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command className="**:data-[slot=command-input-wrapper]:h-auto">
      {children}
    </Command>
  </DialogContent>
);

export type VoiceSelectorDialogProps = ComponentProps<typeof CommandDialog>;

export const VoiceSelectorDialog = (props: VoiceSelectorDialogProps) => (
  <CommandDialog {...props} />
);

export type VoiceSelectorInputProps = ComponentProps<typeof CommandInput>;

export const VoiceSelectorInput = ({
  className,
  ...props
}: VoiceSelectorInputProps) => (
  <CommandInput className={cn("h-auto py-3.5", className)} {...props} />
);

export type VoiceSelectorListProps = ComponentProps<typeof CommandList>;

export const VoiceSelectorList = (props: VoiceSelectorListProps) => (
  <CommandList {...props} />
);

export type VoiceSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export const VoiceSelectorEmpty = (props: VoiceSelectorEmptyProps) => (
  <CommandEmpty {...props} />
);

export type VoiceSelectorGroupProps = ComponentProps<typeof CommandGroup>;

export const VoiceSelectorGroup = (props: VoiceSelectorGroupProps) => (
  <CommandGroup {...props} />
);

export type VoiceSelectorItemProps = ComponentProps<typeof CommandItem>;

export const VoiceSelectorItem = ({
  className,
  ...props
}: VoiceSelectorItemProps) => (
  <CommandItem className={cn("px-4 py-2", className)} {...props} />
);

export type VoiceSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;

export const VoiceSelectorShortcut = (props: VoiceSelectorShortcutProps) => (
  <CommandShortcut {...props} />
);

export type VoiceSelectorSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;

export const VoiceSelectorSeparator = (props: VoiceSelectorSeparatorProps) => (
  <CommandSeparator {...props} />
);

export type VoiceSelectorGenderProps = ComponentProps<"span"> & {
  value?:
    | "male"
    | "female"
    | "transgender"
    | "androgyne"
    | "non-binary"
    | "intersex";
};

const GENDER_ICONS = {
  androgyne: MarsStrokeIcon,
  female: VenusIcon,
  intersex: VenusAndMarsIcon,
  male: MarsIcon,
  "non-binary": NonBinaryIcon,
  transgender: TransgenderIcon,
} as const;

export const VoiceSelectorGender = ({
  className,
  value,
  children,
  ...props
}: VoiceSelectorGenderProps) => {
  const Icon = value ? GENDER_ICONS[value] : undefined;

  return (
    <span
      className={cn("text-muted-foreground text-xs", className)}
      // An icon on its own says nothing to a screen reader; name it by the value it stands for.
      {...(children === undefined && Icon
        ? { "aria-label": value, role: "img" }
        : {})}
      {...props}
    >
      {children ??
        (Icon ? (
          <Icon aria-hidden="true" className="size-4" />
        ) : (
          <CircleSmallIcon aria-hidden="true" className="size-4" />
        ))}
    </span>
  );
};

// Known accents, for editor completion; any string is accepted and renders no flag if unknown.
type KnownAccent =
  | "american"
  | "british"
  | "australian"
  | "canadian"
  | "irish"
  | "scottish"
  | "indian"
  | "south-african"
  | "new-zealand"
  | "spanish"
  | "french"
  | "german"
  | "italian"
  | "portuguese"
  | "brazilian"
  | "mexican"
  | "argentinian"
  | "japanese"
  | "chinese"
  | "korean"
  | "russian"
  | "arabic"
  | "dutch"
  | "swedish"
  | "norwegian"
  | "danish"
  | "finnish"
  | "polish"
  | "turkish"
  | "greek";

export type VoiceSelectorAccentProps = ComponentProps<"span"> & {
  value?: KnownAccent | (string & Record<never, never>);
};

// Flags as escapes so the table survives an editor that normalises or strips emoji sequences.
const ACCENT_FLAGS: Record<KnownAccent, string> = {
  american: "\u{1F1FA}\u{1F1F8}",
  british: "\u{1F1EC}\u{1F1E7}",
  australian: "\u{1F1E6}\u{1F1FA}",
  canadian: "\u{1F1E8}\u{1F1E6}",
  irish: "\u{1F1EE}\u{1F1EA}",
  scottish: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  indian: "\u{1F1EE}\u{1F1F3}",
  "south-african": "\u{1F1FF}\u{1F1E6}",
  "new-zealand": "\u{1F1F3}\u{1F1FF}",
  spanish: "\u{1F1EA}\u{1F1F8}",
  french: "\u{1F1EB}\u{1F1F7}",
  german: "\u{1F1E9}\u{1F1EA}",
  italian: "\u{1F1EE}\u{1F1F9}",
  portuguese: "\u{1F1F5}\u{1F1F9}",
  brazilian: "\u{1F1E7}\u{1F1F7}",
  mexican: "\u{1F1F2}\u{1F1FD}",
  argentinian: "\u{1F1E6}\u{1F1F7}",
  japanese: "\u{1F1EF}\u{1F1F5}",
  chinese: "\u{1F1E8}\u{1F1F3}",
  korean: "\u{1F1F0}\u{1F1F7}",
  russian: "\u{1F1F7}\u{1F1FA}",
  arabic: "\u{1F1F8}\u{1F1E6}",
  dutch: "\u{1F1F3}\u{1F1F1}",
  swedish: "\u{1F1F8}\u{1F1EA}",
  norwegian: "\u{1F1F3}\u{1F1F4}",
  danish: "\u{1F1E9}\u{1F1F0}",
  finnish: "\u{1F1EB}\u{1F1EE}",
  polish: "\u{1F1F5}\u{1F1F1}",
  turkish: "\u{1F1F9}\u{1F1F7}",
  greek: "\u{1F1EC}\u{1F1F7}",
};

const accentFlag = (value: string | undefined) =>
  value && Object.hasOwn(ACCENT_FLAGS, value)
    ? ACCENT_FLAGS[value as KnownAccent]
    : null;

export const VoiceSelectorAccent = ({
  className,
  value,
  children,
  ...props
}: VoiceSelectorAccentProps) => {
  const flag = accentFlag(value);

  return (
    <span
      className={cn("text-muted-foreground text-xs", className)}
      {...(children === undefined && flag
        ? { "aria-label": value, role: "img" }
        : {})}
      {...props}
    >
      {children ?? flag}
    </span>
  );
};

export type VoiceSelectorAgeProps = ComponentProps<"span">;

export const VoiceSelectorAge = ({
  className,
  ...props
}: VoiceSelectorAgeProps) => (
  <span
    className={cn("text-muted-foreground text-xs tabular-nums", className)}
    {...props}
  />
);

export type VoiceSelectorNameProps = ComponentProps<"span">;

export const VoiceSelectorName = ({
  className,
  ...props
}: VoiceSelectorNameProps) => (
  <span
    className={cn("flex-1 truncate text-left font-medium", className)}
    {...props}
  />
);

export type VoiceSelectorDescriptionProps = ComponentProps<"span">;

export const VoiceSelectorDescription = ({
  className,
  ...props
}: VoiceSelectorDescriptionProps) => (
  <span className={cn("text-muted-foreground text-xs", className)} {...props} />
);

export type VoiceSelectorAttributesProps = ComponentProps<"div">;

export const VoiceSelectorAttributes = ({
  className,
  children,
  ...props
}: VoiceSelectorAttributesProps) => (
  <div className={cn("flex items-center text-xs", className)} {...props}>
    {children}
  </div>
);

export type VoiceSelectorBulletProps = ComponentProps<"span">;

export const VoiceSelectorBullet = ({
  className,
  ...props
}: VoiceSelectorBulletProps) => (
  <span
    aria-hidden="true"
    className={cn("select-none text-border", className)}
    {...props}
  >
    &bull;
  </span>
);

export type VoiceSelectorPreviewProps = Omit<
  ComponentProps<"button">,
  "children"
> & {
  playing?: boolean;
  loading?: boolean;
  onPlay?: () => void;
};

export const VoiceSelectorPreview = ({
  className,
  playing,
  loading,
  onPlay,
  onClick,
  ...props
}: VoiceSelectorPreviewProps) => {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // The preview sits inside a selectable row; playing must not also select the voice.
      event.stopPropagation();
      onClick?.(event);
      onPlay?.();
    },
    [onClick, onPlay]
  );

  let icon = <PlayIcon className="size-3" />;

  if (loading) {
    icon = (
      <LoaderCircleIcon className="size-3 animate-spin motion-reduce:animate-none" />
    );
  } else if (playing) {
    icon = <PauseIcon className="size-3" />;
  }

  return (
    <Button
      aria-busy={loading || undefined}
      aria-label={playing ? "Pause preview" : "Play preview"}
      className={cn("size-6", className)}
      disabled={loading}
      onClick={handleClick}
      size="icon-sm"
      type="button"
      variant="outline"
      {...props}
    >
      {icon}
    </Button>
  );
};
