import type { ReactNode } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@hollis-labs/design-components'
import { Envelope, EnvelopeBody, EnvelopeHeader } from './envelope'

/**
 * What happened, in order.
 *
 * THE TIMESTAMP IS A `ReactNode` AND THIS CARD DOES NO DATE FORMATTING. Nanite's
 * version calls `toLocaleString('en-US', …)` inside the component, which hardcodes a
 * locale into a shared package and puts a formatting decision somewhere no consumer
 * can reach. A host already knows its locale, its timezone and whether it wants
 * "2m ago" — and `design-app-runtime` ships the formatters. So the host formats and
 * passes the result, exactly as `ChatMessageItem.timestamp` already works in this
 * package. Consistent seam, one less opinion, and no `Intl` in the bundle.
 */

export type TimelineStatus = 'completed' | 'active' | 'pending'

export interface TimelineEvent {
  /** Already formatted. See the note above on why this card does not format dates. */
  readonly timestamp: ReactNode
  readonly label: ReactNode
  readonly description?: ReactNode
  readonly status?: TimelineStatus
  /** Stable identity for the row. Falls back to position when the wire has none. */
  readonly id?: string
}

export interface TimelineCardProps {
  readonly title?: ReactNode
  readonly events: readonly TimelineEvent[]
  readonly className?: string
}

const STATUS_DOT = {
  completed: 'bg-success',
  active: 'bg-info',
  pending: 'bg-border',
} as const satisfies Record<TimelineStatus, string>

export function TimelineCard({ title, events, className }: TimelineCardProps) {
  /*
   * `events` IS REQUIRED BY THE TYPE AND STILL NORMALISED, which looks redundant
   * until you remember where the data comes from. A host feeding this from an
   * envelope payload is handing over parsed JSON, and TypeScript's guarantee stops
   * at the point someone writes `as TimelineCardProps`. Nanite added this same
   * normalisation after a partially-loaded envelope threw on `.length`. It is two
   * lines and it turns a crashed transcript into an empty card.
   */
  const rows = events ?? []

  return (
    <Envelope className={className}>
      <EnvelopeHeader
        icon={Clock}
        label="Timeline"
        meta={`${rows.length} event${rows.length === 1 ? '' : 's'}`}
      />
      <EnvelopeBody title={title}>
        <ol className="relative">
          {rows.map((event, i) => {
            const status = event.status ?? 'pending'
            const isLast = i === rows.length - 1

            return (
              <li key={event.id ?? i} className="relative flex gap-3 pb-4 last:pb-0">
                {/*
                 * The rail runs from under the dot to the next one. `left-1.5` is
                 * half of the dot's `size-3`, so the two stay aligned off named
                 * steps rather than off Nanite's `left-[5px]` under an `h-[11px]`
                 * dot — a pair of arbitrary values that had to agree by hand.
                 */}
                {isLast ? null : (
                  <span className="absolute bottom-0 left-1.5 top-3 w-px bg-border-subtle" aria-hidden />
                )}
                <span
                  className={cn(
                    'mt-1 size-3 shrink-0 rounded-full ring-2 ring-bg-elevated',
                    STATUS_DOT[status],
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-control font-medium text-fg">{event.label}</span>
                    <span className="font-mono text-label text-fg-muted">{event.timestamp}</span>
                  </div>
                  {event.description != null ? (
                    <p className="mt-0.5 text-xs text-fg-secondary">{event.description}</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      </EnvelopeBody>
    </Envelope>
  )
}
