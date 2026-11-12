import { useId } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@hollis-labs/design-components'
import { SIGN_IN_REASONS } from './session-constants'
import type { SignInReason } from './session-constants'


export interface SignInRequiredProps {
  readonly reason: SignInReason
  /** How to sign in, written by the host. The kit assumes no form, password or redirect: a one-time link is as valid as a login page. */
  readonly instruction?: ReactNode
  /** Host-owned retry (re-check the session, resend a link). Omitted means no retry action. */
  readonly onRetry?: () => void
  readonly retrying?: boolean
}

const COPY: Record<SignInReason, { title: string; body: string }> = {
  'signed-out': { title: 'Sign in required', body: 'You need to sign in to see this.' },
  expired: { title: 'Session expired', body: 'Your session has ended. Sign in again to continue.' },
  denied: { title: 'Access denied', body: 'Your account does not have access to this.' },
}

function isReason(value: string): value is SignInReason {
  return (SIGN_IN_REASONS as readonly string[]).includes(value)
}

/** Flow-agnostic: states what happened and renders the host's instruction. An unknown reason is neutral and never echoed. */
export function SignInRequired({ reason, instruction, onRetry, retrying = false }: SignInRequiredProps) {
  const id = useId()
  const copy = isReason(reason) ? COPY[reason] : { title: 'Sign in unavailable', body: 'This view cannot be shown right now.' }
  return (
    <section aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} data-reason={isReason(reason) ? reason : 'unknown'}
      className="flex min-w-0 flex-col items-start gap-3 rounded-panel border border-border bg-bg-elevated p-4">
      <h2 id={`${id}-title`} className="text-control font-semibold text-fg">{copy.title}</h2>
      <p id={`${id}-body`} role={reason === 'expired' ? 'alert' : undefined} className="text-control text-fg-secondary">{copy.body}</p>
      {instruction ? <div className="text-control text-fg">{instruction}</div> : null}
      {onRetry ? <Button type="button" variant="outline" size="sm" disabled={retrying} onClick={() => onRetry()}>{retrying ? 'Trying again…' : 'Try again'}</Button> : null}
    </section>
  )
}

/** The expired-session state; `SignInRequired` with the reason fixed. */
export function SessionExpired(props: Omit<SignInRequiredProps, 'reason'>) {
  return <SignInRequired {...props} reason="expired" />
}
