import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MicSelector } from '../mic-selector'
import { fakeStream, installMediaDevices, settle } from './fakes'

describe('MicSelector permission prompt', () => {
  let restore: (() => void) | undefined
  afterEach(() => {
    cleanup() // unmount first: the hook's cleanup reads navigator.mediaDevices
    restore?.()
  })

  it('asks for the microphone once per open, not in a loop, when permission is denied', async () => {
    let calls = 0
    const media = installMediaDevices({
      // Denied every time. After 25 calls the mock stops answering so a runaway loop
      // ends the test with a count instead of hanging it.
      getUserMedia: () => {
        calls += 1
        return calls > 25
          ? new Promise<MediaStream>(() => {})
          : Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
      },
    })
    restore = media.restore
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<MicSelector open onOpenChange={() => {}} />)
    await act(async () => {
      await settle(150)
    })

    expect(media.getUserMedia).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------------
// Behaviour. cmdk calls scrollIntoView and ResizeObserver, which jsdom does not have.
// ---------------------------------------------------------------------------------

import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeAll } from 'vitest'
import { Command } from '@hollis-labs/design-components'
import {
  MicSelectorEmpty,
  MicSelectorInput,
  MicSelectorItem,
  MicSelectorLabel,
  MicSelectorList,
  MicSelectorTrigger,
  MicSelectorValue,
} from '../mic-selector'
import { useAudioDevices } from '../use-audio-devices'
import { fakeDevice, removeMediaDevices } from './fakes'

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const USB = fakeDevice('usb-1', 'USB Microphone (046d:0825)')
const BUILTIN = fakeDevice('built-in', 'Built-in Audio')
const SPEAKER = fakeDevice('spk', 'Speakers', 'audiooutput')

function Harness(props: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  value?: string
  onValueChange?: (value: string | undefined) => void
}) {
  return (
    <MicSelector {...props}>
      <MicSelectorTrigger>
        <MicSelectorValue />
      </MicSelectorTrigger>
      <Command>
        <MicSelectorInput />
        <MicSelectorList>
          {(devices) => (
            <>
              <MicSelectorEmpty />
              {devices.map((device) => (
                <MicSelectorItem key={device.deviceId} value={device.deviceId} keywords={[device.label]}>
                  <MicSelectorLabel device={device} />
                </MicSelectorItem>
              ))}
            </>
          )}
        </MicSelectorList>
      </Command>
    </MicSelector>
  )
}

describe('useAudioDevices', () => {
  let restore: (() => void) | undefined
  afterEach(() => {
    cleanup()
    restore?.()
  })

  it('lists audio inputs only, without prompting for the microphone', async () => {
    const media = installMediaDevices({ devices: [USB, SPEAKER, BUILTIN] })
    restore = media.restore
    const { result } = renderHook(() => useAudioDevices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.devices.map((d) => d.deviceId)).toEqual(['usb-1', 'built-in'])
    expect(result.current.hasPermission).toBe(false)
    expect(media.getUserMedia).not.toHaveBeenCalled()
  })

  it('reports a secure-context error instead of throwing when navigator.mediaDevices is missing', async () => {
    restore = removeMediaDevices()
    const { result } = renderHook(() => useAudioDevices())
    expect(result.current.error).toMatch(/secure context/i)
    expect(result.current.loading).toBe(false)
    await act(async () => {
      await result.current.loadDevices() // must not throw either
    })
    expect(result.current.devices).toEqual([])
  })

  it('releases the temporary stream after asking for permission and then lists labelled devices', async () => {
    const stream = fakeStream()
    const media = installMediaDevices({ devices: [USB], getUserMedia: async () => stream })
    restore = media.restore
    const { result } = renderHook(() => useAudioDevices())
    await act(async () => {
      await result.current.loadDevices()
    })
    expect(result.current.hasPermission).toBe(true)
    expect(stream.tracks[0].stop).toHaveBeenCalledTimes(1)
    expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it('does not stack a second permission request while one is pending', async () => {
    let release: (stream: MediaStream) => void = () => {}
    const media = installMediaDevices({ getUserMedia: () => new Promise<MediaStream>((r) => (release = r)) })
    restore = media.restore
    const { result } = renderHook(() => useAudioDevices())
    act(() => {
      void result.current.loadDevices()
      void result.current.loadDevices()
    })
    expect(media.getUserMedia).toHaveBeenCalledTimes(1)
    await act(async () => release(fakeStream()))
  })

  it('re-reads the device list when devices change, and removes its listener on unmount', async () => {
    const media = installMediaDevices({ devices: [USB] })
    restore = media.restore
    const { result, unmount } = renderHook(() => useAudioDevices())
    await waitFor(() => expect(result.current.devices).toHaveLength(1))
    media.enumerateDevices.mockResolvedValue([USB, BUILTIN])
    await act(async () => {
      media.emitDeviceChange()
    })
    await waitFor(() => expect(result.current.devices).toHaveLength(2))
    unmount()
    expect(media.removeEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function))
  })
})

// WHY THESE TESTS RENDER `Command` WHERE THE APP USES `MicSelectorContent`, AND WHAT COVERS THE REST.
// An open Base UI popup (Portal + Positioner + Popup) hangs the jsdom worker. Measured by bisecting
// with raw @base-ui/react/popover and no kit code: an open root with a trigger renders, a closed
// keepMounted popup renders, an open popup does not. So `Command` stands in for `MicSelectorContent`
// (which is only PopoverContent + Command wired to the context's value). The context, list, item,
// label, value and search are the real components. The real popover (opens on click, sized by
// --anchor-width, selection) is verified in headless Chromium; see the PR body.
describe('MicSelector', () => {
  let restore: (() => void) | undefined
  afterEach(() => {
    cleanup()
    restore?.()
  })

  it('asks for the microphone when opened and lists the labelled devices', async () => {
    const media = installMediaDevices({ devices: [USB, BUILTIN] })
    restore = media.restore
    render(<Harness open onOpenChange={() => {}} />)
    await screen.findByText('Built-in Audio')
    expect(media.getUserMedia).toHaveBeenCalledTimes(1)
    expect(screen.getByText('USB Microphone')).toBeTruthy()
  })

  it('splits a trailing (vendor:product) id out of the label', () => {
    render(<MicSelectorLabel device={USB} />)
    expect(screen.getByText('USB Microphone')).toBeTruthy()
    expect(screen.getByText('(046d:0825)')).toBeTruthy()
  })

  it('selects by deviceId, closes, and shows the chosen device in the value', async () => {
    restore = installMediaDevices({ devices: [USB, BUILTIN] }).restore
    const onValueChange = vi.fn()
    const onOpenChange = vi.fn()
    render(<Harness open onOpenChange={onOpenChange} onValueChange={onValueChange} />)
    fireEvent.click(await screen.findByText('Built-in Audio'))
    expect(onValueChange).toHaveBeenCalledWith('built-in')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows "Select microphone..." until the value matches a device, then its label', async () => {
    restore = installMediaDevices({ devices: [USB, BUILTIN] }).restore
    const { rerender } = render(<Harness open onOpenChange={() => {}} />)
    expect(screen.getAllByText('Select microphone...').length).toBeGreaterThan(0)
    rerender(<Harness open onOpenChange={() => {}} value="built-in" />)
    await waitFor(() => expect(screen.getAllByText('Built-in Audio').length).toBeGreaterThan(1))
  })

  it('searches by label when items pass the label as keywords', async () => {
    restore = installMediaDevices({ devices: [USB, BUILTIN] }).restore
    render(<Harness open onOpenChange={() => {}} />)
    await screen.findByText('Built-in Audio')
    fireEvent.change(screen.getByPlaceholderText('Search microphones...'), { target: { value: 'usb' } })
    await waitFor(() => expect(screen.queryByText('Built-in Audio')).toBeNull())
    expect(screen.getByText('USB Microphone')).toBeTruthy()
  })

  it('shows the empty state when no device matches', async () => {
    restore = installMediaDevices({ devices: [USB] }).restore
    render(<Harness open onOpenChange={() => {}} />)
    await screen.findByText('USB Microphone')
    fireEvent.change(screen.getByPlaceholderText('Search microphones...'), { target: { value: 'zzz' } })
    expect(await screen.findByText('No microphone found.')).toBeTruthy()
  })

  it('retries the permission prompt when the selector is closed and reopened, once each time', async () => {
    const media = installMediaDevices({ getUserMedia: () => Promise.reject(new DOMException('no', 'NotAllowedError')) })
    restore = media.restore
    const { rerender } = render(<Harness open onOpenChange={() => {}} />)
    await act(async () => {
      await settle(60)
    })
    expect(media.getUserMedia).toHaveBeenCalledTimes(1)
    rerender(<Harness open={false} onOpenChange={() => {}} />)
    rerender(<Harness open onOpenChange={() => {}} />)
    await act(async () => {
      await settle(60)
    })
    expect(media.getUserMedia).toHaveBeenCalledTimes(2)
  })
})
