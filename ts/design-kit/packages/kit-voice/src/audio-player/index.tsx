/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/audio-player.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/audio-player.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences:
 *  - the `ai` package's SpeechResult is gone: `AudioPlayerElement` takes `src` (a URL) or `blob` (a Blob, played through an object URL that is
 *    revoked when it is replaced or the element unmounts). Upstream's `data` variant was also spread onto the <audio> DOM node
 *    (`{...props}` after `src`), putting `data="[object Object]"` on the element
 *  - Radix `asChild` -> none: the media-chrome elements are not wrapped in a Button. The play and seek buttons take `buttonVariants()` classes
 *    directly, because a Base UI `render` Button would add role, tabIndex and a key handler to elements that already have their own;
 *    the text parts use design-components' ButtonGroupText through its `render` prop
 *  - the `--media-*` custom properties use the contract's variables for scale as well as colour (`--text-caption`, `--radius-control`,
 *    a spacing multiple) where upstream had `10px`, `1rem` and `--radius-md`
 *  - `--media-control-padding` is `0px`, not `0`: a unitless zero is invalid inside media-chrome's calc(), so upstream's declaration was dropped and the
 *    time range collapsed to zero height (the seek bar could barely be clicked; found by clicking it in a real browser)
 *  - the time range has `min-w-40` by default: media-chrome's 100px minimum, less the ButtonGroupText's padding and the range's own gaps, left
 *    a seek bar about 50px wide. `className` overrides it (e.g. `min-w-64`)
 *  - empty `cn("", className)` calls removed
 * Needs the optional peer `media-chrome` (>=4.17.2) and, from design-components, ButtonGroup: the next release (unreleased).
 */
"use client";

import {
  ButtonGroup,
  ButtonGroupText,
  buttonVariants,
  cn,
} from "@hollis-labs/design-components";
import {
  MediaControlBar,
  MediaController,
  MediaDurationDisplay,
  MediaMuteButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from "media-chrome/react";
import type { ComponentProps, CSSProperties, Ref } from "react";
import { useCallback, useEffect, useRef } from "react";

export type AudioPlayerProps = Omit<
  ComponentProps<typeof MediaController>,
  "audio"
>;

export const AudioPlayer = ({
  children,
  style,
  ...props
}: AudioPlayerProps) => (
  <MediaController
    audio
    data-slot="audio-player"
    style={
      {
        "--media-background-color": "transparent",
        "--media-button-icon-height": "calc(var(--spacing) * 4)",
        "--media-button-icon-width": "calc(var(--spacing) * 4)",
        "--media-control-background": "transparent",
        "--media-control-hover-background": "var(--color-accent)",
        // "0px", not upstream's "0": media-chrome uses this inside calc() with lengths, where a
        // unitless zero is invalid, and the declaration was dropped. The time range's height
        // collapsed to nothing, so clicking the seek bar mostly missed it.
        "--media-control-padding": "0px",
        "--media-font": "var(--font-sans)",
        "--media-font-size": "var(--text-caption)",
        "--media-icon-color": "currentColor",
        "--media-preview-time-background": "var(--color-bg)",
        "--media-preview-time-border-radius": "var(--radius-control)",
        "--media-preview-time-text-shadow": "none",
        "--media-primary-color": "var(--color-primary)",
        "--media-range-bar-color": "var(--color-primary)",
        "--media-range-track-background": "var(--color-secondary)",
        "--media-secondary-color": "var(--color-secondary)",
        "--media-text-color": "var(--color-fg)",
        "--media-tooltip-arrow-display": "none",
        "--media-tooltip-background": "var(--color-bg)",
        "--media-tooltip-border-radius": "var(--radius-control)",
        ...style,
      } as CSSProperties
    }
    {...props}
  >
    {children}
  </MediaController>
);

export type AudioPlayerElementProps = Omit<ComponentProps<"audio">, "src"> &
  (
    | {
        /** A URL the browser can play. */
        src: string;
        blob?: never;
      }
    | {
        /** Audio you hold in memory, e.g. a recording or a fetched speech response. Played through an object URL that this element owns and revokes. */
        blob: Blob;
        src?: never;
      }
  );

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
};

export const AudioPlayerElement = ({
  src,
  blob,
  ref,
  ...props
}: AudioPlayerElementProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const setRef = useCallback(
    (node: HTMLAudioElement | null) => {
      audioRef.current = node;
      assignRef(ref, node);
    },
    [ref]
  );

  // The object URL is created and revoked in one place, so it cannot outlive its Blob or be
  // created twice by a double render. Set on the element directly: there is no state to hold.
  useEffect(() => {
    const audio = audioRef.current;
    if (!(blob && audio)) {
      return;
    }

    const url = URL.createObjectURL(blob);
    audio.src = url;

    return () => {
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return (
    // Captions, where there are any, are the consumer's: pass <track> children.
    <audio
      data-slot="audio-player-element"
      ref={setRef}
      slot="media"
      src={src}
      {...props}
    />
  );
};

export type AudioPlayerControlBarProps = ComponentProps<typeof MediaControlBar>;

export const AudioPlayerControlBar = ({
  children,
  ...props
}: AudioPlayerControlBarProps) => (
  <MediaControlBar data-slot="audio-player-control-bar" {...props}>
    <ButtonGroup orientation="horizontal">{children}</ButtonGroup>
  </MediaControlBar>
);

const iconButton = buttonVariants({ size: "icon-sm", variant: "outline" });

export type AudioPlayerPlayButtonProps = ComponentProps<typeof MediaPlayButton>;

export const AudioPlayerPlayButton = ({
  className,
  ...props
}: AudioPlayerPlayButtonProps) => (
  <MediaPlayButton
    className={cn(iconButton, "bg-transparent", className)}
    data-slot="audio-player-play-button"
    {...props}
  />
);

export type AudioPlayerSeekBackwardButtonProps = ComponentProps<
  typeof MediaSeekBackwardButton
>;

export const AudioPlayerSeekBackwardButton = ({
  className,
  seekOffset = 10,
  ...props
}: AudioPlayerSeekBackwardButtonProps) => (
  <MediaSeekBackwardButton
    className={cn(iconButton, className)}
    data-slot="audio-player-seek-backward-button"
    seekOffset={seekOffset}
    {...props}
  />
);

export type AudioPlayerSeekForwardButtonProps = ComponentProps<
  typeof MediaSeekForwardButton
>;

export const AudioPlayerSeekForwardButton = ({
  className,
  seekOffset = 10,
  ...props
}: AudioPlayerSeekForwardButtonProps) => (
  <MediaSeekForwardButton
    className={cn(iconButton, className)}
    data-slot="audio-player-seek-forward-button"
    seekOffset={seekOffset}
    {...props}
  />
);

export type AudioPlayerTimeDisplayProps = ComponentProps<
  typeof MediaTimeDisplay
>;

export const AudioPlayerTimeDisplay = ({
  className,
  ...props
}: AudioPlayerTimeDisplayProps) => (
  <ButtonGroupText
    className="bg-transparent"
    render={
      <MediaTimeDisplay
        className={cn("tabular-nums", className)}
        data-slot="audio-player-time-display"
        {...props}
      />
    }
  />
);

export type AudioPlayerTimeRangeProps = ComponentProps<typeof MediaTimeRange>;

export const AudioPlayerTimeRange = ({
  className,
  ...props
}: AudioPlayerTimeRangeProps) => (
  <ButtonGroupText
    className="bg-transparent"
    render={
      <MediaTimeRange
        className={cn("min-w-40", className)}
        data-slot="audio-player-time-range"
        {...props}
      />
    }
  />
);

export type AudioPlayerDurationDisplayProps = ComponentProps<
  typeof MediaDurationDisplay
>;

export const AudioPlayerDurationDisplay = ({
  className,
  ...props
}: AudioPlayerDurationDisplayProps) => (
  <ButtonGroupText
    className="bg-transparent"
    render={
      <MediaDurationDisplay
        className={cn("tabular-nums", className)}
        data-slot="audio-player-duration-display"
        {...props}
      />
    }
  />
);

export type AudioPlayerMuteButtonProps = ComponentProps<typeof MediaMuteButton>;

export const AudioPlayerMuteButton = ({
  className,
  ...props
}: AudioPlayerMuteButtonProps) => (
  <ButtonGroupText
    className="bg-transparent"
    render={
      <MediaMuteButton
        className={className}
        data-slot="audio-player-mute-button"
        {...props}
      />
    }
  />
);

export type AudioPlayerVolumeRangeProps = ComponentProps<
  typeof MediaVolumeRange
>;

export const AudioPlayerVolumeRange = ({
  className,
  ...props
}: AudioPlayerVolumeRangeProps) => (
  <ButtonGroupText
    className="bg-transparent"
    render={
      <MediaVolumeRange
        className={className}
        data-slot="audio-player-volume-range"
        {...props}
      />
    }
  />
);
