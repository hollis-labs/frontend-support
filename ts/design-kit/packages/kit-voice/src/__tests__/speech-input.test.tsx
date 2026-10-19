import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpeechInput } from '../speech-input'
import {
  FakeMediaRecorder,
  FakeSpeechRecognition,
  fakeStream,
  installMediaDevices,
  setSecureContext,
  setSpeechGlobals,
} from './fakes'

const button = () => screen.getByRole('button', { name: 'Voice input' }) as HTMLButtonElement
const recognizer = () => FakeSpeechRecognition.instances[0]

describe('SpeechInput with Web Speech', () => {
  const restores: Array<() => void> = []
  const arrange = (secure = true) => {
    restores.push(setSecureContext(secure))
    restores.push(setSpeechGlobals({ SpeechRecognition: FakeSpeechRecognition }))
  }
  afterEach(() => {
    cleanup()
    while (restores.length) restores.pop()?.()
  })

  it('starts recognition with the language on click and shows the listening state from the recognizer', () => {
    arrange()
    render(<SpeechInput lang="de-DE" />)

    expect(button().disabled).toBe(false)
    expect(button().getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(button())
    expect(recognizer().start).toHaveBeenCalledTimes(1)
    expect(recognizer().lang).toBe('de-DE')
    expect(recognizer().continuous).toBe(true)
    // Pressed follows the recognizer's own `start` event, not the click.
    expect(button().getAttribute('aria-pressed')).toBe('false')

    act(() => recognizer().emitStart())
    expect(button().getAttribute('aria-pressed')).toBe('true')
    // Exact class tokens: the Button variant also carries `[a]:hover:bg-primary/80`.
    expect(button().classList.contains('bg-danger')).toBe(true)
    expect(button().classList.contains('bg-primary')).toBe(false)

    fireEvent.click(button())
    expect(recognizer().stop).toHaveBeenCalledTimes(1)
    act(() => recognizer().emitEnd())
    expect(button().getAttribute('aria-pressed')).toBe('false')
  })

  it('reports only final transcript text, from the new results onward', () => {
    arrange()
    const onTranscriptionChange = vi.fn()
    render(<SpeechInput onTranscriptionChange={onTranscriptionChange} />)
    fireEvent.click(button())

    act(() => recognizer().emitResult([{ transcript: 'hel', isFinal: false }]))
    expect(onTranscriptionChange).not.toHaveBeenCalled()

    act(() => recognizer().emitResult([{ transcript: 'hello ', isFinal: true }]))
    // The list is cumulative; resultIndex says where the new part starts.
    act(() =>
      recognizer().emitResult(
        [
          { transcript: 'hello ', isFinal: true },
          { transcript: 'world', isFinal: true },
        ],
        1
      )
    )

    expect(onTranscriptionChange.mock.calls).toEqual([['hello '], ['world']])
  })

  it('uses the latest onTranscriptionChange without recreating the recognizer', () => {
    arrange()
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<SpeechInput onTranscriptionChange={first} />)
    fireEvent.click(button())
    rerender(<SpeechInput onTranscriptionChange={second} />)

    act(() => recognizer().emitResult([{ transcript: 'x', isFinal: true }]))

    expect(FakeSpeechRecognition.instances).toHaveLength(1)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('x')
  })

  it('maps recognizer errors to onError codes and ignores its own abort', () => {
    arrange()
    const onError = vi.fn()
    render(<SpeechInput onError={onError} />)
    fireEvent.click(button())

    act(() => recognizer().emitError('not-allowed'))
    act(() => recognizer().emitError('audio-capture'))
    act(() => recognizer().emitError('network'))
    act(() => recognizer().emitError('aborted'))

    expect(onError.mock.calls.map(([error]) => error.code)).toEqual([
      'permission-denied',
      'no-audio-input',
      'recognition-error',
    ])
    expect(onError.mock.calls[0][0].message).toContain('not-allowed')
  })

  it('does not report an InvalidStateError from start() on a recognizer that is already running', () => {
    arrange()
    const onError = vi.fn()
    render(<SpeechInput onError={onError} />)
    // Constructed lazily on the first click, so make the first start() throw.
    const click = () => fireEvent.click(button())
    click()
    recognizer().start.mockImplementationOnce(() => {
      throw new DOMException('already started', 'InvalidStateError')
    })
    click()
    expect(onError).not.toHaveBeenCalled()
  })

  it('lets a host onClick call preventDefault() to cancel the toggle', () => {
    arrange()
    render(<SpeechInput onClick={(event) => event.preventDefault()} />)
    fireEvent.click(button())
    expect(FakeSpeechRecognition.instances).toHaveLength(0)
  })

  it('aborts the recognizer on unmount', () => {
    arrange()
    const { unmount } = render(<SpeechInput />)
    fireEvent.click(button())
    const instance = recognizer()
    unmount()
    expect(instance.abort).toHaveBeenCalledTimes(1)
  })

  it('is disabled outside a secure context and says why', () => {
    arrange(false)
    render(<SpeechInput />)
    expect(button().disabled).toBe(true)
    expect(button().getAttribute('data-unavailable')).toBe('insecure-context')
    fireEvent.click(button())
    expect(FakeSpeechRecognition.instances).toHaveLength(0)
  })

  it('stays disabled when the host disables it', () => {
    arrange()
    render(<SpeechInput disabled />)
    expect(button().disabled).toBe(true)
    expect(button().hasAttribute('data-unavailable')).toBe(false)
  })
})

describe('SpeechInput without Web Speech', () => {
  const restores: Array<() => void> = []
  afterEach(() => {
    cleanup()
    FakeMediaRecorder.mimeType = 'audio/mp4'
    FakeMediaRecorder.chunk = 'audio-bytes'
    while (restores.length) restores.pop()?.()
  })
  const arrange = (options: { recorder?: boolean; getUserMedia?: () => Promise<MediaStream> } = {}) => {
    restores.push(setSecureContext(true))
    restores.push(setSpeechGlobals({ MediaRecorder: options.recorder === false ? undefined : FakeMediaRecorder }))
    const media = installMediaDevices({ getUserMedia: options.getUserMedia })
    restores.push(media.restore)
    return media
  }
  const recorder = () => FakeMediaRecorder.instances[0]

  it('is unsupported when there is neither Web Speech nor MediaRecorder', () => {
    arrange({ recorder: false })
    render(<SpeechInput onAudioRecorded={async () => ''} />)
    expect(button().disabled).toBe(true)
    expect(button().getAttribute('data-unavailable')).toBe('unsupported')
  })

  it('is disabled, with the reason, until the host supplies onAudioRecorded', () => {
    arrange()
    const { rerender } = render(<SpeechInput />)
    expect(button().disabled).toBe(true)
    expect(button().getAttribute('data-unavailable')).toBe('media-recorder-needs-onAudioRecorded')

    rerender(<SpeechInput onAudioRecorded={async () => ''} />)
    expect(button().disabled).toBe(false)
    expect(button().getAttribute('data-availability')).toBe('media-recorder')
  })

  it("records, then hands the host a Blob typed with the recorder's own mimeType", async () => {
    const media = arrange()
    const onAudioRecorded = vi.fn(async () => 'spoken words')
    const onTranscriptionChange = vi.fn()
    render(<SpeechInput onAudioRecorded={onAudioRecorded} onTranscriptionChange={onTranscriptionChange} />)

    fireEvent.click(button())
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('true'))
    expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(recorder().start).toHaveBeenCalledTimes(1)

    fireEvent.click(button())
    await waitFor(() => expect(onTranscriptionChange).toHaveBeenCalledWith('spoken words'))

    const blob = (onAudioRecorded.mock.calls[0] as unknown as [Blob])[0]
    expect(blob.type).toBe('audio/mp4') // Safari records mp4; upstream hardcoded audio/webm
    expect(blob.size).toBeGreaterThan(0)
    expect(recorder().stream.getTracks()[0].stop).toHaveBeenCalled()
    await waitFor(() => expect(button().disabled).toBe(false))
  })

  it('shows a busy state while the host transcribes, then recovers', async () => {
    arrange()
    let finish: (text: string) => void = () => {}
    const onAudioRecorded = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)))
    render(<SpeechInput onAudioRecorded={onAudioRecorded} />)

    fireEvent.click(button())
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('true'))
    fireEvent.click(button())

    await waitFor(() => expect(button().disabled).toBe(true))
    expect(button().getAttribute('aria-busy')).toBe('true')

    await act(async () => finish('done'))
    await waitFor(() => expect(button().disabled).toBe(false))
    expect(button().hasAttribute('aria-busy')).toBe(false)
  })

  it('reports a rejected onAudioRecorded as transcription-failed and stays usable', async () => {
    arrange()
    const onError = vi.fn()
    const failure = new Error('stt is down')
    render(<SpeechInput onAudioRecorded={async () => Promise.reject(failure)} onError={onError} />)

    fireEvent.click(button())
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('true'))
    fireEvent.click(button())

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(onError.mock.calls[0][0]).toEqual({ cause: failure, code: 'transcription-failed', message: 'stt is down' })
    await waitFor(() => expect(button().disabled).toBe(false))
  })

  it('reports a denied microphone once, and does not try again by itself', async () => {
    const media = arrange({
      getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
    })
    const onError = vi.fn()
    render(<SpeechInput onAudioRecorded={async () => ''} onError={onError} />)

    fireEvent.click(button())
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(onError.mock.calls[0][0].code).toBe('permission-denied')
    expect(media.getUserMedia).toHaveBeenCalledTimes(1)
    expect(FakeMediaRecorder.instances).toHaveLength(0)
    expect(button().getAttribute('aria-pressed')).toBe('false')
  })

  it('maps a missing input device to no-audio-input', async () => {
    arrange({ getUserMedia: () => Promise.reject(new DOMException('none', 'NotFoundError')) })
    const onError = vi.fn()
    render(<SpeechInput onAudioRecorded={async () => ''} onError={onError} />)
    fireEvent.click(button())
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0].code).toBe('no-audio-input')
  })

  it('does not open two streams on a double click while the first is still pending', async () => {
    let grant: (stream: MediaStream) => void = () => {}
    const media = arrange({ getUserMedia: () => new Promise<MediaStream>((resolve) => (grant = resolve)) })
    render(<SpeechInput onAudioRecorded={async () => ''} />)

    fireEvent.click(button())
    fireEvent.click(button())
    expect(media.getUserMedia).toHaveBeenCalledTimes(1)

    await act(async () => grant(fakeStream()))
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('true'))
  })

  it('releases the microphone and sends nothing when unmounted mid-recording', async () => {
    arrange()
    const onAudioRecorded = vi.fn(async () => 'late')
    const { unmount } = render(<SpeechInput onAudioRecorded={onAudioRecorded} />)
    fireEvent.click(button())
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('true'))
    const track = recorder().stream.getTracks()[0]

    unmount()

    expect(track.stop).toHaveBeenCalled()
    expect(onAudioRecorded).not.toHaveBeenCalled()
  })

  it('releases a stream that was granted after the component unmounted', async () => {
    let grant: (stream: MediaStream) => void = () => {}
    arrange({ getUserMedia: () => new Promise<MediaStream>((resolve) => (grant = resolve)) })
    const { unmount } = render(<SpeechInput onAudioRecorded={async () => ''} />)
    fireEvent.click(button())
    unmount()

    const stream = fakeStream()
    await act(async () => grant(stream))

    expect(stream.tracks[0].stop).toHaveBeenCalled()
    expect(FakeMediaRecorder.instances).toHaveLength(0)
  })

  it('hands over nothing when the recording is empty', async () => {
    arrange()
    FakeMediaRecorder.chunk = ''
    const onAudioRecorded = vi.fn(async () => 'x')
    render(<SpeechInput onAudioRecorded={onAudioRecorded} />)
    fireEvent.click(button())
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('true'))
    fireEvent.click(button())
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('false'))
    expect(onAudioRecorded).not.toHaveBeenCalled()
  })
})
