import { useState } from 'react'
import {
  MicSelector,
  MicSelectorContent,
  MicSelectorEmpty,
  MicSelectorInput,
  MicSelectorItem,
  MicSelectorLabel,
  MicSelectorList,
  MicSelectorTrigger,
  MicSelectorValue,
  SpeechInput,
  Transcription,
  TranscriptionSegment,
  useVoiceSelector,
  VoiceSelector,
  VoiceSelectorAccent,
  VoiceSelectorAge,
  VoiceSelectorAttributes,
  VoiceSelectorBullet,
  VoiceSelectorContent,
  VoiceSelectorDescription,
  VoiceSelectorEmpty,
  VoiceSelectorGender,
  VoiceSelectorInput,
  VoiceSelectorItem,
  VoiceSelectorList,
  VoiceSelectorName,
  VoiceSelectorPreview,
  VoiceSelectorTrigger,
} from '../src'
import type { TranscriptionSegmentData } from '../src'
import type { SpeechInputError } from '../src'
import { AudioSection } from './AudioSection'

const VOICES = [
  { id: 'aria', name: 'Aria', gender: 'female', accent: 'american', age: '32', description: 'Warm and conversational' },
  { id: 'oliver', name: 'Oliver', gender: 'male', accent: 'british', age: '45', description: 'Measured, newsreader' },
  { id: 'mei', name: 'Mei', gender: 'non-binary', accent: 'chinese', age: '28', description: 'Bright and quick' },
] as const

const SEGMENTS: TranscriptionSegmentData[] = [
  { text: 'Voice', startSecond: 0, endSecond: 0.8 },
  { text: 'input', startSecond: 0.8, endSecond: 1.6 },
  { text: 'arrives', startSecond: 1.6, endSecond: 2.6 },
  { text: 'as', startSecond: 2.6, endSecond: 3 },
  { text: 'text', startSecond: 3, endSecond: 4 },
]

// Rows are wired through the context: choosing a voice sets it and closes the dialog.
function VoiceRows({ previewing, onPreview }: { previewing: string | undefined; onPreview: (id: string) => void }) {
  const { setOpen, setValue } = useVoiceSelector()
  return (
    <>
      <VoiceSelectorInput placeholder="Search voices..." />
      <VoiceSelectorList>
        <VoiceSelectorEmpty>No voices found.</VoiceSelectorEmpty>
        {VOICES.map((voice) => (
          <VoiceSelectorItem
            key={voice.id}
            keywords={[voice.name, voice.description]}
            onSelect={() => {
              setValue(voice.id)
              setOpen(false)
            }}
            value={voice.id}
          >
            <VoiceSelectorName>{voice.name}</VoiceSelectorName>
            <VoiceSelectorAttributes>
              <VoiceSelectorGender value={voice.gender} />
              <VoiceSelectorBullet />
              <VoiceSelectorAccent value={voice.accent} />
              <VoiceSelectorBullet />
              <VoiceSelectorAge>{voice.age}</VoiceSelectorAge>
            </VoiceSelectorAttributes>
            <VoiceSelectorDescription>{voice.description}</VoiceSelectorDescription>
            <VoiceSelectorPreview
              data-testid={`preview-${voice.id}`}
              onPlay={() => onPreview(voice.id)}
              playing={previewing === voice.id}
            />
          </VoiceSelectorItem>
        ))}
      </VoiceSelectorList>
    </>
  )
}

const panel = 'flex flex-col gap-3 rounded-panel border border-border bg-bg-elevated p-4'

// This fixture host owns the transcript and the log. kit-voice only reports; there is
// no speech service behind either button.
export function App() {
  const [transcript, setTranscript] = useState('')
  const [recorded, setRecorded] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [mic, setMic] = useState<string | undefined>()
  const [voice, setVoice] = useState<string | undefined>()
  const [previewing, setPreviewing] = useState<string | undefined>()
  const [time, setTime] = useState(1)
  const onError = (source: string) => (error: SpeechInputError) =>
    setErrors((current) => [...current, `${source}: ${error.code} — ${error.message}`])

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <h1 className="text-title font-semibold">kit-voice fixtures</h1>

        <section className={panel} aria-labelledby="speech-input">
          <h2 id="speech-input" className="text-label font-medium">SpeechInput (Web Speech)</h2>
          <p className="text-control text-fg-muted">
            Uses the browser's recognizer where there is one. It needs HTTPS or localhost.
          </p>
          <div className="flex items-center gap-3">
            <SpeechInput
              onError={onError('web-speech')}
              onTranscriptionChange={(text) => setTranscript((current) => current + text)}
            />
            <output className="text-control text-fg-secondary" data-testid="transcript">
              {transcript || 'No transcript yet.'}
            </output>
          </div>
        </section>

        <section className={panel} aria-labelledby="speech-input-recorder">
          <h2 id="speech-input-recorder" className="text-label font-medium">
            SpeechInput (MediaRecorder fallback)
          </h2>
          <p className="text-control text-fg-muted">
            Where Web Speech is absent the host gets the recording to transcribe. This fixture
            only reports what it received.
          </p>
          <div className="flex items-center gap-3">
            <SpeechInput
              data-testid="recorder-input"
              onAudioRecorded={async (blob) => `Received ${blob.size} bytes of ${blob.type || 'unknown type'}.`}
              onError={onError('recorder')}
              onTranscriptionChange={setRecorded}
            />
            <output className="text-control text-fg-secondary" data-testid="recorded">
              {recorded || 'Nothing recorded yet.'}
            </output>
          </div>
        </section>

        <section className={panel} aria-labelledby="mic-selector">
          <h2 id="mic-selector" className="text-label font-medium">MicSelector</h2>
          <MicSelector onValueChange={setMic} value={mic}>
            <MicSelectorTrigger className="w-72" data-testid="mic-trigger">
              <MicSelectorValue />
            </MicSelectorTrigger>
            <MicSelectorContent>
              <MicSelectorInput />
              <MicSelectorList>
                {(devices) =>
                  devices.length === 0 ? (
                    <MicSelectorEmpty />
                  ) : (
                    devices.map((device) => (
                      <MicSelectorItem
                        key={device.deviceId}
                        keywords={[device.label]}
                        value={device.deviceId}
                      >
                        <MicSelectorLabel device={device} />
                      </MicSelectorItem>
                    ))
                  )
                }
              </MicSelectorList>
            </MicSelectorContent>
          </MicSelector>
        </section>

        <section className={panel} aria-labelledby="voice-selector">
          <h2 id="voice-selector" className="text-label font-medium">VoiceSelector</h2>
          <p className="text-control text-fg-muted">
            A dialog of voices. The host decides what a preview does; here it only marks the row playing.
          </p>
          <div className="flex items-center gap-3">
            <VoiceSelector onValueChange={setVoice} value={voice}>
              <VoiceSelectorTrigger className="rounded-control border border-border px-3 py-1.5 text-control" data-testid="voice-trigger">
                {VOICES.find((v) => v.id === voice)?.name ?? 'Choose a voice'}
              </VoiceSelectorTrigger>
              <VoiceSelectorContent title="Choose a voice">
                <VoiceRows onPreview={(id) => setPreviewing((current) => (current === id ? undefined : id))} previewing={previewing} />
              </VoiceSelectorContent>
            </VoiceSelector>
            <output className="text-control text-fg-secondary" data-testid="voice-value">{voice ?? 'none'}</output>
          </div>
        </section>

        <section className={panel} aria-labelledby="transcription">
          <h2 id="transcription" className="text-label font-medium">Transcription</h2>
          <p className="text-control text-fg-muted">
            The host owns the clock: the slider stands in for a player's time updates, and a click seeks it.
          </p>
          <label className="flex items-center gap-3 text-control">
            <span>Time</span>
            <input
              aria-label="Playback time"
              data-testid="time"
              max={4}
              min={0}
              onChange={(event) => setTime(Number(event.target.value))}
              step={0.1}
              type="range"
              value={time}
            />
            <output data-testid="time-value">{time.toFixed(1)}s</output>
          </label>
          <Transcription currentTime={time} onSeek={setTime} segments={SEGMENTS}>
            {(segment, index) => <TranscriptionSegment index={index} key={segment.startSecond} segment={segment} />}
          </Transcription>
        </section>

        <AudioSection panelClassName={panel} />

        <section className={panel} aria-labelledby="error-log">
          <h2 id="error-log" className="text-label font-medium">onError log</h2>
          <ul className="text-control text-fg-secondary" data-testid="errors">
            {errors.length === 0 ? <li>No errors.</li> : errors.map((line, index) => <li key={index}>{line}</li>)}
          </ul>
        </section>
      </main>
    </div>
  )
}
