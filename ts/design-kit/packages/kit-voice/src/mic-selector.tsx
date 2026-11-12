/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/mic-selector.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/mic-selector.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences:
 *  - Radix -> Base UI: Popover from design-components, PopoverTrigger asChild -> render, Radix useControllableState -> design-components'
 *    (its parameters are named value/defaultValue/onChange, not prop/defaultProp)
 *  - useAudioDevices moved to ./use-audio-devices.ts (react-refresh: a file exports components or helpers, not both);
 *    it no longer re-prompts getUserMedia in a loop after permission is denied (loadDevices is stable and single-flight;
 *    MicSelector asks once per open), no longer throws without navigator.mediaDevices (insecure context), no console.error
 *  - popover width from Base UI's --anchor-width instead of a ResizeObserver and state
 */
"use client";

import {
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useControllableState,
} from "@hollis-labs/design-components";
import { ChevronsUpDownIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useAudioDevices } from "./use-audio-devices";

const deviceIdRegex = /\(([\da-fA-F]{4}:[\da-fA-F]{4})\)$/;

interface MicSelectorContextType {
  data: MediaDeviceInfo[];
  value: string | undefined;
  onValueChange?: (value: string | undefined) => void;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MicSelectorContext = createContext<MicSelectorContextType>({
  data: [],
  onOpenChange: undefined,
  onValueChange: undefined,
  open: false,
  value: undefined,
});

export type MicSelectorProps = Omit<
  ComponentProps<typeof Popover>,
  "open" | "defaultOpen" | "onOpenChange"
> & {
  defaultValue?: string;
  value?: string | undefined;
  onValueChange?: (value: string | undefined) => void;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const MicSelector = ({
  defaultValue,
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  ...props
}: MicSelectorProps) => {
  const [value, onValueChange] = useControllableState<string | undefined>({
    defaultValue,
    onChange: controlledOnValueChange,
    value: controlledValue,
  });
  const [open, onOpenChange] = useControllableState({
    defaultValue: defaultOpen,
    onChange: controlledOnOpenChange,
    value: controlledOpen,
  });
  const { devices, hasPermission, loadDevices } = useAudioDevices();

  // Ask once each time the selector opens. Re-asking on every state change is what
  // made a denied permission a loop; closing and reopening is the retry.
  const prompted = useRef(false);
  useEffect(() => {
    if (!open) {
      prompted.current = false;
      return;
    }

    if (!hasPermission && !prompted.current) {
      prompted.current = true;
      loadDevices();
    }
  }, [open, hasPermission, loadDevices]);

  const contextValue = useMemo(
    () => ({
      data: devices,
      onOpenChange,
      onValueChange,
      open,
      value,
    }),
    [devices, onOpenChange, onValueChange, open, value]
  );

  return (
    <MicSelectorContext.Provider value={contextValue}>
      <Popover {...props} onOpenChange={(next) => onOpenChange(next)} open={open} />
    </MicSelectorContext.Provider>
  );
};

export type MicSelectorTriggerProps = ComponentProps<typeof Button>;

export const MicSelectorTrigger = ({
  children,
  ...props
}: MicSelectorTriggerProps) => (
  <PopoverTrigger
    render={
      <Button variant="outline" {...props}>
        {children}
        <ChevronsUpDownIcon
          className="shrink-0 text-muted-foreground"
          size={16}
        />
      </Button>
    }
  />
);

export type MicSelectorContentProps = ComponentProps<typeof Command> & {
  popoverOptions?: ComponentProps<typeof PopoverContent>;
};

export const MicSelectorContent = ({
  className,
  popoverOptions,
  ...props
}: MicSelectorContentProps) => {
  const { onValueChange, value } = useContext(MicSelectorContext);

  return (
    <PopoverContent
      className={cn("w-(--anchor-width) p-0", className)}
      {...popoverOptions}
    >
      <Command onValueChange={onValueChange} value={value} {...props} />
    </PopoverContent>
  );
};

export type MicSelectorInputProps = ComponentProps<typeof CommandInput> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export const MicSelectorInput = ({ ...props }: MicSelectorInputProps) => (
  <CommandInput placeholder="Search microphones..." {...props} />
);

export type MicSelectorListProps = Omit<
  ComponentProps<typeof CommandList>,
  "children"
> & {
  children: (devices: MediaDeviceInfo[]) => ReactNode;
};

export const MicSelectorList = ({
  children,
  ...props
}: MicSelectorListProps) => {
  const { data } = useContext(MicSelectorContext);

  return <CommandList {...props}>{children(data)}</CommandList>;
};

export type MicSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export const MicSelectorEmpty = ({
  children = "No microphone found.",
  ...props
}: MicSelectorEmptyProps) => <CommandEmpty {...props}>{children}</CommandEmpty>;

export type MicSelectorItemProps = ComponentProps<typeof CommandItem>;

export const MicSelectorItem = (props: MicSelectorItemProps) => {
  const { onValueChange, onOpenChange } = useContext(MicSelectorContext);

  const handleSelect = useCallback(
    (currentValue: string) => {
      onValueChange?.(currentValue);
      onOpenChange?.(false);
    },
    [onValueChange, onOpenChange]
  );

  return <CommandItem onSelect={handleSelect} {...props} />;
};

export type MicSelectorLabelProps = ComponentProps<"span"> & {
  device: MediaDeviceInfo;
};

export const MicSelectorLabel = ({
  device,
  className,
  ...props
}: MicSelectorLabelProps) => {
  const matches = device.label.match(deviceIdRegex);

  if (!matches) {
    return (
      <span className={className} {...props}>
        {device.label}
      </span>
    );
  }

  const [, deviceId] = matches;
  const name = device.label.replace(deviceIdRegex, "");

  return (
    <span className={className} {...props}>
      <span>{name}</span>
      <span className="text-muted-foreground"> ({deviceId})</span>
    </span>
  );
};

export type MicSelectorValueProps = ComponentProps<"span">;

export const MicSelectorValue = ({
  className,
  ...props
}: MicSelectorValueProps) => {
  const { data, value } = useContext(MicSelectorContext);
  const currentDevice = data.find((d) => d.deviceId === value);

  if (!currentDevice) {
    return (
      <span className={cn("flex-1 text-left", className)} {...props}>
        Select microphone...
      </span>
    );
  }

  return (
    <MicSelectorLabel
      className={cn("flex-1 text-left", className)}
      device={currentDevice}
      {...props}
    />
  );
};
