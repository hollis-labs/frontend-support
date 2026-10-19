# kit-voice upstream log

Source taken from AI Elements, following [the vendoring convention](../../design-components/docs/vendoring.md).
Pin: ai-elements 1.9.0, upstream commit `6a9d5b1822ffb10bba4bd97175f01edd7d8651cd` (2026-08-21).
Read-only checkout: `~/.cache/ai-elements-shared/upstream`. No `NOTICE` file at the pin.

| Local source | Upstream source at pin | Vendored | Divergences |
|---|---|---|---|
| `src/mic-selector.tsx` | `packages/elements/src/mic-selector.tsx` | 2026-10-02 | Radix to Base UI (Popover from design-components, `asChild` to `render`); Radix `useControllableState` to design-components' (unreleased, `value`/`defaultValue` params); popover width from `--anchor-width`, not a ResizeObserver; `useAudioDevices` moved out |
| `src/use-audio-devices.ts` | `packages/elements/src/mic-selector.tsx` (`useAudioDevices`) | 2026-10-02 | own file; `loadDevices` stable and single-flight (upstream re-prompted in a loop after a denial); no TypeError without `navigator.mediaDevices`; no `console.error` |
| `src/speech-input.tsx` | `packages/elements/src/speech-input.tsx` | 2026-10-02 | Button from design-components, no Spinner (lucide `LoaderCircleIcon`), no `declare global`; tokens (`danger`) not `red-400`/`white`; mode via `useSyncExternalStore` gated on `isSecureContext`; recognition created on click not in an effect; `onError`; Blob typed from the recorder, not `audio/webm`; unmount discards a running recording; host `onClick` composed; `aria-label`/`aria-pressed`; `data-unavailable` |
| `src/voice-selector.tsx` | `packages/elements/src/voice-selector.tsx` | 2026-10-02 | Dialog and Command from design-components, Radix `useControllableState` to design-components'; context and `useVoiceSelector` moved to `voice-selector-context.ts`; `onOpenChange` is `(open) => void`; accent switch to a lookup table (same flags); `role="img"` + `aria-label` on default gender icon and flag; Spinner to lucide `LoaderCircleIcon`; `aria-busy` on Preview; `aria-describedby={undefined}` dropped |
| `src/voice-selector-context.ts` | `packages/elements/src/voice-selector.tsx` (context, `useVoiceSelector`) | 2026-10-02 | own file (react-refresh) |
| `src/transcription.tsx` | `packages/elements/src/transcription.tsx` | 2026-10-02 | `ai` type to local `TranscriptionSegmentData`; Radix hook to design-components'; clicking records the time when uncontrolled and always calls `onSeek` (upstream's `onTimeUpdate` was never called); `onTimeUpdate` removed from the context; a non-interactive segment is a `<span>` |

| `src/audio-player/index.tsx` | `packages/elements/src/audio-player.tsx` | 2026-10-02 | `ai` `SpeechResult` removed (`src` or `blob`, object URL created and revoked); `data` no longer spread onto `<audio>`; Radix `asChild` to `buttonVariants()` classes on the media elements and `ButtonGroupText` `render`; `--media-*` on the contract variables; `--media-control-padding: 0px` (unitless `0` is invalid in media-chrome's `calc()`); time range `min-w-40` |

`src/index.ts` is an original Hollis Labs MIT aggregation barrel exporting the
ports above; it is not copied from an upstream file and is outside the Apache
source scope in LICENSE.
Not taken: `persona.tsx` (Rive, hotlinked `.riv` assets, no licence for them).
