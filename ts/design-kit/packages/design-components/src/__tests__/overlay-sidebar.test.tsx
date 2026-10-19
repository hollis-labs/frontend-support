import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OverlaySidebar } from '../components/overlay-sidebar'

function Example() {
  const [open, setOpen] = useState(false)
  return <OverlaySidebar open={open} onOpenChange={setOpen} trigger={<button>Open navigation</button>} title="Navigation" description="Choose a view" header={<span>Workspace</span>} footer={<button>Profile</button>}><button>Sessions</button></OverlaySidebar>
}

describe('OverlaySidebar', () => {
  it('opens a named dialog with host header, body and footer', async () => {
    render(<Example />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeTruthy()
    expect(screen.getByText('Workspace')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sessions' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy()
  })

  it('closes through the host-controlled state and returns focus to its trigger', async () => {
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Open navigation' })
    fireEvent.click(trigger)
    await screen.findByRole('dialog', { name: 'Navigation' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
