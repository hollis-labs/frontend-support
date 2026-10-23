import type { ReactNode } from 'react'
import { CardBoundary } from '../cards/card-boundary'
import { CardMiss } from '../cards/card-miss'
import type { CardRegistry, Origin } from './registry'

export interface CardSlotProps {
  readonly registry: CardRegistry
  readonly kind: string
  readonly version: string
  /** Agent-originated content gets the restricted class. Default `host`. */
  readonly origin?: Origin
  /** Props handed to the resolved component, already bound by the host. */
  readonly props: Record<string, unknown>
  /** Reported when a found renderer throws; the slot still draws the failure card. */
  readonly onError?: (error: Error) => void
}

/**
 * Resolve and draw one card. A miss draws `CardMiss` naming the kind; a renderer that
 * throws draws `CardBoundary`'s failure card. Neither is ever a blank slot, so version
 * skew between a sender and this build is visible to the person looking at it.
 */
export function CardSlot({ registry, kind, version, origin = 'host', props, onError }: CardSlotProps): ReactNode {
  const resolved = registry.resolve({ kind, version, origin })
  if (!resolved.ok) {
    return <CardMiss code={resolved.code} wireKind={resolved.wireKind} reason={resolved.reason} />
  }
  const Component = resolved.entry.component as (p: Record<string, unknown>) => ReactNode
  return (
    <CardBoundary key={`${kind}@${version}`} wireKind={kind} onError={onError}>
      <Component {...props} />
    </CardBoundary>
  )
}
