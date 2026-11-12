import { GENERIC_ERROR_MESSAGE, IdentityError, NETWORK_ERROR_MESSAGE } from './errors'
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
} from './types'

export interface IdentityPaths {
  readonly setup: string
  readonly login: string
  readonly logout: string
  readonly credentialChange: string
}

/** The identity module serves these under every app. */
export const DEFAULT_IDENTITY_PATHS: IdentityPaths = {
  setup: '/api/setup',
  login: '/api/login',
  logout: '/api/logout',
  credentialChange: '/api/password',
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
  setupRequired(): Promise<boolean>
  setup(input: SetupInput): Promise<IdentityProfile>
  login(input: LoginInput): Promise<IdentityProfile>
  logout(): Promise<void>
  changePassword(input: ChangePasswordInput): Promise<void>
  /** True when a session cookie is accepted. The profile cannot be read back, so this is all a reload can learn. */
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
  const message = typeof flat.message === 'string' && flat.message !== '' ? flat.message : GENERIC_ERROR_MESSAGE
  return new IdentityError(response.status, code, message, flat.details)
}

export function createIdentityClient(options: IdentityClientOptions = {}): IdentityClient {
  const base = options.baseUrl ?? ''
  const identity = options.identityBase ?? '/api/identity'
  const paths: IdentityPaths = { ...DEFAULT_IDENTITY_PATHS, ...options.paths }
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
    async setupRequired() {
      const state = await request<{ setup_required?: boolean }>(paths.setup)
      return state.setup_required === true
    },
    setup: (input) => request<IdentityProfile>(paths.setup, { method: 'POST', body: input }),
    login: (input) => request<IdentityProfile>(paths.login, { method: 'POST', body: input }),
    logout: () => request<void>(paths.logout, { method: 'POST' }),
    changePassword: (input) => request<void>(paths.credentialChange, { method: 'PUT', body: input }),
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
