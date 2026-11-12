import { cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
} from '../audio-player'

// media-chrome's custom elements are not registered under jsdom, so these tests cover what this
// package owns: the structure, the classes and attributes it puts on them, the Blob lifecycle.
// Playback, seeking and the real controls are in docs/evidence/verify-browser.mjs.

const slot = (container: HTMLElement, name: string) => container.querySelector(`[data-slot="${name}"]`) as HTMLElement

afterEach(cleanup)

describe('AudioPlayer structure', () => {
  it('is a media controller with its custom properties on the contract variables', () => {
    const { container } = render(<AudioPlayer style={{ color: 'red' }} />)
    const controller = slot(container, 'audio-player')

    expect(controller.tagName.toLowerCase()).toBe('media-controller')
    // The `audio` flag is a property the upgraded element reflects; that is checked in a real browser.
    expect(controller.style.getPropertyValue('--media-font-size')).toBe('var(--text-caption)')
    expect(controller.style.getPropertyValue('--media-tooltip-border-radius')).toBe('var(--radius-control)')
    expect(controller.style.getPropertyValue('--media-range-bar-color')).toBe('var(--color-primary)')
    expect(controller.style.getPropertyValue('--media-button-icon-width')).toBe('calc(var(--spacing) * 4)')
    // A unitless 0 is invalid inside media-chrome's calc(); it collapsed the time range to zero height.
    expect(controller.style.getPropertyValue('--media-control-padding')).toBe('0px')
    expect(controller.style.color).toBe('red') // host style merges, it does not replace
  })

  it('lets the host override a media custom property', () => {
    const { container } = render(<AudioPlayer style={{ '--media-primary-color': 'hotpink' } as React.CSSProperties} />)
    expect(slot(container, 'audio-player').style.getPropertyValue('--media-primary-color')).toBe('hotpink')
  })

  it('wraps the controls in a horizontal button group inside the control bar', () => {
    const { container } = render(
      <AudioPlayerControlBar>
        <AudioPlayerPlayButton />
        <AudioPlayerMuteButton />
      </AudioPlayerControlBar>
    )
    const bar = slot(container, 'audio-player-control-bar')
    const group = bar.firstElementChild as HTMLElement
    expect(bar.tagName.toLowerCase()).toBe('media-control-bar')
    expect(group.getAttribute('role')).toBe('group')
    expect(group.getAttribute('data-orientation')).toBe('horizontal')
    expect(group.children).toHaveLength(2)
  })
})

describe('AudioPlayer controls', () => {
  it('puts the outline icon-button classes straight on the media elements', () => {
    const { container } = render(
      <>
        <AudioPlayerPlayButton />
        <AudioPlayerSeekBackwardButton />
        <AudioPlayerSeekForwardButton />
      </>
    )
    for (const name of ['audio-player-play-button', 'audio-player-seek-backward-button', 'audio-player-seek-forward-button']) {
      const element = slot(container, name)
      expect(element.tagName.toLowerCase().startsWith('media-')).toBe(true)
      expect(element.classList.contains('size-7')).toBe(true) // icon-sm
      expect(element.classList.contains('border-border')).toBe(true) // outline
      // Not a Base UI Button: it would add a role, a tabindex and a key handler of its own.
      expect(element.hasAttribute('role')).toBe(false)
      expect(element.hasAttribute('tabindex')).toBe(false)
    }
  })

  it('makes the play button transparent and keeps the seek buttons filled, as upstream does', () => {
    const { container } = render(
      <>
        <AudioPlayerPlayButton />
        <AudioPlayerSeekForwardButton />
      </>
    )
    expect(slot(container, 'audio-player-play-button').classList.contains('bg-transparent')).toBe(true)
    expect(slot(container, 'audio-player-play-button').classList.contains('bg-background')).toBe(false)
    expect(slot(container, 'audio-player-seek-forward-button').classList.contains('bg-background')).toBe(true)
  })

  it('seeks ten seconds by default and takes another offset and a host class', () => {
    const { container } = render(
      <>
        <AudioPlayerSeekBackwardButton />
        <AudioPlayerSeekForwardButton className="extra" seekOffset={30} />
      </>
    )
    expect(slot(container, 'audio-player-seek-backward-button').getAttribute('seekoffset')).toBe('10')
    expect(slot(container, 'audio-player-seek-forward-button').getAttribute('seekoffset')).toBe('30')
    expect(slot(container, 'audio-player-seek-forward-button').classList.contains('extra')).toBe(true)
  })

  it('dresses the text and range controls as transparent button-group text, keeping their own slot name', () => {
    const { container } = render(
      <>
        <AudioPlayerTimeDisplay />
        <AudioPlayerTimeRange />
        <AudioPlayerDurationDisplay />
        <AudioPlayerMuteButton />
        <AudioPlayerVolumeRange />
      </>
    )
    const names = [
      'audio-player-time-display',
      'audio-player-time-range',
      'audio-player-duration-display',
      'audio-player-mute-button',
      'audio-player-volume-range',
    ]
    for (const name of names) {
      const element = slot(container, name)
      expect(element.tagName.toLowerCase().startsWith('media-')).toBe(true)
      expect(element.classList.contains('rounded-control')).toBe(true) // ButtonGroupText
      expect(element.classList.contains('bg-transparent')).toBe(true)
      expect(element.classList.contains('bg-muted')).toBe(false)
    }
    expect(slot(container, 'audio-player-time-range').classList.contains('min-w-40')).toBe(true) // a seek bar you can hit
    expect(slot(container, 'audio-player-time-display').classList.contains('tabular-nums')).toBe(true)
    expect(slot(container, 'audio-player-duration-display').classList.contains('tabular-nums')).toBe(true)
  })

  it('lets the host widen the time range', () => {
    const { container } = render(<AudioPlayerTimeRange className="min-w-64" />)
    const range = slot(container, 'audio-player-time-range')
    expect(range.classList.contains('min-w-64')).toBe(true)
    expect(range.classList.contains('min-w-40')).toBe(false)
  })

  it('passes props through to the media element', () => {
    const { container } = render(<AudioPlayerTimeDisplay showDuration />)
    expect(slot(container, 'audio-player-time-display').hasAttribute('showduration')).toBe(true)
  })
})

describe('AudioPlayerElement', () => {
  let created: string[]
  let revoked: string[]
  beforeEach(() => {
    created = []
    revoked = []
    let counter = 0
    URL.createObjectURL = vi.fn(() => {
      counter += 1
      const url = `blob:test/${counter}`
      created.push(url)
      return url
    })
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url)
    })
  })

  it('plays a URL from src, in the media slot', () => {
    const { container } = render(<AudioPlayerElement src="/speech.mp3" />)
    const audio = slot(container, 'audio-player-element') as HTMLAudioElement
    expect(audio.tagName).toBe('AUDIO')
    expect(audio.getAttribute('src')).toBe('/speech.mp3')
    expect(audio.getAttribute('slot')).toBe('media')
    expect(created).toHaveLength(0)
  })

  it('plays a Blob through an object URL set on the element, with no stray attribute', () => {
    const blob = new Blob(['x'], { type: 'audio/wav' })
    const { container } = render(<AudioPlayerElement blob={blob} />)
    const audio = slot(container, 'audio-player-element') as HTMLAudioElement

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(audio.getAttribute('src')).toBe('blob:test/1')
    // Upstream spread its `data` prop onto the DOM node; nothing like that may reach it.
    expect(audio.hasAttribute('blob')).toBe(false)
    expect(audio.hasAttribute('data')).toBe(false)
  })

  it('revokes the object URL on unmount', () => {
    const { unmount } = render(<AudioPlayerElement blob={new Blob(['x'])} />)
    expect(revoked).toEqual([])
    unmount()
    expect(revoked).toEqual(['blob:test/1'])
  })

  it('replaces the object URL when the Blob changes, and revokes the old one', () => {
    const first = new Blob(['a'])
    const second = new Blob(['b'])
    const { container, rerender } = render(<AudioPlayerElement blob={first} />)
    rerender(<AudioPlayerElement blob={second} />)

    expect(created).toEqual(['blob:test/1', 'blob:test/2'])
    expect(revoked).toEqual(['blob:test/1'])
    expect((slot(container, 'audio-player-element') as HTMLAudioElement).getAttribute('src')).toBe('blob:test/2')
  })

  it('does not create a URL again for the same Blob across re-renders', () => {
    const blob = new Blob(['a'])
    const { rerender } = render(<AudioPlayerElement blob={blob} />)
    rerender(<AudioPlayerElement blob={blob} controls />)
    expect(created).toHaveLength(1)
  })

  it('creates and revokes nothing when given a src', () => {
    const { unmount } = render(<AudioPlayerElement src="/a.mp3" />)
    unmount()
    expect(created).toHaveLength(0)
    expect(revoked).toHaveLength(0)
  })

  it('forwards a ref to the audio element, as an object and as a callback', () => {
    const object = createRef<HTMLAudioElement>()
    const callback = vi.fn()
    render(
      <>
        <AudioPlayerElement ref={object} src="/a.mp3" />
        <AudioPlayerElement ref={callback} src="/b.mp3" />
      </>
    )
    expect(object.current?.tagName).toBe('AUDIO')
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ tagName: 'AUDIO' }))
  })

  it('passes native audio props through', () => {
    const { container } = render(<AudioPlayerElement preload="none" src="/a.mp3" />)
    expect((slot(container, 'audio-player-element') as HTMLAudioElement).getAttribute('preload')).toBe('none')
  })
})
