import type { ReactNode, RefObject } from 'react'

interface ListPageLayoutProps {
  /** Pinned page header — typically a `<PageHeader>`. */
  header: ReactNode
  /** Optional tab strip, pinned directly under the header. */
  tabs?: ReactNode
  /** Optional metric strip — typically a `<SummaryCards>`. */
  summary?: ReactNode
  /** Optional filter region — typically a `<FilterBar>`. */
  filters?: ReactNode
  /** Pinned result count, selection actions, or paging controls. */
  footer?: ReactNode
  /**
   * Ref attached to the scroll body. Pass the same ref to a `DataTable`'s
   * `scrollRootRef` so its infinite-scroll observer uses this region as root.
   */
  scrollRef?: RefObject<HTMLDivElement | null>
  /** Optional data hook for the actual list scroll owner. */
  listScrollHook?: boolean
  /** Scrollable page body — the table, cards, or content. */
  children: ReactNode
}

/**
 * Standard list/operations page shell. Locks the composition every app was
 * re-deriving by hand: a pinned header region (header + tabs + summary +
 * filters) over a single internal-scroll body. Apps fill the slots; the
 * spacing, borders, and scroll behavior stay identical across apps.
 *
 * Mirrors Torque's `BoardPage` skeleton (`flex h-full flex-col` + a
 * `flex-1 overflow-auto` body).
 */
export function ListPageLayout({
  header,
  tabs,
  summary,
  filters,
  footer,
  scrollRef,
  listScrollHook,
  children,
}: ListPageLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col [&>*]:shrink-0">
      {header}
      {tabs}
      {summary}
      {filters}
      <div ref={scrollRef} data-ops-scroll={listScrollHook ? "list" : undefined} className="min-h-0 flex-1 shrink overflow-auto">
        {children}
      </div>
      {footer}
    </div>
  )
}
