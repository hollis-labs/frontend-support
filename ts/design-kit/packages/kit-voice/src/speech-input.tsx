/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/speech-input.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/speech-input.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences:
 *  - Button from design-components; Spinner (not in the kit) is lucide's LoaderCircleIcon with animate-spin; no `declare global`:
 *    a minimal local SpeechRecognition constructor interface instead, so the augmentation does not leak into a consumer's types
 *  - tokens, not values: bg-danger / text-danger-fg / hover:bg-danger-hover and border-danger/30 for the rings (upstream used
 *    bg-destructive, text-white and red-400); rings are hidden under prefers-reduced-motion
 *  - mode is read with useSyncExternalStore (server snapshot is "unsupported", so there is no hydration mismatch) and is gated on
 *    window.isSecureContext: Web Speech and getUserMedia do not work outside HTTPS or localhost, and upstream stayed silent there
 *  - recognition is created on the first click, not in an effect: react-hooks forbids the synchronous setState upstream used
 *  - failures are reported through `onError` ({ code, message, cause }); upstream swallowed all of them
 *  - the MediaRecorder fallback types its Blob with the recorder's mimeType (upstream hardcoded audio/webm; Safari records mp4),
 *    stops the microphone when the component unmounts and discards a recording that was still running instead of transcribing it
 *  - a host `onClick` runs first and can preventDefault() the toggle; upstream's `{...props}` replaced the toggle outright
 *  - aria-label "Voice input" plus aria-pressed (upstream had no accessible name); `data-unavailable` says why it is disabled
 */
"use client";

import { Button, cn } from "@hollis-labs/design-components";
import { LoaderCircleIcon, MicIcon, SquareIcon } from "lucide-react";
import type { ComponentProps } from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * The constructor `window.SpeechRecognition` / `window.webkitSpeechRecognition`. lib.dom has the
 * event and result types but no recognizer, so this is the part of it the component uses.
 */
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

/** How a `SpeechInput` is transcribing, or why it cannot. */
export type SpeechInputAvailability =
  | "speech-recognition"
  | "media-recorder"
  /** Needs HTTPS or localhost: the browser withholds the microphone from any other origin. */
  | "insecure-context"
  /** Neither Web Speech nor MediaRecorder with getUserMedia exists here. */
  | "unsupported";

export type SpeechInputErrorCode =
  | "permission-denied"
  | "no-audio-input"
  | "recognition-error"
  | "recording-error"
  | "transcription-failed";

export interface SpeechInputError {
  code: SpeechInputErrorCode;
  message: string;
  /** The underlying error or event, untouched. */
  cause: unknown;
}

export type SpeechInputProps = Omit<ComponentProps<typeof Button>, "onError"> & {
  /**
   * Final transcript text: from Web Speech, or what `onAudioRecorded` resolved to.
   * Each call is one finished chunk; append it, do not replace with it.
   */
  onTranscriptionChange?: (text: string) => void;
  /**
   * Required for the MediaRecorder fallback, which is what runs where Web Speech is absent
   * (Firefox, and any browser that does not provide it). Receives the recording; send it to
   * a transcription service of your choosing and resolve the text. Without it the button is
   * disabled in those browsers (`data-unavailable="media-recorder-needs-onAudioRecorded"`).
   * The Blob's type is the recorder's own mimeType, which varies by browser.
   */
  onAudioRecorded?: (audioBlob: Blob) => Promise<string>;
  /** Called when the microphone, recognition, recording or `onAudioRecorded` fails. */
  onError?: (error: SpeechInputError) => void;
  /** BCP 47 tag for Web Speech. Read each time recognition starts. */
  lang?: string;
};

// Base UI hands its handlers a React MouseEvent extended with preventBaseUIHandler.
type ButtonClickEvent = Parameters<
  NonNullable<ComponentProps<typeof Button>["onClick"]>
>[0];

const subscribeNever = () => () => {};

const detectAvailability = (): SpeechInputAvailability => {
  if (typeof window === "undefined") {
    return "unsupported";
  }

  // A secure context is a precondition for both paths, so say that rather than "unsupported".
  if (!window.isSecureContext) {
    return "insecure-context";
  }

  if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
    return "speech-recognition";
  }

  if ("MediaRecorder" in window && navigator.mediaDevices) {
    return "media-recorder";
  }

  return "unsupported";
};

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error && cause.message ? cause.message : fallback;

const mediaErrorCode = (cause: unknown): SpeechInputErrorCode => {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "permission-denied";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "no-audio-input";
  }
  return "recording-error";
};

const recognitionErrorCode = (reason: string): SpeechInputErrorCode => {
  if (reason === "not-allowed" || reason === "service-not-allowed") {
    return "permission-denied";
  }
  if (reason === "audio-capture") {
    return "no-audio-input";
  }
  return "recognition-error";
};

const stopTracks = (stream: MediaStream | null) => {
  if (!stream) {
    return;
  }
  for (const track of stream.getTracks()) {
    track.stop();
  }
};

export const SpeechInput = ({
  className,
  onTranscriptionChange,
  onAudioRecorded,
  onError,
  onClick,
  disabled,
  lang = "en-US",
  ...props
}: SpeechInputProps) => {
  const availability = useSyncExternalStore(
    subscribeNever,
    detectAvailability,
    () => "unsupported" as const
  );
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const starting = useRef(false);
  const mounted = useRef(false);

  // Handlers read the latest callbacks without being re-created, so the recognizer's
  // listeners (attached once) never see a stale one. Synced in an effect, not in render.
  const onTranscriptionChangeRef = useRef(onTranscriptionChange);
  const onAudioRecordedRef = useRef(onAudioRecorded);
  const onErrorRef = useRef(onError);
  const langRef = useRef(lang);
  useEffect(() => {
    onTranscriptionChangeRef.current = onTranscriptionChange;
    onAudioRecordedRef.current = onAudioRecorded;
    onErrorRef.current = onError;
    langRef.current = lang;
  });

  const report = useCallback(
    (code: SpeechInputErrorCode, cause: unknown, fallback: string) => {
      onErrorRef.current?.({
        cause,
        code,
        message: messageOf(cause, fallback),
      });
    },
    []
  );

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;

      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.abort();

      // Discard a recording still in flight: the host asked for nothing after unmount.
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      stopTracks(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const createRecognition = useCallback((): SpeechRecognitionLike | null => {
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      return null;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.addEventListener("start", () => setIsListening(true));
    recognition.addEventListener("end", () => setIsListening(false));
    recognition.addEventListener("result", (event) => {
      const { resultIndex, results } = event as SpeechRecognitionEvent;
      let finalTranscript = "";

      for (let i = resultIndex; i < results.length; i += 1) {
        const result = results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript ?? "";
        }
      }

      if (finalTranscript) {
        onTranscriptionChangeRef.current?.(finalTranscript);
      }
    });
    recognition.addEventListener("error", (event) => {
      setIsListening(false);

      const reason = (event as SpeechRecognitionErrorEvent).error;
      // "aborted" is our own abort() on unmount, not a failure.
      if (reason !== "aborted") {
        report(
          recognitionErrorCode(reason),
          event,
          `Speech recognition failed: ${reason}`
        );
      }
    });

    return recognition;
  }, [report]);

  const startRecognition = useCallback(() => {
    recognitionRef.current ??= createRecognition();
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    recognition.lang = langRef.current;
    try {
      recognition.start();
    } catch (cause) {
      // start() throws InvalidStateError if it is already running; not a failure to report.
      if (!(cause instanceof DOMException && cause.name === "InvalidStateError")) {
        report("recognition-error", cause, "Speech recognition could not start");
      }
    }
  }, [createRecognition, report]);

  const startRecording = useCallback(async () => {
    if (!onAudioRecordedRef.current || starting.current) {
      return;
    }

    starting.current = true;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stopTracks(stream);
        return;
      }

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const recording = stream;

      recorder.addEventListener("dataavailable", (event) => {
        const { data } = event as BlobEvent;
        if (data.size > 0) {
          chunks.push(data);
        }
      });

      recorder.addEventListener("stop", () => {
        stopTracks(recording);
        if (streamRef.current === recording) {
          streamRef.current = null;
        }
        if (recorderRef.current === recorder) {
          recorderRef.current = null;
        }

        const audio = new Blob(chunks, {
          type: recorder.mimeType || chunks[0]?.type || "",
        });
        // Unmounted mid-recording, or nothing was captured: there is nothing to hand over.
        if (!mounted.current || audio.size === 0) {
          return;
        }

        setIsProcessing(true);
        const transcribe = onAudioRecordedRef.current;
        Promise.resolve(transcribe?.(audio))
          .then((transcript) => {
            if (transcript) {
              onTranscriptionChangeRef.current?.(transcript);
            }
          })
          .catch((cause: unknown) =>
            report("transcription-failed", cause, "Transcription failed")
          )
          .finally(() => {
            if (mounted.current) {
              setIsProcessing(false);
            }
          });
      });

      recorder.addEventListener("error", (event) => {
        setIsListening(false);
        stopTracks(recording);
        streamRef.current = null;
        recorderRef.current = null;
        report("recording-error", event, "Recording failed");
      });

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (cause) {
      stopTracks(stream);
      setIsListening(false);
      report(mediaErrorCode(cause), cause, "The microphone could not be opened");
    } finally {
      starting.current = false;
    }
  }, [report]);

  const stopRecording = useCallback(() => {
    // 'stop' fires after the last dataavailable and carries the transcription step.
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggle = (event: ButtonClickEvent) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (availability === "speech-recognition") {
      if (isListening) {
        recognitionRef.current?.stop();
      } else {
        startRecognition();
      }
    } else if (availability === "media-recorder") {
      if (isListening) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  const unavailable =
    availability === "media-recorder" && !onAudioRecorded
      ? "media-recorder-needs-onAudioRecorded"
      : availability === "insecure-context" || availability === "unsupported"
        ? availability
        : undefined;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Animated pulse rings */}
      {isListening &&
        [0, 1, 2].map((index) => (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-ping rounded-full border-2 border-danger/30 motion-reduce:hidden"
            key={index}
            style={{
              animationDelay: `${index * 0.3}s`,
              animationDuration: "2s",
            }}
          />
        ))}

      {/* Main record button */}
      <Button
        aria-busy={isProcessing || undefined}
        aria-label="Voice input"
        aria-pressed={isListening}
        className={cn(
          "relative z-10 rounded-full transition-all duration-300",
          isListening
            ? "bg-danger text-danger-fg hover:bg-danger-hover hover:text-danger-fg"
            : "hover:bg-primary/80 hover:text-primary-foreground",
          className
        )}
        data-availability={availability}
        data-unavailable={unavailable}
        disabled={Boolean(disabled) || Boolean(unavailable) || isProcessing}
        onClick={toggle}
        {...props}
      >
        {isProcessing && (
          <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
        )}
        {!isProcessing && isListening && <SquareIcon className="size-4" />}
        {!(isProcessing || isListening) && <MicIcon className="size-4" />}
      </Button>
    </div>
  );
};
