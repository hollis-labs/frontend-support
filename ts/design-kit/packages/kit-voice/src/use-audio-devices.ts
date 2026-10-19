/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/mic-selector.tsx (the `useAudioDevices` export)
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/mic-selector.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences:
 *  - split into its own file (react-refresh: components and helpers do not share a file); still exported from the package index
 *  - loadDevices is stable and single-flight. Upstream depended on `loading`, so each rejected getUserMedia handed the caller a new
 *    callback and a permission prompt fired again, forever, once access was denied
 *  - no TypeError without navigator.mediaDevices (insecure context or unsupported browser): `error` explains it instead, and no
 *    devicechange listener is added; the check is a useSyncExternalStore so server and first client render agree
 *  - no console.error: the failure is returned as `error`
 */
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const MEDIA_DEVICES_UNAVAILABLE =
  "Microphone access needs a secure context (HTTPS or localhost) and a browser that provides navigator.mediaDevices.";

const subscribeNever = () => () => {};
const hasMediaDevices = () =>
  typeof navigator !== "undefined" && Boolean(navigator.mediaDevices);

const listAudioInputs = async () =>
  (await navigator.mediaDevices.enumerateDevices()).filter(
    (device) => device.kind === "audioinput"
  );

const messageOf = (caughtError: unknown) =>
  caughtError instanceof Error
    ? caughtError.message
    : "Failed to get audio devices";

export const useAudioDevices = () => {
  const supported = useSyncExternalStore(
    subscribeNever,
    hasMediaDevices,
    () => true
  );
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const requesting = useRef(false);

  // Promise callbacks rather than async/await: this runs from an effect on mount, and
  // the state is set in the result callbacks, never synchronously in the effect body.
  const loadDevicesWithoutPermission = useCallback(() => {
    if (!navigator.mediaDevices) {
      return;
    }

    listAudioInputs()
      .then(
        (audioInputs) => {
          setDevices(audioInputs);
          setError(null);
        },
        (caughtError: unknown) => {
          setError(messageOf(caughtError));
        }
      )
      .finally(() => setLoading(false));
  }, []);

  const loadDevicesWithPermission = useCallback(async () => {
    if (requesting.current || !navigator.mediaDevices) {
      return;
    }

    requesting.current = true;
    try {
      setLoading(true);
      setError(null);

      const tempStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      for (const track of tempStream.getTracks()) {
        track.stop();
      }

      setDevices(await listAudioInputs());
      setHasPermission(true);
    } catch (caughtError) {
      setError(messageOf(caughtError));
    } finally {
      requesting.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevicesWithoutPermission();
  }, [loadDevicesWithoutPermission]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) {
      return;
    }

    const handleDeviceChange = () => {
      if (hasPermission) {
        loadDevicesWithPermission();
      } else {
        loadDevicesWithoutPermission();
      }
    };

    mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [hasPermission, loadDevicesWithPermission, loadDevicesWithoutPermission]);

  return {
    devices,
    error: supported ? error : MEDIA_DEVICES_UNAVAILABLE,
    hasPermission,
    loadDevices: loadDevicesWithPermission,
    loading: supported ? loading : false,
  };
};
