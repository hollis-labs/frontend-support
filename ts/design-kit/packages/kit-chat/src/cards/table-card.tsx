import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Table as TableIcon } from 'lucide-react'
import { cn, Button } from '@hollis-labs/design-components'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'
import { acceptsInput, classifyPriorResponse, type CardResponder } from '../lib/response'

/**
 * Rows, sortable, and optionally answerable — pick one and send it back.
 *
 * COLUMNS ARE GENERIC OVER THE ROW, which is the type-safety win here and the reason
 * this is not `Record<string, unknown>[]` like Nanite's. `TableColumn<R>['key']` is
 * `keyof R`, so a column naming a field the row does not have is a compile error at
 * the call site rather than an empty cell at runtime. An agent writing a table gets
 * told; an agent writing Nanite's gets a blank column.
 *
 * SORTING IS LOCAL AND SELECTION IS NOT. Sort order is a view preference nobody else
 * needs to know; a selected row is an answer that has to survive a reload, so it
 * comes back through `priorStatus` like every other resolved state.
 *
 * IT DOES NOT VIRTUALISE, and that is a scope statement rather than an oversight. A
 * card in a transcript showing more rows than fit on a screen is a card that should
 * have been a link to a table view. If a host needs ten thousand rows, it needs a
 * different component and probably a different surface.
 */

export interface TableColumn<R> {
  readonly key: keyof R & string
  readonly header: ReactNode
  /** Default left. `numeric` right-aligns and applies tabular figures. */
  readonly align?: 'start' | 'end' | 'numeric'
  readonly sortable?: boolean
  /** Render the cell. Defaults to the field's own string form. */
  readonly render?: (row: R) => ReactNode
}

export interface TableCardProps<R> {
  readonly title?: ReactNode
  readonly rows: readonly R[]
  readonly columns: readonly TableColumn<R>[]
  /** Stable row identity. Required — a table that answers needs to name its answer. */
  readonly rowId: (row: R) => string
  readonly caption?: ReactNode
  /**
   * Omit to render a read-only table. Supplying it turns rows into choices — which
   * is why selection and the responder arrive together rather than as two props that
   * can disagree.
   */
  readonly onRespond?: CardResponder
  readonly selectLabel?: ReactNode
  readonly priorStatus?: string | null
  readonly priorRowId?: string | null
  readonly className?: string
}

type SortState<R> = { readonly key: keyof R & string; readonly dir: 'asc' | 'desc' } | null

const ALIGN_CLASS = {
  start: 'text-left',
  end: 'text-right',
  numeric: 'text-right tabular-nums',
} as const satisfies Record<NonNullable<TableColumn<never>['align']>, string>

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

export function TableCard<R>({
  title,
  rows,
  columns,
  rowId,
  caption,
  onRespond,
  selectLabel = 'Choose',
  priorStatus,
  priorRowId,
  className,
}: TableCardProps<R>) {
  const [sort, setSort] = useState<SortState<R>>(null)
  const [busy, setBusy] = useState(false)

  const state = classifyPriorResponse(priorStatus)
  const answerable = onRespond != null
  const live = answerable && acceptsInput(state)

  const sorted = useMemo(() => {
    if (sort == null) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const r = compare(a[sort.key], b[sort.key])
      return sort.dir === 'asc' ? r : -r
    })
    return copy
  }, [rows, sort])

  function toggleSort(key: keyof R & string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )
  }

  async function choose(row: R) {
    if (!live || busy || onRespond == null) return
    setBusy(true)
    try {
      await onRespond({
        status: 'submitted',
        decisions: [{ itemId: rowId(row), action: 'select' }],
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Envelope muted={answerable && !live} className={className}>
      <EnvelopeHeader
        icon={TableIcon}
        label={title ?? 'Table'}
        meta={`${rows.length} row${rows.length === 1 ? '' : 's'}`}
      />

      {rows.length === 0 ? (
        <EnvelopeBody description="No rows." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-control">
            {caption != null ? (
              <caption className="px-4 pb-2 text-left text-xs text-fg-muted">{caption}</caption>
            ) : null}
            <thead>
              <tr className="border-b border-border-subtle">
                {columns.map((col) => {
                  const active = sort?.key === col.key
                  const align = ALIGN_CLASS[col.align ?? 'start']
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cn(
                        'px-4 py-2 font-mono text-caption font-semibold uppercase tracking-label text-fg-muted',
                        align,
                      )}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 uppercase hover:text-fg"
                        >
                          {col.header}
                          {active ? (
                            sort.dir === 'asc' ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            )
                          ) : null}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  )
                })}
                {answerable ? <th scope="col" className="px-4 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const id = rowId(row)
                const chosen = priorRowId != null && priorRowId === id
                return (
                  <tr
                    key={id}
                    data-chosen={chosen ? '' : undefined}
                    className={cn(
                      'border-b border-border-subtle last:border-b-0',
                      chosen ? 'bg-primary-muted' : null,
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 py-2 text-fg-secondary', ALIGN_CLASS[col.align ?? 'start'])}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                    {answerable ? (
                      <td className="px-4 py-2 text-right">
                        {live ? (
                          <Button size="xs" variant="outline" disabled={busy} onClick={() => choose(row)}>
                            {selectLabel}
                          </Button>
                        ) : chosen ? (
                          <span className="font-mono text-caption uppercase tracking-label text-primary">
                            Chosen
                          </span>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {state.kind === 'unrecognized' ? (
        <EnvelopeFooter>
          <span className="text-xs text-warning">
            Recorded status <code className="font-mono">{state.status}</code> is not one this
            build knows, so the table stays locked.
          </span>
        </EnvelopeFooter>
      ) : null}
    </Envelope>
  )
}
