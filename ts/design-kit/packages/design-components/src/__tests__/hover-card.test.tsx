import { createRef } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../components/ui/hover-card'

// Popup positioning, hover transfer, Escape and themed rendering are tested in
// demo/scripts/hover-card-proof.mjs in Chromium, where layout actually exists.
describe('HoverCard', () => {
  it('leaves visibility with the controlled host and reports hover requests', async () => {
    const onOpenChange = vi.fn()
    render(<HoverCard open={false} onOpenChange={onOpenChange}><HoverCardTrigger href="#destination" delay={0}>Destination</HoverCardTrigger><HoverCardContent>Preview</HoverCardContent></HoverCard>)
    fireEvent.mouseEnter(screen.getByRole('link'))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalled())
    expect(onOpenChange.mock.calls[0][0]).toBe(true)
    expect(onOpenChange.mock.calls[0][1].reason).toBe('trigger-hover')
    expect(screen.queryByText('Preview')).toBeNull()
  })

  it('supports uncontrolled trigger state without adding a button or changing its URL', async () => {
    render(<HoverCard><HoverCardTrigger href="#destination" delay={0} closeDelay={0}>Destination</HoverCardTrigger></HoverCard>)
    const trigger = screen.getByRole('link', { name: 'Destination' })
    fireEvent.mouseEnter(trigger)
    await waitFor(() => expect(trigger.hasAttribute('data-popup-open')).toBe(true))
    expect(trigger.getAttribute('href')).toBe('#destination')
    expect(screen.queryByRole('button')).toBeNull()
    fireEvent.mouseLeave(trigger)
    await waitFor(() => expect(trigger.hasAttribute('data-popup-open')).toBe(false))
  })

  it('composes trigger render props, refs and handlers', () => {
    const ref = createRef<HTMLAnchorElement>()
    const rendered = vi.fn()
    const wrapper = vi.fn()
    render(<HoverCard><HoverCardTrigger ref={ref} render={<a href="#destination" onClick={rendered} />} onClick={wrapper}>Destination</HoverCardTrigger></HoverCard>)
    expect(ref.current).toBe(screen.getByRole('link'))
    fireEvent.click(screen.getByRole('link'))
    expect(rendered).toHaveBeenCalledTimes(1)
    expect(wrapper).toHaveBeenCalledTimes(1)
  })
})
