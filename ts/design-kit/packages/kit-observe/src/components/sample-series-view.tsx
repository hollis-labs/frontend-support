import { Callout } from '@hollis-labs/design-components'
import { TimestampSampleChart } from '@hollis-labs/kit-dashboard/charts'
import { ObservationStatus } from './observation-status'
import type { ObservationKind, ObservationState, ObservationUnit } from '../types'

export interface SampleSeriesPoint { at: string; value: number | null }
export interface SampleSeriesViewProps {
  label: string
  points: readonly SampleSeriesPoint[]
  unit: ObservationUnit
  kind: ObservationKind
  requested: { from: string; to: string; limit: number }
  bounds: { maxPoints: number; maxWindowSeconds: number }
  truncated: boolean
  observation: ObservationState
}

/** Observation metadata around the shared exact-sample chart, never a chart engine. */
export function SampleSeriesView({ label, points, unit, kind, requested, bounds, truncated, observation }: SampleSeriesViewProps) {
  return <ObservationStatus label={label} observation={observation}>
    <p className="break-words text-caption text-fg-secondary">Requested UTC window: <time dateTime={requested.from}>{requested.from}</time>
      {' to '}<time dateTime={requested.to}>{requested.to}</time>. Limit {requested.limit}; received {points.length} samples.
      {' '}Resource bounds: {bounds.maxPoints} points, {bounds.maxWindowSeconds}s per window.</p>
    {truncated ? <Callout tone="warning" title="Incomplete series">The response is truncated; these samples do not represent the complete requested window.</Callout> : null}
    {points.length === 0 ? <p className="text-control text-fg-secondary">No samples in requested range</p> : null}
    <TimestampSampleChart label={label} unit={unit} kind={kind} points={points.map(point => ({ t: point.at, value: point.value }))} />
  </ObservationStatus>
}
