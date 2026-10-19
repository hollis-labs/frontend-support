import { useId } from 'react'
import { Metric } from '@hollis-labs/design-components'
import { ObservationStatus } from './observation-status'
import type { ObservationKind, ObservationState, ObservationUnit } from '../types'

export interface StatObservation {
  id: string
  label: string
  value: number | null
  unit: ObservationUnit
  kind: ObservationKind
  observation: ObservationState
}
export interface StatCollectionProps { label: string; rows: readonly StatObservation[] }

export function StatCollection({ label, rows }: StatCollectionProps) {
  const id = useId()
  return <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
    <h2 id={id} className="text-control font-semibold text-fg">{label}</h2>
    {rows.length === 0 ? <p className="text-control text-fg-secondary">No stats declared</p> : null}
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
      {rows.map(row => <ObservationStatus key={row.id} label={row.label} observation={row.observation}>
        <Metric label={row.label} value={row.value === null ? 'Missing sample' : Number.isFinite(row.value) ? String(row.value) : 'Invalid sample'}
          hint={`${row.unit} · ${row.kind === 'counter' ? 'cumulative counter' : 'gauge'}`} />
      </ObservationStatus>)}
    </div>
  </section>
}
