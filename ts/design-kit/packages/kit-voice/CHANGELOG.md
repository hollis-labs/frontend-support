# Changelog

## 0.0.0 — unreleased, private

- Add the package skeleton: manifest, build, lint and typecheck wiring, enrolled on
  both repo gates. No components yet.
- Add `SpeechInput`: Web Speech where the browser has it, otherwise a MediaRecorder fallback
  that hands the host a `Blob` through `onAudioRecorded`. Reports failures through `onError`,
  is disabled outside a secure context with `data-unavailable` saying why, types the Blob with
  the recorder's own mimeType, and releases the microphone on unmount.
- Add `MicSelector` (and its `MicSelector*` parts) and `useAudioDevices`. Asks for the
  microphone once per open instead of looping after a denial, and does not throw without
  `navigator.mediaDevices`.
- Add `VoiceSelector` and its parts (`Trigger`, `Content`, `Dialog`, `Input`, `List`, `Empty`,
  `Group`, `Item`, `Shortcut`, `Separator`, `Gender`, `Accent`, `Age`, `Name`, `Description`,
  `Attributes`, `Bullet`, `Preview`) and `useVoiceSelector`. `onOpenChange` is `(open) => void`;
  gender and accent are announced by name; the preview does not choose the row it sits in.
- Add `Transcription` and `TranscriptionSegment`, with a local `TranscriptionSegmentData`
  instead of the AI SDK's type. Clicking a segment records the time when uncontrolled and always
  calls `onSeek`; a segment nothing can act on is a `<span>`, not a button.
- Add `AudioPlayer` and its controls on the opt-in `@hollis-labs/kit-voice/audio-player`
  subpath, on `media-chrome` (an optional peer; the main entry never imports it). Plays a `src`
  or a `blob` (object URL created and revoked by the element). Fixes upstream: no `ai`
  `SpeechResult`, no `data` object spread onto the `<audio>` node, `--media-control-padding` is
  `0px` (upstream's unitless `0` is invalid in media-chrome's `calc()`, which collapsed the time
  range's height), and the time range is `min-w-40` by default. **Imports `ButtonGroup` and
  `ButtonGroupText`: needs the next `design-components` release (unreleased).**
- Radix's `useControllableState` is replaced by the one `design-components` now exports.
  **kit-voice therefore needs the next `design-components` release (unreleased); the
  published `0.3.0` does not export it.**
- Add `test:run`, a fixtures demo (`npm run demo`) and Chromium evidence under `docs/evidence`.
