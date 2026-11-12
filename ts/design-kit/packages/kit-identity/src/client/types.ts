/** Returned by setup and login. There is no read route for the signed-in caller, so this is only known after one of them. */
export interface IdentityProfile {
  readonly id: string
  readonly username: string
  readonly display_name: string
  readonly email: string
  readonly scopes: readonly string[]
  /** Absent from today's server; the UI treats absent as 'local' and never infers 'verified'. */
  readonly assurance?: 'local' | 'verified'
}

export interface IdentityCredential {
  readonly id: string
  readonly name: string
  readonly scopes: readonly string[]
  readonly audiences?: readonly string[]
  readonly created_by?: string
  readonly created_at: string
  readonly expires_at?: string
  readonly last_used_at?: string
}

export interface CreateKeyInput {
  readonly name: string
  readonly scopes: readonly string[]
  readonly audiences?: readonly string[]
  /** 0 or absent: no expiry. */
  readonly ttl_hours?: number
}

export interface CreatedKey {
  /** Shown once; only a hash is stored server-side. */
  readonly key: string
  readonly credential: IdentityCredential
}

export interface CreatePairingCodeInput extends CreateKeyInput {
  /** Lifetime of the code in minutes (server default 10, max 1440). */
  readonly ttl_minutes?: number
}

export interface CreatedPairingCode {
  /** Single use, shown once. */
  readonly code: string
  readonly expires_at: string
}

export interface IdentitySession {
  readonly id: string
  readonly user_agent?: string
  readonly created_at: string
  readonly expires_at: string
  readonly last_seen_at: string
  readonly current?: boolean
}

export interface SetupInput {
  readonly display_name: string
  readonly username: string
  readonly password: string
}

export interface LoginInput {
  readonly username: string
  readonly password: string
}

export interface ChangePasswordInput {
  readonly current_password: string
  readonly new_password: string
}
