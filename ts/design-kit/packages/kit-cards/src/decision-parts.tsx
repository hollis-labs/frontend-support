import type { ReactNode } from 'react'
import { Button } from '@hollis-labs/design-components'

/** The small fixed pieces ApprovalCard and ChoiceCard share. Hooks live in decision-extras.ts. */

/**
 * The held-decision bar. The live region's text is constant for the whole window, so a screen
 * reader hears it once; the ticking seconds are visual only. Undo takes focus on mount, because
 * the button that was pressed has just been replaced and Cmd/Ctrl+Z needs focus inside the card.
 */
export function HeldBar({ label, secondsLeft, onUndo, disabled }: { label: ReactNode; secondsLeft: number; onUndo: () => void; disabled?: boolean }) {
  return (
    <>
      <span data-slot="held-decision" className="mr-auto text-control text-fg-secondary">
        <span role="status">{label} will be sent. Undo to cancel.</span>
        <span aria-hidden> {secondsLeft}s</span>
      </span>
      <Button type="button" variant="outline" size="sm" disabled={disabled} className="max-sm:min-h-11" onClick={onUndo} autoFocus>
        Undo
      </Button>
    </>
  )
}

export function RecommendedTag() {
  return (
    <span data-slot="recommended" className="ml-1.5 rounded-control border border-border-subtle px-1 text-caption text-fg-muted">
      Recommended
    </span>
  )
}

export function FallbackLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a data-slot="fallback-link" href={href} className="mr-auto text-control text-primary underline">
      {children ?? 'Open in Approvals'}
    </a>
  )
}
