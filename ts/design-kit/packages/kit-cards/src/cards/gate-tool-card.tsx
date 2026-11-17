import { ToolCard, type ToolCardProps } from './tool-card'

/** Host-verified references. Their presence is evidence to display, not authority. */
export interface GateToolEvidence {
  readonly preparedOperationRef: string
  readonly decisionRef?: string
  readonly deliveryReceiptRef?: string
  readonly executionReceiptRef?: string
}

export interface GateToolCardProps extends ToolCardProps {
  /** Absent means the Gatecrasher integration is off. */
  readonly gate?: GateToolEvidence
}

/** Keeps the normal result card intact while showing bounded Gatecrasher refs. */
export function GateToolCard({ gate, ...tool }: GateToolCardProps) {
  if (!gate) return <ToolCard {...tool} />
  return <div data-slot="gate-tool-card">
    <ToolCard {...tool} />
    <aside aria-label="Gatecrasher references" className="mt-2 space-y-1 break-all text-caption text-fg-secondary">
      <p>Prepared operation: <code>{gate.preparedOperationRef}</code></p>
      {gate.decisionRef ? <p>Decision: <code>{gate.decisionRef}</code></p> : null}
      {gate.deliveryReceiptRef ? <p>Delivery receipt: <code>{gate.deliveryReceiptRef}</code></p> : null}
      {gate.executionReceiptRef ? <p>Execution receipt: <code>{gate.executionReceiptRef}</code></p> : null}
    </aside>
  </div>
}
