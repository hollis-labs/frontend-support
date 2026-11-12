import { useRef, useState } from 'react'
import {
  AudioPlayer,
  AudioPlayerControlBar,
  AudioPlayerDurationDisplay,
  AudioPlayerElement,
  AudioPlayerMuteButton,
  AudioPlayerPlayButton,
  AudioPlayerSeekBackwardButton,
  AudioPlayerSeekForwardButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
  AudioPlayerVolumeRange,
} from '../src/audio-player'
import { Transcription, TranscriptionSegment } from '../src'
import type { TranscriptionSegmentData } from '../src'

const SEGMENTS: TranscriptionSegmentData[] = [
  { text: 'A', startSecond: 0, endSecond: 0.5 },
  { text: 'rising', startSecond: 0.5, endSecond: 1.2 },
  { text: 'tone,', startSecond: 1.2, endSecond: 2 },
  { text: 'generated', startSecond: 2, endSecond: 3 },
  { text: 'in the page.', startSecond: 3, endSecond: 4 },
]

/** A mono 16-bit PCM WAV of a rising tone, built in the browser so the fixture needs no asset file. */
function toneWav(seconds: number, sampleRate = 22050): Blob {
  const samples = seconds * sampleRate
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples * 2, true)
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate
    const frequency = 330 + 110 * t
    view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * frequency * t) * 0.2 * 32767, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

// The host owns the audio: a Blob here, a URL (`src`) in most apps. kit-voice only plays it.
export function AudioSection({ panelClassName }: { panelClassName: string }) {
  const [blob] = useState(() => toneWav(4))
  const audio = useRef<HTMLAudioElement>(null)
  const [time, setTime] = useState(0)
  return (
    <section aria-labelledby="audio-player" className={panelClassName}>
      <h2 className="text-label font-medium" id="audio-player">AudioPlayer</h2>
      <p className="text-control text-fg-muted">
        Built on media-chrome (an optional peer, behind the <code>/audio-player</code> subpath). This
        plays a four-second tone generated in the page, through a Blob; the words under it follow the audio and click to seek it.
      </p>
      <AudioPlayer data-testid="player">
        <AudioPlayerElement
          blob={blob}
          data-testid="audio"
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          ref={audio}
        />
        <AudioPlayerControlBar>
          <AudioPlayerPlayButton />
          <AudioPlayerSeekBackwardButton seekOffset={1} />
          <AudioPlayerSeekForwardButton seekOffset={1} />
          <AudioPlayerTimeDisplay />
          <AudioPlayerTimeRange />
          <AudioPlayerDurationDisplay />
          <AudioPlayerMuteButton />
          <AudioPlayerVolumeRange />
        </AudioPlayerControlBar>
      </AudioPlayer>
      <div data-testid="paired-transcription">
        <Transcription
          currentTime={time}
          onSeek={(seconds) => {
            if (audio.current) audio.current.currentTime = seconds
          }}
          segments={SEGMENTS}
        >
          {(segment, index) => <TranscriptionSegment index={index} key={segment.startSecond} segment={segment} />}
        </Transcription>
      </div>
    </section>
  )
}
