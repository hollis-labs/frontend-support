import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Transcription, TranscriptionSegment } from '../transcription'
import type { TranscriptionSegmentData } from '../transcription'

const SEGMENTS: TranscriptionSegmentData[] = [
  { text: 'Hello', startSecond: 0, endSecond: 1 },
  { text: 'brave', startSecond: 1, endSecond: 3 },
  { text: '   ', startSecond: 3, endSecond: 3.5 },
  { text: 'world', startSecond: 3.5, endSecond: 4 },
]

function Words(props: Omit<React.ComponentProps<typeof Transcription>, 'segments' | 'children'>) {
  return (
    <Transcription segments={SEGMENTS} {...props}>
      {(segment, index) => <TranscriptionSegment index={index} key={segment.startSecond} segment={segment} />}
    </Transcription>
  )
}

const word = (text: string) => screen.getByText(text)

afterEach(cleanup)

describe('Transcription', () => {
  it('renders each segment through the render prop and skips blank ones', () => {
    const { container } = render(<Words />)
    const texts = [...container.querySelectorAll('[data-slot="transcription-segment"]')].map((el) => el.textContent)
    expect(texts).toEqual(['Hello', 'brave', 'world'])
  })

  it('marks the segment the controlled time is inside, and the ones before it', () => {
    const { rerender } = render(<Words currentTime={2} />)
    expect(word('Hello').getAttribute('data-active')).toBe('false')
    expect(word('Hello').classList.contains('text-muted-foreground')).toBe(true) // past
    expect(word('brave').getAttribute('data-active')).toBe('true')
    expect(word('brave').classList.contains('text-primary')).toBe(true)
    expect(word('world').classList.contains('text-muted-foreground/60')).toBe(true) // not reached yet

    rerender(<Words currentTime={3.6} />)
    expect(word('brave').getAttribute('data-active')).toBe('false')
    expect(word('world').getAttribute('data-active')).toBe('true')
  })

  it('treats a segment as ending exclusively', () => {
    render(<Words currentTime={1} />)
    expect(word('Hello').getAttribute('data-active')).toBe('false')
    expect(word('brave').getAttribute('data-active')).toBe('true')
  })

  it('asks the host to seek to the segment start, every time, in controlled mode', () => {
    const onSeek = vi.fn()
    render(<Words currentTime={1} onSeek={onSeek} />)

    // currentTime already equals the start of "brave": a second click must still seek.
    fireEvent.click(word('brave'))
    fireEvent.click(word('brave'))
    fireEvent.click(word('world'))

    expect(onSeek.mock.calls).toEqual([[1], [1], [3.5]])
    // Controlled: clicking does not move it; the host does.
    expect(word('brave').getAttribute('data-active')).toBe('true')
  })

  it('follows the clicked segment when uncontrolled (upstream never advanced)', () => {
    const onSeek = vi.fn()
    render(<Words onSeek={onSeek} />)
    expect(word('Hello').getAttribute('data-active')).toBe('true') // time starts at 0

    fireEvent.click(word('world'))

    expect(onSeek).toHaveBeenCalledWith(3.5)
    expect(word('world').getAttribute('data-active')).toBe('true')
    expect(word('Hello').getAttribute('data-active')).toBe('false')
  })

  it('renders plain text, not buttons, when nothing can be done with a click', () => {
    const { container } = render(<Words currentTime={0} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(container.querySelectorAll('span[data-slot="transcription-segment"]')).toHaveLength(3)
  })

  it('renders buttons when the host handles clicks itself, and still runs its onClick', () => {
    const onClick = vi.fn()
    render(
      <Transcription segments={SEGMENTS}>
        {(segment, index) => (
          <TranscriptionSegment index={index} key={segment.startSecond} onClick={onClick} segment={segment} />
        )}
      </Transcription>
    )
    expect(screen.getAllByRole('button')).toHaveLength(3)
    fireEvent.click(word('brave'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('runs a segment onClick after seeking', () => {
    const order: string[] = []
    render(
      <Transcription onSeek={() => order.push('seek')} segments={SEGMENTS}>
        {(segment, index) => (
          <TranscriptionSegment index={index} key={segment.startSecond} onClick={() => order.push('click')} segment={segment} />
        )}
      </Transcription>
    )
    fireEvent.click(word('Hello'))
    expect(order).toEqual(['seek', 'click'])
  })

  it('passes the index into the filtered list to the render prop and data-index', () => {
    render(<Words />)
    expect(word('world').getAttribute('data-index')).toBe('2')
  })

  it('refuses a segment outside Transcription', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TranscriptionSegment index={0} segment={SEGMENTS[0]} />)).toThrow(
      'Transcription components must be used within Transcription'
    )
  })
})
