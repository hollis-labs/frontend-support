import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { PageHeader } from '@/components/page-header'

describe('PageHeader', () => {
  it('renders leading content beside the title and children on the right', () => {
    const { getByRole, getByText } = render(
      <PageHeader title="Transcripts" leading={<span>Sessions</span>}>
        <span>Refresh</span>
      </PageHeader>,
    )
    const heading = getByRole('heading', { name: 'Transcripts' })
    expect(heading.parentElement?.contains(getByText('Sessions'))).toBe(true)
    expect(heading.parentElement?.contains(getByText('Refresh'))).toBe(false)
  })

  it('renders as before without leading', () => {
    const { getByRole } = render(<PageHeader title="Pull requests" />)
    expect(getByRole('heading', { name: 'Pull requests' })).toBeTruthy()
  })
})
