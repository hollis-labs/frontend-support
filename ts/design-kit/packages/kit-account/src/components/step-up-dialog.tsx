import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Button, DetailDialog } from '@hollis-labs/design-components'
import type { StepUpStatus } from './session-constants'


export interface StepUpDialogProps {
  readonly open: boolean
  /** The S0.3 Confirm fields: what the action does, what it touches, how long the grant lives, who is asking. */
  readonly what: string
  readonly scope: readonly string[]
  readonly ttlMs: number
  readonly who?: string
  readonly onConfirm: () => void
  /** Cancel button, Esc and the close control all call this. */
  readonly onCancel: () => void
  /** `granting` disables Confirm while the host mints the grant; `failed` shows `error` and allows another try. */
  readonly status?: StepUpStatus
  /** Sanitized host message shown when `status` is `failed`. */
  readonly error?: ReactNode
}

function expiry(ttlMs: number): string {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return 'for a short time'
  const seconds = Math.round(ttlMs / 1000)
  if (seconds < 120) return `for ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`
  const minutes = Math.round(seconds / 60)
  return `for ${minutes} minutes`
}

/**
 * Controlled step-up confirmation, shaped like the action gateway's `needs_confirmation` payload.
 * The host decides when it is open and what confirming means; the kit holds no state and sees no grant.
 */
export function StepUpDialog({ open, what, scope, ttlMs, who, onConfirm, onCancel, status = 'idle', error }: StepUpDialogProps) {
  const id = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const granting = status === 'granting'
  return (
    <DetailDialog open={open} onClose={onCancel} title="Confirm your identity" initialFocus={cancelRef}
      footer={<>
        <Button ref={cancelRef} type="button" variant="ghost" onClick={() => onCancel()}>Cancel</Button>
        <Button type="button" disabled={granting} aria-busy={granting} onClick={() => onConfirm()}>{granting ? 'Confirming…' : 'Confirm'}</Button>
      </>}>
      <div className="flex min-w-0 flex-col gap-3 px-4 py-3">
        <p className="text-control text-fg-secondary">This change needs a fresh confirmation. Nothing happens until you confirm.</p>
        <dl className="flex min-w-0 flex-col gap-3">
          {who ? <div><dt className="text-label text-fg-faint">Who</dt><dd className="text-control text-fg [overflow-wrap:anywhere]">{who}</dd></div> : null}
          <div><dt className="text-label text-fg-faint">What</dt><dd className="text-control text-fg [overflow-wrap:anywhere]">{what}</dd></div>
          <div>
            <dt id={`${id}-scope`} className="text-label text-fg-faint">Scope</dt>
            <dd><ul aria-labelledby={`${id}-scope`} className="flex flex-wrap gap-1">{scope.map((item) => <li key={item} className="rounded-control border border-border px-2 text-caption text-fg [overflow-wrap:anywhere]">{item}</li>)}</ul></dd>
          </div>
          <div><dt className="text-label text-fg-faint">Expires</dt><dd className="text-control text-fg-muted">The grant is valid {expiry(ttlMs)} after you confirm.</dd></div>
        </dl>
        {status === 'failed' ? <div role="alert" className="text-control text-danger">{error ?? 'Could not confirm. Try again.'}</div> : null}
      </div>
    </DetailDialog>
  )
}
