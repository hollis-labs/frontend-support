import type { HTMLAttributes, PropsWithChildren } from 'react'
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

// Base UI positioning needs browser layout (covered in hover-card-proof.mjs).
// Isolate our Popup prop forwarding so this regression runs deterministically in CI.
vi.mock('@base-ui/react/preview-card', () => ({
  PreviewCard: {
    Portal: ({ children }: PropsWithChildren) => children,
    Positioner: ({ children }: PropsWithChildren) => children,
    Popup: ({ children, 'aria-hidden': ariaHidden }: HTMLAttributes<HTMLDivElement>) => <div aria-hidden={ariaHidden}>{children}</div>,
  },
}))

import { HoverCardContent } from '../components/ui/hover-card'

it('allows aria-hidden={false} to expose popup controls', () => {
  render(<HoverCardContent aria-hidden={false}><button type="button">Next citation</button></HoverCardContent>)
  expect(screen.getByRole('button', { name: 'Next citation' })).toBeTruthy()
})
