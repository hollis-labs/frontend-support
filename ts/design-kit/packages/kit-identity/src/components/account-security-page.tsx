import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '@hollis-labs/design-components'
import { WhoamiBadge } from '@hollis-labs/kit-account'
import { useIdentity } from '../client/identity-context'
import { errorMessage } from '../client/errors'
import { Field, FormMessage } from './field'

export interface ChangePasswordFormProps {
  readonly onSubmit: (input: { current: string; next: string }) => void
  readonly busy?: boolean
  readonly error?: ReactNode
  readonly success?: ReactNode
}

/** Presentational. Fields are cleared by the host remounting it (see `AccountSecurityPage`). */
export function ChangePasswordForm({ onSubmit, busy = false, error, success }: ChangePasswordFormProps) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm !== '' && confirm !== next
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!busy && !mismatch) onSubmit({ current, next })
  }
  return (
    <form onSubmit={submit} aria-busy={busy} className="flex max-w-sm min-w-0 flex-col gap-4">
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
        <Field label="Current password" type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
        <Field label="New password" type="password" value={next} onChange={setNext} autoComplete="new-password" hint="The server states the minimum length if this is too short." />
        <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={mismatch} />
      </fieldset>
      {mismatch ? <FormMessage tone="error">The passwords do not match.</FormMessage> : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}
      <Button type="submit" className="self-start" disabled={busy || mismatch || current === '' || next === '' || confirm === ''}>{busy ? 'Updating…' : 'Change password'}</Button>
    </form>
  )
}

/** In-shell page. A wrong current password is a form error, never the session-expired state. */
export function AccountSecurityPage() {
  const identity = useIdentity()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState(0)
  const submit = async ({ current, next }: { current: string; next: string }) => {
    setBusy(true)
    setError(null)
    setSuccess(false)
    try {
      await identity.changePassword({ current_password: current, new_password: next })
      setSuccess(true)
      setForm((n) => n + 1)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <WhoamiBadge identity={identity.badge} />
      <section aria-labelledby="identity-security-title" className="flex min-w-0 flex-col gap-4 rounded-panel border border-border bg-bg-elevated p-4">
        <h2 id="identity-security-title" className="text-control font-semibold text-fg">Change password</h2>
        <ChangePasswordForm key={form} busy={busy} error={error} success={success ? 'Password updated. Your other sessions were signed out.' : undefined} onSubmit={(value) => void submit(value)} />
      </section>
    </div>
  )
}
