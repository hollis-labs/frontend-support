import { createContext, useContext } from 'react'
import type { IdentityClient } from './client'
import type { ChangePasswordInput, IdentityProfile, LoginInput, SetupInput } from './types'

export type IdentityStatus = 'booting' | 'boot-error' | 'setup' | 'signed-out' | 'expired' | 'signed-in'

/** Structurally the same as kit-account's `AccountIdentity`, so it can go straight into `WhoamiBadge`. */
export type IdentityBadge =
  | { readonly state: 'loading' }
  | { readonly state: 'unknown' }
  | { readonly state: 'identified'; readonly displayName: string; readonly source?: string; readonly assurance: 'local' | 'verified' }

export interface IdentityContextValue {
  readonly status: IdentityStatus
  /** Set after setup or sign-in. Null after a reload: the server has no route that returns the caller. */
  readonly profile: IdentityProfile | null
  readonly bootError: string | null
  /** The caller's scopes when the profile is known (after sign-in or setup); null after a reload. Pages use it to pre-empt denied. */
  readonly scopes: readonly string[] | null
  readonly badge: IdentityBadge
  readonly client: IdentityClient
  /** Re-run the boot check (setup state, then session). */
  readonly retryBoot: () => void
  /** Each rejects with an `IdentityError`; the form shows `errorMessage(error)`. */
  readonly setup: (input: SetupInput) => Promise<void>
  readonly signIn: (input: LoginInput) => Promise<void>
  readonly signOut: () => Promise<void>
  readonly changePassword: (input: ChangePasswordInput) => Promise<void>
  /** Move to the sign-in form (for example after a 409 on setup). */
  readonly showSignIn: () => void
}

export const IdentityContext = createContext<IdentityContextValue | null>(null)

export function useIdentity(): IdentityContextValue {
  const value = useContext(IdentityContext)
  if (value === null) throw new Error('useIdentity must be used inside <IdentityProvider>.')
  return value
}
