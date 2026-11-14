import { useState } from 'react'
import { Button } from '@hollis-labs/design-components'
import { useIdentity } from '../client/identity-context'
import { errorMessage } from '../client/errors'
import { FormMessage } from './field'

export interface SignOutButtonProps {
  readonly label?: string
  readonly variant?: 'default' | 'outline' | 'ghost'
}

export function SignOutButton({ label = 'Sign out', variant = 'outline' }: SignOutButtonProps) {
  const identity = useIdentity()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signOut = async () => {
    setBusy(true)
    setError(null)
    try {
      await identity.signOut()
    } catch (failure) {
      setError(errorMessage(failure))
      setBusy(false)
    }
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant={variant} size="sm" disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : label}</Button>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
    </span>
  )
}

/** In-shell page for apps whose shell has no user menu yet. Names the signed-in person when the profile is known. */
export function SignOutPage() {
  const { badge } = useIdentity()
  const who = badge.state === 'identified' ? badge.displayName : null
  return (
    <section aria-labelledby="identity-signout-title" className="flex min-w-0 flex-col items-start gap-3 rounded-panel border border-border bg-bg-elevated p-4">
      <h2 id="identity-signout-title" className="text-control font-semibold text-fg">Sign out</h2>
      {who ? <p className="text-control text-fg">Signed in as <span className="font-semibold [overflow-wrap:anywhere]">{who}</span>.</p> : null}
      <p className="text-control text-fg-secondary">End this session on this device. You will need your password to come back.</p>
      <SignOutButton />
    </section>
  )
}
