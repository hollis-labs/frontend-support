import { useId, type ReactNode } from 'react'
import { Button, Callout, EmptyState, Pill, Skeleton, cn } from '@hollis-labs/design-components'
import type { ObservationState } from '../types'

export interface ObservationStatusProps {
  label: string
  observation: ObservationState
  children?: ReactNode
  className?: string
}

/** Resource-local evidence boundary; presentation never starts a request. */
export function ObservationStatus({ label, observation, children, className }: ObservationStatusProps) {
  const id = useId()
  const { phase, observedAt, nowMs, staleAfterMs, supported = true, paused, error, onRetry } = observation
  const hasObservation = observedAt !== undefined
  const ageMs = observedAt === undefined ? NaN : nowMs - Date.parse(observedAt)
  const validTime = Number.isFinite(ageMs) && ageMs >= 0 && Number.isFinite(staleAfterMs) && staleAfterMs > 0
  const stale = hasObservation && (!validTime || ageMs > staleAfterMs)
  const retry = onRetry ? { label: `Retry ${label}`, onClick: onRetry } : undefined
  const stateLabel = !supported ? 'Unsupported' : !hasObservation ? phase === 'loading' ? 'Loading' : 'Unavailable'
    : !validTime ? 'Observation time unavailable' : stale ? 'Stale' : paused ? 'Paused' : 'Observed'
  return (
    <section aria-labelledby={id} aria-busy={supported && phase === 'loading'}
      className={cn('flex min-w-0 flex-col gap-3 rounded border border-border-subtle bg-surface p-4', className)}>
      <h3 id={id} className="text-label font-medium text-fg">{label}</h3>
      <div className="flex flex-wrap items-center gap-2 text-caption text-fg-secondary">
        <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center gap-2">
          <Pill tone={stale ? 'warning' : 'neutral'}>{stateLabel}</Pill>
          {supported && hasObservation && phase === 'loading' ? <span>Refreshing</span> : null}
          {supported && hasObservation && paused ? <span>Polling paused</span> : null}
        </div>
        {supported && hasObservation ? <span className="break-all">Observed <time dateTime={observedAt}>{observedAt}</time>
          {validTime ? ` · ${Math.floor(ageMs / 1000)}s ago` : ' · Check observation clock'}</span> : null}
      </div>
      {!supported ? <EmptyState variant="empty" title="Unsupported resource" description="This app does not declare this observation capability." />
        : !hasObservation ? phase === 'loading' ? <><Skeleton className="h-8 w-full" /><span className="sr-only">Loading {label}</span></>
          : <div role={phase === 'error' ? 'alert' : undefined}><EmptyState variant={phase === 'error' ? 'error' : 'empty'}
            title="Observation unavailable" description={error ?? 'No successful observation is available.'} action={retry} /></div>
          : <>
            {phase === 'error' || error ? <Callout tone="danger" title="Refresh failed"
              actions={onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Retry {label}</Button> : undefined}>
              {error ?? 'The latest request failed.'} The last successful observation is retained.
            </Callout> : null}
            {children}
          </>}
    </section>
  )
}
