import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../components/ui/button'
import { ButtonGroup, ButtonGroupText, ButtonGroupSeparator } from '../components/ui/button-group'

describe('ButtonGroup', () => {
  it('labels a group without changing independent button actions', () => {
    const first = vi.fn()
    const second = vi.fn()
    render(<ButtonGroup aria-label="Playback"><Button onClick={first}>Play</Button><Button onClick={second}>Stop</Button></ButtonGroup>)
    expect(screen.getByRole('group', { name: 'Playback' }).getAttribute('data-orientation')).toBe('horizontal')
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('supports vertical groups, text composition, refs, and separators', () => {
    const ref = createRef<HTMLDivElement>()
    const elementClick = vi.fn()
    const wrapperClick = vi.fn()
    render(<ButtonGroup orientation="vertical" aria-label="Versions" ref={ref}>
      <ButtonGroupText render={<span onClick={elementClick} />} onClick={wrapperClick}>Current</ButtonGroupText>
      <ButtonGroupSeparator orientation="horizontal" />
      <Button>Previous</Button>
    </ButtonGroup>)
    expect(ref.current).toBe(screen.getByRole('group'))
    expect(ref.current?.getAttribute('data-orientation')).toBe('vertical')
    const text = screen.getByText('Current')
    expect(text.tagName).toBe('SPAN')
    expect(text.className).toContain('rounded-control')
    fireEvent.click(text)
    expect(elementClick).toHaveBeenCalledTimes(1)
    expect(wrapperClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('separator').getAttribute('aria-orientation')).toBe('horizontal')
  })
})
