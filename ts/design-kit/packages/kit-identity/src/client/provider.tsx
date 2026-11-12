import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createIdentityClient } from './client'
import type { IdentityClientOptions } from './client'
import { errorMessage } from './errors'
import { IdentityContext } from './identity-context'
import type { IdentityContextValue, IdentityStatus } from './identity-context'
import type { IdentityProfile } from './types'


export interface IdentityProviderProps {
  readonly options?: IdentityClientOptions
  readonly children: ReactNode
}

export function IdentityProvider({ options, children }: IdentityProviderProps) {
  const [status, setStatus] = useState<IdentityStatus>('booting')
  const [profile, setProfile] = useState<IdentityProfile | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // `options` are read once. The session-ended callback is the provider's (the options' own runs after it).
  const [client] = useState(() => createIdentityClient({
    ...options,
    onUnauthorized: () => {
      setProfile(null)
      setStatus((current) => (current === 'signed-in' ? 'expired' : current))
      options?.onUnauthorized?.()
    },
  }))

  useEffect(() => {
    let live = true
    client.setupState().then(
      (state) => (state.required ? (state.overHttp ? 'setup' : 'setup-offline') : client.hasSession().then((has) => (has ? 'signed-in' : 'signed-out'))),
    ).then(
      (next) => { if (live) { setBootError(null); setStatus(next as IdentityStatus) } },
      (error: unknown) => { if (live) { setBootError(errorMessage(error)); setStatus('boot-error') } },
    )
    return () => { live = false }
  }, [client, attempt])

  const retryBoot = useCallback(() => { setStatus('booting'); setAttempt((n) => n + 1) }, [])
  const establish = useCallback((next: IdentityProfile) => { setProfile(next); setStatus('signed-in') }, [])

  const value = useMemo<IdentityContextValue>(() => ({
    status,
    profile,
    bootError,
    scopes: profile?.scopes ?? null,
    client,
    retryBoot,
    badge: status === 'booting' ? { state: 'loading' }
      : status === 'signed-in' && profile ? { state: 'identified', displayName: profile.display_name || profile.username, source: profile.display_name && profile.display_name !== profile.username ? profile.username : undefined, assurance: profile.assurance === 'verified' ? 'verified' : 'local' }
        : { state: 'unknown' },
    setup: async (input) => establish(await client.setup(input)),
    signIn: async (input) => establish(await client.login(input)),
    signOut: async () => {
      await client.logout()
      setProfile(null)
      setStatus('signed-out')
    },
    changePassword: (input) => client.changePassword(input),
    showSetupOffline: () => setStatus('setup-offline'),
    showSignIn: () => setStatus('signed-out'),
  }), [status, profile, bootError, client, retryBoot, establish])

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}
