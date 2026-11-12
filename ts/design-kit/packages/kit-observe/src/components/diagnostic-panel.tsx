import { useId } from 'react'
import { Callout, CopyButton, JsonViewer } from '@hollis-labs/design-components'
import { ObservationStatus } from './observation-status'
import type { DiagnosticValidation, DiagnosticValue, ObservationState } from '../types'

export interface DiagnosticPanelProps {
  label: string
  /** Inline JSON Schema; host checks supported structure and bounds. */
  schema: DiagnosticValue
  /** Host-bounded JSON, not HTML, a remote schema, or executable instructions. */
  data: DiagnosticValue
  /** Host-supplied schema validation result; this kit is not a wire validator. */
  validation: DiagnosticValidation
  observation: ObservationState
}

export function DiagnosticPanel({ label, schema, data, validation, observation }: DiagnosticPanelProps) {
  const id = useId()
  return <ObservationStatus label={label} observation={observation}>
    {validation.state !== 'valid' ? <Callout tone="warning" title={validation.state === 'unsupported' ? 'Unsupported diagnostic schema' : 'Diagnostic validation failed'}>
      <ul>{validation.messages.map((message, index) => <li key={index}>{message}</li>)}</ul>
    </Callout> : <div role="region" aria-labelledby={id} className="flex min-w-0 flex-col gap-2">
      <h4 id={id} className="text-label text-fg">{label} data</h4>
      <div><CopyButton text={JSON.stringify(data, null, 2)} label={`Copy ${label} data`} /></div>
      <JsonViewer value={data} className="max-h-64 show-scrollbar" />
    </div>}
    <details className="min-w-0 text-control text-fg-secondary">
      <summary className="cursor-pointer">{label} inline schema</summary>
      <JsonViewer value={schema} className="mt-2 max-h-64 show-scrollbar" />
    </details>
  </ObservationStatus>
}
