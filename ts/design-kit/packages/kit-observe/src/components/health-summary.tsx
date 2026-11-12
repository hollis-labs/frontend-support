import { Pill } from '@hollis-labs/design-components'
import { ObservationStatus } from './observation-status'
import type { HealthStatus, ObservationState } from '../types'

export interface HealthCheck { id: string; label: string; status: HealthStatus; message?: string }
export interface HealthSummaryProps {
  label: string
  status: HealthStatus
  checks: readonly HealthCheck[]
  observation: ObservationState
}
const tones = { healthy: 'success', degraded: 'warning', unhealthy: 'danger', unknown: 'neutral' } as const

/** Returned health is distinct from request availability and observation age. */
export function HealthSummary({ label, status, checks, observation }: HealthSummaryProps) {
  // Runtime fallback also refuses to make an unfamiliar adapter value healthy.
  const safeStatus = (value: HealthStatus): HealthStatus => Object.hasOwn(tones, value) ? value : 'unknown'
  const aggregate = safeStatus(status)
  return (
    <ObservationStatus label={label} observation={observation}>
      <div className="flex flex-wrap items-center gap-2 text-control text-fg-secondary">
        <span>Reported health</span><Pill tone={tones[aggregate]} dot>{aggregate}</Pill>
      </div>
      <ul aria-label={`${label} checks`} className="flex flex-col gap-2 text-control text-fg">
        {checks.map(check => <li key={check.id} className="flex flex-wrap items-start gap-2 border-t border-border-subtle pt-2">
          <span>{check.label}</span><Pill tone={tones[safeStatus(check.status)]}>{safeStatus(check.status)}</Pill>
          {check.message ? <span className="basis-full break-words text-caption text-fg-secondary">{check.message}</span> : null}
        </li>)}
      </ul>
      {checks.length === 0 ? <p className="text-caption text-fg-secondary">No checks returned</p> : null}
    </ObservationStatus>
  )
}
