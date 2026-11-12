/**
 * `@hollis-labs/kit-voice` — voice input and output components.
 *
 * Original Hollis Labs (MIT) aggregation barrel exporting AI Elements ports
 * (Apache-2.0), adapted to Base UI and the token contract. See README.md and
 * docs/upstream-versions.md. The main entry carries no heavy
 * dependency; `AudioPlayer` and its media-chrome peer live behind the separate
 * `@hollis-labs/kit-voice/audio-player` entry and are never imported from here. Needs the next
 * design-components release (unreleased): it imports its `useControllableState`.
 */
export {
  MicSelector,
  MicSelectorContent,
  MicSelectorEmpty,
  MicSelectorInput,
  MicSelectorItem,
  MicSelectorLabel,
  MicSelectorList,
  MicSelectorTrigger,
  MicSelectorValue,
} from './mic-selector'
export type {
  MicSelectorContentProps,
  MicSelectorEmptyProps,
  MicSelectorInputProps,
  MicSelectorItemProps,
  MicSelectorLabelProps,
  MicSelectorListProps,
  MicSelectorProps,
  MicSelectorTriggerProps,
  MicSelectorValueProps,
} from './mic-selector'
export { SpeechInput } from './speech-input'
export type {
  SpeechInputAvailability,
  SpeechInputError,
  SpeechInputErrorCode,
  SpeechInputProps,
} from './speech-input'
export { useAudioDevices } from './use-audio-devices'
export { Transcription, TranscriptionSegment } from './transcription'
export type {
  TranscriptionProps,
  TranscriptionSegmentData,
  TranscriptionSegmentProps,
} from './transcription'
export {
  VoiceSelector,
  VoiceSelectorAccent,
  VoiceSelectorAge,
  VoiceSelectorAttributes,
  VoiceSelectorBullet,
  VoiceSelectorContent,
  VoiceSelectorDescription,
  VoiceSelectorDialog,
  VoiceSelectorEmpty,
  VoiceSelectorGender,
  VoiceSelectorGroup,
  VoiceSelectorInput,
  VoiceSelectorItem,
  VoiceSelectorList,
  VoiceSelectorName,
  VoiceSelectorPreview,
  VoiceSelectorSeparator,
  VoiceSelectorShortcut,
  VoiceSelectorTrigger,
} from './voice-selector'
export type {
  VoiceSelectorAccentProps,
  VoiceSelectorAgeProps,
  VoiceSelectorAttributesProps,
  VoiceSelectorBulletProps,
  VoiceSelectorContentProps,
  VoiceSelectorDescriptionProps,
  VoiceSelectorDialogProps,
  VoiceSelectorEmptyProps,
  VoiceSelectorGenderProps,
  VoiceSelectorGroupProps,
  VoiceSelectorInputProps,
  VoiceSelectorItemProps,
  VoiceSelectorListProps,
  VoiceSelectorNameProps,
  VoiceSelectorPreviewProps,
  VoiceSelectorProps,
  VoiceSelectorSeparatorProps,
  VoiceSelectorShortcutProps,
  VoiceSelectorTriggerProps,
} from './voice-selector'
export { useVoiceSelector } from './voice-selector-context'
