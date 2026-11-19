import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import fixtures from '../../fixtures/shared-resultenv/fixtures.json'
import { ToolCard, ToolResultContent } from '../cards/tool-card'
import { toToolResultView } from '../cards/tool-result-adapter'
import type { ResultenvEnvelope } from '../cards/resultenv.generated'

describe('tool result card', () => {
  it.each(fixtures)('renders the $name shared fixture', (fixture) => {
    const { container } = render(<ToolCard toolName="fixture-tool" envelope={fixture.envelope as ResultenvEnvelope} />)
    const result = container.querySelector('[data-slot="tool-result"]')
    expect(result?.getAttribute('data-outcome')).toBe(fixture.envelope.outcome)
    expect(screen.getByRole('status').textContent).not.toMatch(/did not run/i)
    if (fixture.envelope.outcome !== 'success') expect(screen.getByRole('status').textContent).not.toMatch(/succeeded|completed successfully/i)
  })

  it('shows separate output, structured/nontext content, metadata and schema on demand', () => {
    render(<ToolCard toolName="fixture-tool" envelope={fixtures[0].envelope as ResultenvEnvelope} />)
    expect(screen.queryByText('sample text')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show result details' }))
    for (const name of ['Text content 1', 'Structured content']) {
      expect(screen.getByRole('region', { name: new RegExp(`^${name}`) })).toBeTruthy()
    }
    expect(screen.getByText(/tool:\/\/search\/output\/v2/)).toBeTruthy()
    expect(screen.getByText('Summary')).toBeTruthy()
    expect(screen.getByText(/"total": 1/)).toBeTruthy()
  })

  it('keeps nontext content and redacts marked metadata paths for display', () => {
    const image = fixtures.find(item => item.name === 'image_and_resource')!
    const secret = fixtures.find(item => item.name === 'metadata_annotations_redaction')!
    const imageView = toToolResultView(image.envelope as ResultenvEnvelope)
    expect(imageView.content?.map(part => part.type)).toEqual(['image', 'resource', 'resource'])
    const secretView = toToolResultView(secret.envelope as ResultenvEnvelope)
    expect(JSON.stringify(secretView.metadata)).not.toContain('fixture-hidden')
    expect(JSON.stringify(secretView.metadata)).toContain('[REDACTED]')
    expect(secretView.content?.[0]).toEqual({ type: 'text', text: 'safe text' })
  })

  it('labels PTY output as a combined stream', () => {
    const fixture = fixtures.find(item => item.name === 'pty_combined_output')!
    render(<ToolCard toolName="terminal" envelope={fixture.envelope as ResultenvEnvelope} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show result details' }))
    expect(screen.getByRole('region', { name: 'Combined PTY output' }).textContent).toContain('stdout and stderr share one PTY stream')
    expect(screen.queryByRole('region', { name: 'stdout' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'stderr' })).toBeNull()
  })

  it('redacts direct output and a whole MCP result before display without changing the receipt', () => {
    const envelope: ResultenvEnvelope = {
      version: 'resultenv/v1', outcome: 'success', exit_code: 0,
      stdout: 'synthetic-secret-output',
      mcp_result: { content: [{ type: 'text', text: 'synthetic-secret-mcp' }] },
      redact: ['/stdout', '/mcp_result'],
    }
    const view = toToolResultView(envelope)
    expect(view.stdout).toBe('[REDACTED]')
    expect(view.content).toEqual([])
    render(<ToolCard toolName="redacted" envelope={envelope} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show result details' }))
    expect(screen.getByRole('region', { name: 'stdout' }).textContent).toContain('[REDACTED]')
    expect(document.body.textContent).not.toContain('synthetic-secret')
    expect(envelope.stdout).toBe('synthetic-secret-output')
  })

  it.each([0, 2])('shows an output-free exit code %i', (exitCode) => {
    const outcome = exitCode === 0 ? 'success' : 'nonzero_exit'
    render(<ToolCard toolName="exit-only" envelope={{ version: 'resultenv/v1', outcome, exit_code: exitCode } as ResultenvEnvelope} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show result details' }))
    expect(screen.getByText(`Exit code:`).parentElement?.textContent).toContain(String(exitCode))
  })

  it('shows cursorless truncation without a load-more action', () => {
    render(<ToolCard toolName="truncated" envelope={{ version: 'resultenv/v1', outcome: 'unknown', truncation: { truncated: true } }} onLoadMore={vi.fn()} />)
    expect(screen.getByText('Output truncated.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
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

  it('bounds the number of rendered content items', () => {
    const content = Array.from({ length: 25 }, (_, index) => ({ type: 'text' as const, text: `item ${index}` }))
    render(<ToolResultContent result={{ outcome: 'success', content }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show result details' }))
    expect(screen.getByRole('region', { name: 'Text content 20' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Text content 21' })).toBeNull()
    expect(screen.getByText(/Only the first 20/)).toBeTruthy()
  })
})
