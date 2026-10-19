import { vi } from 'vitest'

/**
 * Browser fakes for jsdom, which has none of mediaDevices, MediaRecorder or Web Speech.
 * They record what the component did; none of them touches a real device.
 */

export interface FakeTrack {
  stop: ReturnType<typeof vi.fn>
}

export function fakeStream(): MediaStream & { tracks: FakeTrack[] } {
  const tracks: FakeTrack[] = [{ stop: vi.fn() }]
  return { tracks, getTracks: () => tracks } as unknown as MediaStream & { tracks: FakeTrack[] }
}

export function fakeDevice(deviceId: string, label: string, kind: MediaDeviceKind = 'audioinput'): MediaDeviceInfo {
  return { deviceId, label, kind, groupId: `group-${deviceId}`, toJSON: () => ({}) } as MediaDeviceInfo
}

/** Installs a fake `navigator.mediaDevices`. Call `restore()` in afterEach. */
export function installMediaDevices(options: {
  devices?: MediaDeviceInfo[]
  getUserMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>
} = {}) {
  const target = new EventTarget()
  const getUserMedia = vi.fn(options.getUserMedia ?? (async () => fakeStream()))
  const enumerateDevices = vi.fn(async () => options.devices ?? [])
  const mediaDevices = {
    getUserMedia,
    enumerateDevices,
    addEventListener: vi.fn((type: string, listener: EventListener) => target.addEventListener(type, listener)),
    removeEventListener: vi.fn((type: string, listener: EventListener) => target.removeEventListener(type, listener)),
  }
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: mediaDevices })
  return {
    ...mediaDevices,
    emitDeviceChange: () => target.dispatchEvent(new Event('devicechange')),
    restore: () => {
      if (original) Object.defineProperty(navigator, 'mediaDevices', original)
      else Reflect.deleteProperty(navigator, 'mediaDevices')
    },
  }
}

export function removeMediaDevices() {
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
  return () => {
    if (original) Object.defineProperty(navigator, 'mediaDevices', original)
    else Reflect.deleteProperty(navigator, 'mediaDevices')
  }
}

export const settle = (ms = 60) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** `window.isSecureContext`, which jsdom does not provide. Returns a restore function. */
export function setSecureContext(value: boolean) {
  const original = Object.getOwnPropertyDescriptor(window, 'isSecureContext')
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value })
  return () => {
    if (original) Object.defineProperty(window, 'isSecureContext', original)
    else Reflect.deleteProperty(window, 'isSecureContext')
  }
}

interface FakeSegment {
  transcript: string
  isFinal: boolean
}

/** A Web Speech recognizer that does nothing until a test emits events on it. */
export class FakeSpeechRecognition extends EventTarget {
  static instances: FakeSpeechRecognition[] = []
  continuous = false
  interimResults = false
  lang = ''
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    super()
    FakeSpeechRecognition.instances.push(this)
  }

  emitStart() {
    this.dispatchEvent(new Event('start'))
  }

  emitEnd() {
    this.dispatchEvent(new Event('end'))
  }

  emitError(error: string) {
    this.dispatchEvent(Object.assign(new Event('error'), { error }))
  }

  /** `resultIndex` is where the new results start in the cumulative list, as in the spec. */
  emitResult(segments: FakeSegment[], resultIndex = 0) {
    const results = segments.map((segment) =>
      Object.assign([{ transcript: segment.transcript, confidence: 1 }], { isFinal: segment.isFinal })
    )
    this.dispatchEvent(Object.assign(new Event('result'), { resultIndex, results }))
  }
}

/** A MediaRecorder that records nothing real: stop() emits one chunk, then `stop`. */
export class FakeMediaRecorder extends EventTarget {
  static instances: FakeMediaRecorder[] = []
  static mimeType = 'audio/mp4'
  static chunk = 'audio-bytes'
  state: 'inactive' | 'recording' = 'inactive'
  mimeType = FakeMediaRecorder.mimeType
  start = vi.fn(() => {
    this.state = 'recording'
  })

  stream: MediaStream

  constructor(stream: MediaStream) {
    super()
    this.stream = stream
    FakeMediaRecorder.instances.push(this)
  }

  stop = vi.fn(() => {
    this.state = 'inactive'
    const data = new Blob(FakeMediaRecorder.chunk ? [FakeMediaRecorder.chunk] : [], { type: this.mimeType })
    this.dispatchEvent(Object.assign(new Event('dataavailable'), { data }))
    this.dispatchEvent(new Event('stop'))
  })
}

type SpeechGlobals = { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown; MediaRecorder?: unknown }

/** Sets or removes the three speech-related globals on `window`; returns a restore function. */
export function setSpeechGlobals(globals: SpeechGlobals) {
  const keys = ['SpeechRecognition', 'webkitSpeechRecognition', 'MediaRecorder'] as const
  const originals = keys.map((key) => [key, Object.getOwnPropertyDescriptor(window, key)] as const)
  for (const key of keys) {
    Reflect.deleteProperty(window, key)
    if (globals[key] !== undefined) {
      Object.defineProperty(window, key, { configurable: true, writable: true, value: globals[key] })
    }
  }
  FakeSpeechRecognition.instances = []
  FakeMediaRecorder.instances = []
  return () => {
    for (const [key, descriptor] of originals) {
      Reflect.deleteProperty(window, key)
      if (descriptor) Object.defineProperty(window, key, descriptor)
    }
  }
}

/** cmdk calls scrollIntoView and ResizeObserver, neither of which jsdom has. */
export function installCmdkStubs() {
  Element.prototype.scrollIntoView = vi.fn()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
