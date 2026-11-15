import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from '../components/page-header'

describe('PageHeader heading level (CW-20261115-0026)', () => {
  it('renders an h1 by default', () => {
    render(<PageHeader title="Approvals" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Approvals' })).toBeTruthy()
  })

  it('renders an h2 with as="h2" so a shell can own the h1', () => {
    render(<PageHeader title="Approvals" as="h2" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Approvals' })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
