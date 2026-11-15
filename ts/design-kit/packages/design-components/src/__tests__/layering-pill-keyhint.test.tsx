import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useRegisterOpenDialog } from '../lib/dialog-layer'
import { Dialog, DialogContent, DialogTitle, KeyHint, Pill, Sheet, SheetContent, SheetTitle } from '..'

afterEach(cleanup)

// A DialogContent that is rendered while its Dialog is closed registers nothing.
function ClosedDialogStandIn() {
  useRegisterOpenDialog(false)
  return null
}

const sheetClasses = () => {
  const popup = document.querySelector('[data-slot="sheet-content"]')!
  const overlay = document.querySelector('[data-slot="sheet-overlay"]')
  return { popup: popup.className, overlay: overlay?.className ?? '' }
}

describe('Sheet stacking (CW-20261115-0033)', () => {
  it('stays on z-50 below dialogs when nothing else is open', () => {
    render(
      <Sheet open>
        <SheetContent><SheetTitle>S</SheetTitle></SheetContent>
      </Sheet>,
    )
    const { popup, overlay } = sheetClasses()
    expect(popup).toMatch(/(^|\s)z-50(\s|$)/)
    expect(overlay).toMatch(/(^|\s)z-50(\s|$)/)
    expect(popup).not.toMatch(/z-\[60\]/)
  })

  it('opens on the dialog layer (z-[60]) over an open Dialog', () => {
    render(
      <>
        <Dialog open>
          <DialogContent><DialogTitle>D</DialogTitle></DialogContent>
        </Dialog>
        <Sheet open>
          <SheetContent><SheetTitle>S</SheetTitle></SheetContent>
        </Sheet>
      </>,
    )
    const { popup, overlay } = sheetClasses()
    expect(popup).toMatch(/z-\[60\]/)
    expect(popup).not.toMatch(/(^|\s)z-50(\s|$)/)
    expect(overlay).toMatch(/z-\[60\]/)
  })

  it('is raised when the Sheet is opened from inside the Dialog (the RefDrawer case)', async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>D</DialogTitle>
          <Sheet open>
            <SheetContent><SheetTitle>S</SheetTitle></SheetContent>
          </Sheet>
        </DialogContent>
      </Dialog>,
    )
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(sheetClasses().popup).toMatch(/z-\[60\]/)
  })

  it('a closed Dialog does not raise a Sheet', () => {
    render(
      <>
        <ClosedDialogStandIn />
        <Sheet open>
          <SheetContent><SheetTitle>S</SheetTitle></SheetContent>
        </Sheet>
      </>,
    )
    expect(sheetClasses().popup).toMatch(/(^|\s)z-50(\s|$)/)
  })

  it('raised={false} opts out and raised forces the dialog layer', () => {
    const { rerender } = render(
      <Sheet open>
        <SheetContent raised><SheetTitle>S</SheetTitle></SheetContent>
      </Sheet>,
    )
    expect(sheetClasses().popup).toMatch(/z-\[60\]/)
    rerender(
      <>
        <Dialog open>
          <DialogContent><DialogTitle>D</DialogTitle></DialogContent>
        </Dialog>
        <Sheet open>
          <SheetContent raised={false}><SheetTitle>S</SheetTitle></SheetContent>
        </Sheet>
      </>,
    )
    expect(sheetClasses().popup).toMatch(/(^|\s)z-50(\s|$)/)
  })
})

describe('Pill tone and case', () => {
  it('keeps uppercase by default and offers faint + case none', () => {
    const { rerender } = render(<Pill>Open</Pill>)
    expect(screen.getByText('Open').className).toMatch(/uppercase/)
    rerender(<Pill tone="faint" case="none">Open</Pill>)
    const el = screen.getByText('Open')
    expect(el.className).not.toMatch(/uppercase/)
    expect(el.className).toMatch(/text-fg-faint/)
  })
})

describe('KeyHint', () => {
  it('renders one cap per key', () => {
    const { container, rerender } = render(<KeyHint keys="Esc" />)
    expect(container.querySelectorAll('kbd')).toHaveLength(1)
    rerender(<KeyHint keys={['Ctrl', 'K']} />)
    expect([...container.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(['Ctrl', 'K'])
  })
})
