/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/confirmation.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/confirmation.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: subordinate content slots inside existing ConfirmationCard, no second card/actions; no AI SDK; opaque host-selected action IDs, host-supplied accepted/rejected content; phrasing title span; tokens.
 */
import { cn } from '@hollis-labs/design-components'
import { type ComponentProps, type ReactNode } from 'react'
import { useConfirmationCard } from '../lib/confirmation-context'

export type ConfirmationTitleProps = ComponentProps<'span'>
export function ConfirmationTitle({ className, ...props }: ConfirmationTitleProps) {
  useConfirmationCard()
  return <span className={cn('inline text-control', className)} {...props} />
}
export interface ConfirmationRequestProps { children?: ReactNode }
export function ConfirmationRequest({ children }: ConfirmationRequestProps) {
  const { state } = useConfirmationCard()
  return state.kind === 'open' ? children : null
}
/** Host selects the action to match; the slot never interprets action names. */
export interface ConfirmationAcceptedProps { actionId: string; children?: ReactNode }
export function ConfirmationAccepted({ actionId, children }: ConfirmationAcceptedProps) {
  const { state, priorActionId } = useConfirmationCard()
  return state.kind === 'submitted' && priorActionId === actionId ? children : null
}
export interface ConfirmationRejectedProps { actionId: string; children?: ReactNode }
export function ConfirmationRejected({ actionId, children }: ConfirmationRejectedProps) {
  const { state, priorActionId } = useConfirmationCard()
  return state.kind === 'submitted' && priorActionId === actionId ? children : null
}
