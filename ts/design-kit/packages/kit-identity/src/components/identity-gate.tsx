import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@hollis-labs/design-components'
import { useIdentity } from '../client/identity-context'
import { IdentityError, errorMessage } from '../client/errors'
import type { LoginInput, SetupInput } from '../client/types'
import { AuthLayout, BootScreen } from './auth-layout'
import { FormMessage } from './field'
import { SetupOfflineScreen } from './setup-offline-screen'
import { SetupScreen } from './setup-screen'
import { SignInScreen } from './sign-in-screen'

export interface IdentityGateProps {
  /** The app shell. Mounted only while a session is established. */
  readonly children: ReactNode
  /** Branding (logo, tagline) shown above the card on every gate screen. */
  readonly story?: ReactNode
  /** The app's command name, shown in the offline-setup instruction (`<app> identity setup`). */
  readonly appName?: string
}

/** Wraps the app: boot, first-run setup and sign-in outside the shell; children only when signed in. */
export function IdentityGate({ children, story, appName }: IdentityGateProps) {
  const identity = useIdentity()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (failure) {
      if (failure instanceof IdentityError && failure.code === 'setup_closed') {
        identity.showSignIn()
        setNotice('Setup is already complete. Sign in with your account.')
      } else if (failure instanceof IdentityError && failure.code === 'setup_offline') identity.showSetupOffline()
      else setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  switch (identity.status) {
    case 'booting':
      return <BootScreen story={story} />
    case 'boot-error':
      return (
        <AuthLayout title="Unable to start" story={story}>
          <FormMessage tone="error">{identity.bootError}</FormMessage>
          <Button type="button" variant="outline" onClick={identity.retryBoot}>Try again</Button>
        </AuthLayout>
      )
    case 'setup':
      return <SetupScreen story={story} busy={busy} error={error} onSubmit={(input: SetupInput) => void run(() => identity.setup(input))} />
    case 'setup-offline':
      return <SetupOfflineScreen story={story} appName={appName} />
    case 'signed-in':
      return <>{children}</>
    default:
      return (
        <SignInScreen story={story} busy={busy} error={error} notice={notice} expired={identity.status === 'expired'}
          onSubmit={(input: LoginInput) => void run(() => identity.signIn(input))} />
      )
  }
}
