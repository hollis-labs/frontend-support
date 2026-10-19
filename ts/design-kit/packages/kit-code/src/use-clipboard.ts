import { useCallback, useEffect, useRef, useState } from "react";

export function useClipboard(
  code: string,
  {
    onCopy,
    onError,
    timeout = 2000,
    getText,
  }: {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
    /** What is written, computed at copy time; `code` still identifies the source for the "copied" feedback. */
    getText?: () => string;
  },
) {
  const [copiedSource, setCopiedSource] = useState<string | null>(null);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  const copy = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (!globalThis.navigator?.clipboard?.writeText)
        throw new Error("Clipboard API not available");
      await navigator.clipboard.writeText(getText ? getText() : code);
      if (mounted.current) {
        setCopiedSource(code);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          setCopiedSource(null);
        }, timeout);
      }
      onCopy?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      busy.current = false;
    }
  }, [code, getText, onCopy, onError, timeout]);
  return { copied: copiedSource === code, copy };
}
