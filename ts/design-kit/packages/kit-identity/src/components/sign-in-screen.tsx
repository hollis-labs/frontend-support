import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '@hollis-labs/design-components'
import { SessionExpired } from '@hollis-labs/kit-account'
import { AuthLayout } from './auth-layout'
import { Field, FormMessage } from './field'
import type { LoginInput } from '../client/types'

export interface SignInScreenProps {
  readonly onSubmit: (input: LoginInput) => void
  readonly busy?: boolean
  /** Credential or rate-limit message, shown on the form. */
  readonly error?: ReactNode
  /** Neutral notice, for example "Setup is already complete." */
  readonly notice?: ReactNode
  /** Show the session-expired state above the form. */
  readonly expired?: boolean
  readonly story?: ReactNode
}

export function SignInScreen({ onSubmit, busy = false, error, notice, expired = false, story }: SignInScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!busy) onSubmit({ username: username.trim(), password })
  }
  return (
    <AuthLayout title="Sign in" story={story}>
      {expired ? <SessionExpired /> : null}
      <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
          <Field label="Username" value={username} onChange={setUsername} autoComplete="username" />
          <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </fieldset>
        {notice ? <FormMessage tone="notice">{notice}</FormMessage> : null}
        {error ? <FormMessage tone="error" focus>{error}</FormMessage> : null}
        <Button type="submit" disabled={busy || username === '' || password === ''}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthLayout>
  )
}
