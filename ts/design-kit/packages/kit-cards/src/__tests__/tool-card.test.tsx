import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import fixtures from '../../fixtures/golden/tool-results.json'
import { ToolCard, ToolResultContent, type ToolResultView } from '../cards/tool-card'

describe('tool result card', () => {
  it.each(fixtures)('renders the %s outcome distinctly', (fixture) => {
    const { container } = render(<ToolCard toolName="fixture-tool" result={fixture as ToolResultView} />)
    const result = container.querySelector('[data-slot="tool-result"]')
    expect(result?.getAttribute('data-outcome')).toBe(fixture.outcome)
    expect(screen.getByRole('status').textContent).not.toMatch(/did not run/i)
    if (fixture.outcome !== 'success') expect(screen.getByRole('status').textContent).not.toMatch(/succeeded|completed successfully/i)
  })

  it('shows separate output, structured/nontext content, metadata and schema on demand', () => {
    render(<ToolCard toolName="fixture-tool" result={fixtures[0] as ToolResultView} />)
    expect(screen.queryByText('sample text')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show result details' }))
    for (const name of ['stdout', 'Text content 1', 'Image content 2', 'Audio content 3', 'Resource content 4', 'Other content 5', 'Structured content', 'Metadata']) {
      expect(screen.getByRole('region', { name: new RegExp(`^${name}`) })).toBeTruthy()
    }
    expect(screen.getByText(/schema:\/\/sample\/output/)).toBeTruthy()
    expect(screen.getByText('sample text')).toBeTruthy()
  })

  it('bounds large output and passes the opaque load-more cursor unchanged', () => {
    const onLoadMore = vi.fn()
    render(<ToolResultContent result={{ outcome: 'unknown', stdout: 'x'.repeat(10000), truncation: { cursor: 'opaque:next' } }} onLoadMore={onLoadMore} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show result details' }))
    const preview = screen.getByRole('region', { name: 'stdout' }).textContent ?? ''
    expect(preview.length).toBeLessThan(4200)
    expect(preview).toMatch(/Preview limited/)
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onLoadMore).toHaveBeenCalledOnce()
    expect(onLoadMore).toHaveBeenCalledWith('opaque:next')
  })
})
