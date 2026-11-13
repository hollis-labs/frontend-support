import { GENERIC_ERROR_MESSAGE, IdentityError, NETWORK_ERROR_MESSAGE, parseRetryAfter } from './errors'
import type {
  ChangePasswordInput,
  CreateKeyInput,
  CreatePairingCodeInput,
  CreatedKey,
  CreatedPairingCode,
  IdentityCredential,
  IdentityProfile,
  IdentitySession,
  LoginInput,
  SetupInput,
  SetupState,
} from './types'

export interface IdentityPaths {
  readonly setup: string
  readonly login: string
  readonly logout: string
  readonly credentialChange: string
  /** The signed-in caller's profile. Defaults to `<identityBase>/profile`. */
  readonly profile: string
}

/** The identity module serves these under every app. */
export const DEFAULT_IDENTITY_PATHS: IdentityPaths = {
  setup: '/api/setup',
  login: '/api/login',
  logout: '/api/logout',
  credentialChange: '/api/password',
  profile: '/api/identity/profile',
}

export interface IdentityClientOptions {
  /** Prefix for every path; empty for same-origin. */
  readonly baseUrl?: string
  /** Where keys, pairing codes and sessions live. */
  readonly identityBase?: string
  readonly paths?: Partial<IdentityPaths>
  /**
   * Called when a request other than a credential check gets a 401: the session ended.
   * `invalid_login` is a credential error and never calls it.
   */
  readonly onUnauthorized?: () => void
  readonly fetch?: typeof fetch
}

interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  readonly body?: unknown
  /** A 401 is an answer here (the boot probe), not an expired session. */
  readonly quiet401?: boolean
}

export interface IdentityClient {
  /** `overHttp` is false when the host creates the owner offline; an absent field is read as true (older servers). */
  setupState(): Promise<SetupState>
  setup(input: SetupInput): Promise<IdentityProfile>
  login(input: LoginInput): Promise<IdentityProfile>
  logout(): Promise<void>
  changePassword(input: ChangePasswordInput): Promise<void>
  /**
   * The signed-in caller (`GET /api/identity/profile`); `null` on a 401 (signed out), without signalling an expired
   * session. Hosts without the route answer 404 or 403 `route_not_mapped`, which reject as an `IdentityError`.
   */
  readProfile(): Promise<IdentityProfile | null>
  /** True when a session cookie is accepted. The boot fallback for hosts that cannot read the profile back. */
  hasSession(): Promise<boolean>
  listKeys(): Promise<readonly IdentityCredential[]>
  createKey(input: CreateKeyInput): Promise<CreatedKey>
  revokeKey(id: string): Promise<void>
  createPairingCode(input: CreatePairingCodeInput): Promise<CreatedPairingCode>
  listSessions(): Promise<readonly IdentitySession[]>
  revokeSession(id: string): Promise<void>
}

function join(...parts: readonly string[]): string {
  return parts.join('')
}

async function readError(response: Response): Promise<IdentityError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }
  const flat = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const code = typeof flat.code === 'string' && flat.code !== '' ? flat.code : 'unknown'
  const text = [flat.message, flat.error].find((value): value is string => typeof value === 'string' && value !== '')
  const message = text ?? GENERIC_ERROR_MESSAGE
  return new IdentityError(response.status, code, message, flat.details, parseRetryAfter(response.headers.get('Retry-After')))
}

export function createIdentityClient(options: IdentityClientOptions = {}): IdentityClient {
  const base = options.baseUrl ?? ''
  const identity = options.identityBase ?? '/api/identity'
  const paths: IdentityPaths = { ...DEFAULT_IDENTITY_PATHS, profile: join(identity, '/profile'), ...options.paths }
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init))

  async function request<T>(path: string, { method = 'GET', body, quiet401 = false }: RequestOptions = {}): Promise<T> {
    // Sent on every call; only writes need it (cookie-authenticated writes without it are 403 csrf).
    const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    let response: Response
    try {
      response = await doFetch(join(base, path), {
        method,
        headers,
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new IdentityError(0, 'network', NETWORK_ERROR_MESSAGE)
    }
    if (!response.ok) {
      const error = await readError(response)
      if (response.status === 401 && error.code !== 'invalid_login' && !quiet401) options.onUnauthorized?.()
      throw error
    }
    if (response.status === 204) return undefined as T
    try {
      return (await response.json()) as T
    } catch {
      throw new IdentityError(response.status, 'unknown', GENERIC_ERROR_MESSAGE)
    }
  }

  return {
    async setupState() {
      const state = await request<{ setup_required?: boolean; setup_over_http?: boolean }>(paths.setup)
      return { required: state.setup_required === true, overHttp: state.setup_over_http !== false }
    },
    setup: (input) => request<IdentityProfile>(paths.setup, { method: 'POST', body: input }),
    login: (input) => request<IdentityProfile>(paths.login, { method: 'POST', body: input }),
    logout: () => request<void>(paths.logout, { method: 'POST' }),
    changePassword: (input) => request<void>(paths.credentialChange, { method: 'PUT', body: input }),
    async readProfile() {
      try {
        const profile = await request<IdentityProfile>(paths.profile, { quiet401: true })
        return { ...profile, scopes: profile.scopes ?? [] }
      } catch (error) {
        if (error instanceof IdentityError && error.status === 401) return null
        throw error
      }
    },
    async hasSession() {
      try {
        await request(join(identity, '/sessions'), { quiet401: true })
        return true
      } catch (error) {
        if (error instanceof IdentityError && error.status === 401) return false
        throw error
      }
    },
    // The server sends `{"keys": null}` for an empty list.
    async listKeys() {
      return (await request<{ keys: readonly IdentityCredential[] | null }>(join(identity, '/keys'))).keys ?? []
    },
    createKey: (input) => request<CreatedKey>(join(identity, '/keys'), { method: 'POST', body: input }),
    revokeKey: (id) => request<void>(join(identity, '/keys/', encodeURIComponent(id)), { method: 'DELETE' }),
    createPairingCode: (input) => request<CreatedPairingCode>(join(identity, '/pairing-codes'), { method: 'POST', body: input }),
    async listSessions() {
      return (await request<{ sessions: readonly IdentitySession[] | null }>(join(identity, '/sessions'))).sessions ?? []
    },
    revokeSession: (id) => request<void>(join(identity, '/sessions/', encodeURIComponent(id)), { method: 'DELETE' }),
  }
}
