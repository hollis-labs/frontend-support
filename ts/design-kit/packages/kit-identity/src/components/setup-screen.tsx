import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '@hollis-labs/design-components'
import { AuthLayout } from './auth-layout'
import { Field, FormMessage } from './field'
import type { SetupInput } from '../client/types'

export interface SetupScreenProps {
  readonly onSubmit: (input: SetupInput) => void
  readonly busy?: boolean
  /** Sanitized message (server message or host text). */
  readonly error?: ReactNode
  readonly story?: ReactNode
  /** Server policy lives server-side (default 12 characters, 72 bytes); this is only guidance. */
  readonly passwordHint?: string
}

export function SetupScreen({ onSubmit, busy = false, error, story, passwordHint = 'Use a long password. The server states the minimum if yours is too short.' }: SetupScreenProps) {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm !== '' && confirm !== password
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (busy || mismatch) return
    onSubmit({ display_name: displayName.trim(), username: username.trim(), password })
  }
  return (
    <AuthLayout title="Set up your account" description="Create the owner account for this app. This screen only appears the first time." story={story}>
      <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
          <Field label="Display name" value={displayName} onChange={setDisplayName} autoComplete="name" />
          <Field label="Username" value={username} onChange={setUsername} autoComplete="username" />
          <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" hint={passwordHint} />
          <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={mismatch} />
        </fieldset>
        {mismatch ? <FormMessage tone="error">The passwords do not match.</FormMessage> : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" disabled={busy || mismatch || password === '' || confirm === ''}>{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </AuthLayout>
  )
}
