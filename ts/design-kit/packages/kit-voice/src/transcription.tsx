/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/transcription.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/transcription.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences:
 *  - `ai` types removed: segments are the local `TranscriptionSegmentData` ({ text, startSecond, endSecond }), the same fields as the
 *    AI SDK's transcription segments, so a host can pass those straight in
 *  - Radix useControllableState -> design-components'
 *  - upstream's `onTimeUpdate` (the hook's setter) was in the context and nothing called it, so an uncontrolled `currentTime` never
 *    advanced and clicking a segment changed nothing on screen. Clicking now records the time when uncontrolled and always calls `onSeek`;
 *    the unused `onTimeUpdate` is gone. For playback, control `currentTime` from the player (see the README)
 *  - a segment with no `onSeek` and no `onClick` renders a <span>, not a <button>: upstream left a tab stop on every word that did nothing
 *  - `data-active` and the muted/primary text colours are kept as upstream's
 */
"use client";

import { cn, useControllableState } from "@hollis-labs/design-components";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo } from "react";

/** One timed piece of a transcript. Times are seconds from the start of the audio. */
export interface TranscriptionSegmentData {
  text: string;
  startSecond: number;
  endSecond: number;
}

interface TranscriptionContextValue {
  segments: TranscriptionSegmentData[];
  currentTime: number;
  onSeek?: (time: number) => void;
}

const TranscriptionContext = createContext<TranscriptionContextValue | null>(
  null
);

const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error(
      "Transcription components must be used within Transcription"
    );
  }
  return context;
};

export type TranscriptionProps = Omit<ComponentProps<"div">, "children"> & {
  segments: TranscriptionSegmentData[];
  /**
   * Playback position in seconds. Pass it from your player's time updates and the active
   * segment follows it. Left out, it starts at 0 and follows the segment last clicked
   * (segments are only clickable when `onSeek` is given).
   */
  currentTime?: number;
  /** Called with a segment's `startSecond` when it is clicked. Seek your player here. */
  onSeek?: (time: number) => void;
  children: (segment: TranscriptionSegmentData, index: number) => ReactNode;
};

export const Transcription = ({
  segments,
  currentTime: externalCurrentTime,
  onSeek,
  className,
  children,
  ...props
}: TranscriptionProps) => {
  const [currentTime, setCurrentTime] = useControllableState({
    defaultValue: 0,
    value: externalCurrentTime,
  });

  // Not the hook's `onChange`: that only fires when the value changes, and a click on the
  // segment the player is already inside must still ask the host to seek.
  const seek = useCallback(
    (time: number) => {
      setCurrentTime(time);
      onSeek?.(time);
    },
    [onSeek, setCurrentTime]
  );

  const contextValue = useMemo(
    () => ({
      currentTime,
      onSeek: onSeek ? seek : undefined,
      segments,
    }),
    [currentTime, onSeek, seek, segments]
  );

  return (
    <TranscriptionContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex flex-wrap gap-1 text-sm leading-relaxed",
          className
        )}
        data-slot="transcription"
        {...props}
      >
        {segments
          .filter((segment) => segment.text.trim())
          .map((segment, index) => children(segment, index))}
      </div>
    </TranscriptionContext.Provider>
  );
};

export type TranscriptionSegmentProps = ComponentProps<"button"> & {
  segment: TranscriptionSegmentData;
  index: number;
};

export const TranscriptionSegment = ({
  segment,
  index,
  className,
  onClick,
  ...props
}: TranscriptionSegmentProps) => {
  const { currentTime, onSeek } = useTranscription();

  const isActive =
    currentTime >= segment.startSecond && currentTime < segment.endSecond;
  const isPast = currentTime >= segment.endSecond;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onSeek?.(segment.startSecond);
      onClick?.(event);
    },
    [onSeek, segment.startSecond, onClick]
  );

  const classes = cn(
    "inline text-left",
    isActive && "text-primary",
    isPast && "text-muted-foreground",
    !(isActive || isPast) && "text-muted-foreground/60",
    onSeek && "cursor-pointer hover:text-foreground",
    !onSeek && "cursor-default",
    className
  );

  // Nothing to do on click means nothing to focus: a plain span.
  if (!(onSeek || onClick)) {
    return (
      <span
        className={classes}
        data-active={isActive}
        data-index={index}
        data-slot="transcription-segment"
        {...(props as ComponentProps<"span">)}
      >
        {segment.text}
      </span>
    );
  }

  return (
    <button
      className={classes}
      data-active={isActive}
      data-index={index}
      data-slot="transcription-segment"
      onClick={handleClick}
      type="button"
      {...props}
    >
      {segment.text}
    </button>
  );
};
