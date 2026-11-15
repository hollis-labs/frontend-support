import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Sheet, SheetContent, SheetTitle } from '../components/ui/sheet'

describe('SheetContent overlay', () => {
  it('renders the backdrop by default', () => {
    render(<Sheet open><SheetContent><SheetTitle>Preview</SheetTitle></SheetContent></Sheet>)
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeNull()
  })

  it('omits the backdrop with overlay={false} so content beside a non-modal sheet stays visible', () => {
    render(<Sheet open modal={false}><SheetContent overlay={false}><SheetTitle>Preview</SheetTitle></SheetContent></Sheet>)
    expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
  })
})
