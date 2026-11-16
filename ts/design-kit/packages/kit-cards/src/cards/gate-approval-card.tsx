import type { ReactNode } from 'react'
import { ApprovalCard, type ApprovalEffect, type ApprovalRisk } from './approval-card'
import type { ConfirmationAction } from './confirmation-card'

/** A host-owned Gatecrasher projection. The card never derives state from text or a timer. */
export type GateApprovalState =
  | { readonly kind: 'pending' }
  | { readonly kind: 'approved'; readonly scope: string; readonly decisionId: string; readonly receiptId?: string }
  | { readonly kind: 'denied'; readonly decisionId: string; readonly receiptId?: string }
  | { readonly kind: 'expired' }
  | { readonly kind: 'stale' }
  | { readonly kind: 'unknown' }

export interface GateApprovalOption {
  /** The exact native option ID, including any provider-specific spelling. */
  readonly id: string
  readonly label: ReactNode
  readonly kind: 'allow' | 'deny' | 'cancel'
}

export interface GateApprovalCardProps {
  /** Each host integration opts in explicitly; absent means the card is hidden. */
  readonly enabled?: boolean
  readonly state: GateApprovalState
  readonly ticketId: string
  readonly ticketRevision: number
  readonly operationDigest: string
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly risk: ApprovalRisk
  readonly effects?: readonly ApprovalEffect[]
  readonly options: readonly GateApprovalOption[]
  readonly expiresAt?: ReactNode
  readonly requester?: ReactNode
  /** The host rechecks this revision and answers through Gatecrasher. */
  readonly onSelect: (choice: { readonly ticketId: string; readonly ticketRevision: number; readonly operationDigest: string; readonly optionId: string }) => void | Promise<void>
  /** Dismissing the view does not cancel the authoritative interaction. */
  readonly onDismiss: () => void | Promise<void>
  /** Reload authoritative Gatecrasher state after reconnect or a stale response. */
  readonly onReconcile?: () => void
}

export function GateApprovalCard({
  enabled = false,
  state,
  ticketId,
  ticketRevision,
  operationDigest,
  title,
  description,
  risk,
  effects,
  options,
  expiresAt,
  requester,
  onSelect,
  onDismiss,
  onReconcile,
}: GateApprovalCardProps) {
  if (!enabled) return null

  const priorStatus = state.kind === 'approved' || state.kind === 'denied'
    ? 'submitted'
    : state.kind === 'expired' ? 'expired' : state.kind === 'unknown' ? 'gate-unknown' : undefined
  const receipt = state.kind === 'approved'
    ? { summary: <>Approved · {state.scope} · Decision {state.decisionId}{state.receiptId ? <> · Receipt {state.receiptId}</> : null}</> }
    : state.kind === 'denied'
      ? { summary: <>Denied · Decision {state.decisionId}{state.receiptId ? <> · Receipt {state.receiptId}</> : null}</> }
      : undefined
  const actions: ConfirmationAction[] = options.map((option) => ({
    id: option.id,
    label: option.label,
    primary: option.kind === 'allow',
  }))

  return <ApprovalCard
    title={title}
    description={description}
    risk={risk}
    id={ticketId}
    digest={operationDigest}
    effects={effects}
    expiresAt={expiresAt}
    requester={requester}
    actions={actions}
    priorStatus={priorStatus}
    stale={state.kind === 'stale' || (state.kind === 'pending' && options.length === 0)}
    onReload={onReconcile}
    receipt={receipt}
    onRespond={(outcome) => {
      if (outcome.status === 'canceled') return onDismiss()
      const optionId = outcome.decisions?.[0]?.action
      if (optionId == null || !options.some((option) => option.id === optionId)) return
      return onSelect({ ticketId, ticketRevision, operationDigest, optionId })
    }}
  />
}
