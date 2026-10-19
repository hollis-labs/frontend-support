import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { StatusBadge } from '@/components/status-badge'

describe('StatusBadge', () => {
  it('renders the status label', () => {
    const { getByText } = render(<StatusBadge status="doing" />)
    expect(getByText('doing')).toBeTruthy()
  })

  it('applies the themed status tone for a known status', () => {
    const { getByText } = render(<StatusBadge status="blocked" />)
    const badge = getByText('blocked').closest('span')?.parentElement
    // Every slot names the status, and NAMES IT — the label used to be an inline
    // `color-mix(var(--color-dash-status-blocked) 60%, var(--color-text))`, so this
    // assertion used to look for the raw custom property in the class string. The
    // derivation moved to the theme layer, where computing a colour belongs, and
    // the component names the result. Asserting the token rather than the
    // expression is also the more durable test: it survives a change to the ratio,
    // and it fails if a slot stops following the status.
    expect(badge?.className).toContain('text-dash-status-blocked-label')
    expect(badge?.className).toContain('bg-dash-status-blocked/10')
    expect(badge?.className).toContain('border-dash-status-blocked/40')
  })

  it('keeps app vocabulary while using an explicit shared tone', () => {
    const { getByText } = render(<StatusBadge status="Exploring" tone="review" />)
    const badge = getByText('Exploring').closest('span')?.parentElement
    expect(badge?.className).toContain('text-dash-status-review-label')
    expect(badge?.className).toContain('bg-dash-status-review/10')
  })

  it('falls back to the neutral tone for an unknown status', () => {
    const { getByText } = render(<StatusBadge status="weird" />)
    const badge = getByText('weird').closest('span')?.parentElement
    expect(badge?.className).toContain('text-text-soft')
  })

  it('shows "unknown" when status is empty', () => {
    const { getByText } = render(<StatusBadge status="" />)
    expect(getByText('unknown')).toBeTruthy()
  })

  it('forwards an extra className', () => {
    const { getByText } = render(<StatusBadge status="done" className="mt-1" />)
    const badge = getByText('done').closest('span')?.parentElement
    expect(badge?.className).toContain('mt-1')
  })
})
