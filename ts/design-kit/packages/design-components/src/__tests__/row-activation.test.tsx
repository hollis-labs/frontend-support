import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CopyableId } from '../components/copyable-id'
import { OverflowMenu } from '../components/overflow-menu'
import { ROW_INTERACTIVE_SELECTOR, rowInteractiveProps } from '../lib/row-activation'

/**
 * NOTE ON WHAT THE MARKER IS FOR, because it is easy to mis-test. `CopyableId`
 * ALSO calls `stopPropagation()`, which alone stops a React handler on an
 * ancestor. The marker is what covers the cases bubbling does not: a portaled
 * menu, which is not a DOM descendant of its trigger, and any handler that reads
 * `e.target` rather than relying on the event reaching it. So "opted out" is
 * asserted on the DOM, not by expecting the container to fire.
 *
 * These assert the BEHAVIOUR the protocol exists for: a container's activation
 * handler uses `closest(ROW_INTERACTIVE_SELECTOR)` to decide whether a click
 * belongs to a descendant, so what matters is that the selector matches what the
 * components actually render. Asserting the attribute string alone would pass
 * while the two drifted apart, which is the failure this lift is meant to end.
 */
describe('row-activation protocol', () => {
  it('the exported selector matches what a marked element renders', () => {
    render(<CopyableId id="abc123" />)
    const button = screen.getByRole('button')
    expect(button.closest(ROW_INTERACTIVE_SELECTOR)).toBe(button)
  })

  it('a container handler skips a click that lands inside a marked descendant', () => {
    const onActivate = vi.fn()
    render(
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(ROW_INTERACTIVE_SELECTOR)) return
          onActivate()
        }}
      >
        <CopyableId id="abc123" />
        <span data-testid="plain">plain</span>
      </div>,
    )

    screen.getByRole('button').click()
    expect(onActivate).not.toHaveBeenCalled()

    screen.getByTestId('plain').click()
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('opting out removes the marker', () => {
    render(<CopyableId id="abc123" stopRowActivation={false} />)
    expect(screen.getByRole('button').closest(ROW_INTERACTIVE_SELECTOR)).toBeNull()
  })

  it('OverflowMenu marks its trigger by default and not when opted out', () => {
    const { unmount } = render(<OverflowMenu actions={[]} />)
    expect(screen.getByRole('button').closest(ROW_INTERACTIVE_SELECTOR)).not.toBeNull()
    unmount()

    render(<OverflowMenu actions={[]} stopRowActivation={false} />)
    expect(screen.getByRole('button').closest(ROW_INTERACTIVE_SELECTOR)).toBeNull()
  })

  it('rowInteractiveProps spreads nothing when off', () => {
    expect(rowInteractiveProps(false)).toEqual({})
    expect(Object.keys(rowInteractiveProps(true))).toHaveLength(1)
  })
})
