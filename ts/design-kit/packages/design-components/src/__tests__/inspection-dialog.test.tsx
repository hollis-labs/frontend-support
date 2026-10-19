import { useRef, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InspectionDialog } from '../components/inspection-dialog'

function Example({ onKey = () => {}, onComposition = () => {} }: { onKey?: () => void; onComposition?: () => void }) {
  const [open, setOpen] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const origin = useRef<HTMLButtonElement>(null)
  return <><button ref={origin} onClick={() => setOpen(true)}>Inspect</button>
    <InspectionDialog open={open} onOpenChange={setOpen} title="Authored content" titleProps={{ ref: title, tabIndex: -1 }} initialFocus={title} finalFocus={origin}
      meta="Source metadata" navigation={<button>Next content</button>} navigationLabel="Content order" footer={<button onClick={() => setOpen(false)}>Done</button>}
      bodyProps={{ 'aria-label': 'Evidence scroll', tabIndex: 0 }} onKeyDown={onKey} onCompositionStartCapture={onComposition}>
      <p>Arbitrary body</p>
    </InspectionDialog></>
}

describe('InspectionDialog', () => {
  it('renders host slots and uses host purpose focus, controlled dismissal and return', async () => {
    render(<Example />)
    const origin = screen.getByText('Inspect')
    fireEvent.click(origin)
    const popup = await screen.findByRole('dialog', { name: 'Authored content' })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Authored content' })))
    expect(popup.contains(screen.getByText('Source metadata'))).toBe(true)
    expect(screen.getByRole('navigation', { name: 'Content order' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Evidence scroll' }).contains(screen.getByText('Arbitrary body'))).toBe(true)
    fireEvent.click(screen.getByText('Done'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(origin))
  })

  it('forwards keyboard and composition through arbitrary body descendants', async () => {
    const key = vi.fn(), composition = vi.fn()
    render(<Example onKey={key} onComposition={composition} />)
    fireEvent.click(screen.getByText('Inspect'))
    const body = await screen.findByText('Arbitrary body')
    fireEvent.keyDown(body, { key: 'ArrowRight' })
    fireEvent.compositionStart(body)
    expect(key).toHaveBeenCalledOnce()
    expect(composition).toHaveBeenCalledOnce()
  })
})
