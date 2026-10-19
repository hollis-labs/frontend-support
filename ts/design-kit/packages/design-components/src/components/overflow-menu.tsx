import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { rowInteractiveProps } from '../lib/row-activation'

export interface OverflowAction {
  label: string
  onSelect: () => void
  /** Optional leading icon. */
  icon?: ReactNode
  /** Render in the destructive group — separated, red. */
  destructive?: boolean
  disabled?: boolean
}

interface OverflowMenuProps {
  actions: OverflowAction[]
  ariaLabel?: string
  /** Menu alignment relative to the trigger. Default `end`. */
  align?: 'start' | 'end'
  /**
   * Mark the trigger and the portaled menu as owning their own clicks, so an
   * ancestor with a row or card activation handler skips them. Default true.
   */
  stopRowActivation?: boolean
}

/**
 * The overflow "…" action menu. Destructive actions are grouped below a
 * separator. Apps pass a plain `OverflowAction[]`.
 *
 * RENAMED from sysop-ui's `RowActionMenu`, per CW-0116. Nothing about it is
 * row-specific — it is an overflow menu, and a card or a toolbar wants the same
 * component. The old name described the first place it was used.
 */
export function OverflowMenu({
  actions,
  ariaLabel = 'Actions',
  align = 'end',
  stopRowActivation = true,
}: OverflowMenuProps) {
  const normal = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)
  const interactive = rowInteractiveProps(stopRowActivation)

  return (
    <span {...interactive}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={ariaLabel}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        {/* The portaled content is marked too: menu-item clicks bubble
            synthetically to the ancestor row, whose handler checks the DOM with
            closest() — and the portal is not a DOM descendant of the span above. */}
        <DropdownMenuContent align={align} className="min-w-44" {...interactive}>
          {normal.map((action) => (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              onClick={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
          {destructive.length > 0 && normal.length > 0 ? <DropdownMenuSeparator /> : null}
          {destructive.map((action) => (
            <DropdownMenuItem
              key={action.label}
              variant="destructive"
              disabled={action.disabled}
              onClick={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}
