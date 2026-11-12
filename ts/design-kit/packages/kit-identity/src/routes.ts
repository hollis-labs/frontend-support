import type { ComponentType } from 'react'
import { AccountSecurityPage } from './components/account-security-page'
import { ApiKeysPage } from './components/api-keys-page'
import { PairingCodesPage } from './components/pairing-codes-page'
import { SessionsPage } from './components/sessions-page'
import { SignOutPage } from './components/sign-out'

export interface IdentityRoute {
  readonly path: string
  /** User-menu / navigation label. */
  readonly label: string
  /** Capability the app's nav item should require, or null for any signed-in user. `{app}` is the app's own scope prefix. */
  readonly requires: string | null
}

/**
 * The in-shell surface, in one place so an app's `ui.json` can be checked against it. Sign-in, setup and boot have no
 * route: `IdentityGate` renders them outside the shell. Sign out is an action (`SignOutButton`); `signOut` is the
 * fallback footer page for a shell with no user-menu slot. The pages also render the denied state on a 403, so a stale
 * nav item never exposes a control.
 */
export const IDENTITY_ROUTES = {
  account: { path: '/identity/account', label: 'Account security', requires: null },
  keys: { path: '/identity/keys', label: 'Access keys', requires: '{app}.admin' },
  pairing: { path: '/identity/pairing', label: 'Pairing codes', requires: '{app}.admin' },
  /** Contribute this nav item only once the package version that ships the page is pinned. */
  sessions: { path: '/identity/sessions', label: 'Active sessions', requires: null },
  signOut: { path: '/identity/sign-out', label: 'Sign out', requires: null },
} as const satisfies Record<string, IdentityRoute>

export type IdentityRouteId = keyof typeof IDENTITY_ROUTES

/** The page for each route id. Props are optional on every page. */
export const IDENTITY_PAGES: Record<IdentityRouteId, ComponentType> = {
  account: AccountSecurityPage,
  keys: ApiKeysPage,
  pairing: PairingCodesPage,
  sessions: SessionsPage,
  signOut: SignOutPage,
}
