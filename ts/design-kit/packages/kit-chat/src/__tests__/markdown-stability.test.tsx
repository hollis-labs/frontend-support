import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ChatMarkdown } from '../markdown'

afterEach(cleanup)
const SRC = 'A **bold** line\n\n- one\n- two'

describe('ChatMarkdown stability', () => {
  it('keeps DOM nodes across a re-render with the same content', async () => {
    const { rerender } = render(<ChatMarkdown>{SRC}</ChatMarkdown>)
    const strong = await screen.findByText('bold')
    rerender(<ChatMarkdown className="other">{SRC}</ChatMarkdown>)
    expect(screen.getByText('bold')).toBe(strong)
  })
  it('keeps DOM nodes when a host passes a fresh inline components map each render', async () => {
    const view = () => (
      <ChatMarkdown components={{ strong: (p) => <strong data-x {...p} /> }}>{SRC}</ChatMarkdown>
    )
    const { rerender } = render(view())
    const strong = await screen.findByText('bold')
    rerender(view())
    expect(screen.getByText('bold')).toBe(strong)
  })
})
