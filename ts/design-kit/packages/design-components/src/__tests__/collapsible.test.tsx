import { createRef, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'

function Controlled() {
  const [open, setOpen] = useState(false)
  return <Collapsible open={open} onOpenChange={setOpen}>
    <CollapsibleTrigger>Details</CollapsibleTrigger>
    <CollapsibleContent>Expanded details</CollapsibleContent>
  </Collapsible>
}

describe('Collapsible', () => {
  it('opens and closes through host-controlled state with linked semantics', async () => {
    render(<Controlled />)
    const trigger = screen.getByRole('button', { name: 'Details' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Expanded details')).toBeNull()
    fireEvent.click(trigger)
    expect(await screen.findByText('Expanded details')).toBeTruthy()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toBe(screen.getByText('Expanded details'))
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.queryByText('Expanded details')).toBeNull())
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('requests a controlled change without overriding the host', () => {
    const onOpenChange = vi.fn()
    render(<Collapsible open={false} onOpenChange={onOpenChange}><CollapsibleTrigger>Show</CollapsibleTrigger><CollapsibleContent>Body</CollapsibleContent></Collapsible>)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpenChange.mock.calls[0][0]).toBe(true)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Body')).toBeNull()
  })

  it('supports uncontrolled initial state, render composition and refs', async () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Collapsible defaultOpen><CollapsibleTrigger ref={ref} render={<button type="button" />}>Toggle</CollapsibleTrigger><CollapsibleContent>Body</CollapsibleContent></Collapsible>)
    expect(ref.current).toBe(screen.getByRole('button'))
    expect(screen.getByText('Body')).toBeTruthy()
    fireEvent.click(ref.current!)
    await waitFor(() => expect(screen.queryByText('Body')).toBeNull())
  })

  it('ignores interaction when disabled', () => {
    const onOpenChange = vi.fn()
    render(<Collapsible disabled onOpenChange={onOpenChange}><CollapsibleTrigger>Disabled</CollapsibleTrigger><CollapsibleContent>Body</CollapsibleContent></Collapsible>)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.queryByText('Body')).toBeNull()
  })
})
