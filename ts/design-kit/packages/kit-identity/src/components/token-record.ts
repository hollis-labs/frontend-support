import type { ApiTokenExpiry, ApiTokenRecord } from '@hollis-labs/kit-account'
import type { IdentityCredential } from '../client/types'

export const TTL_HOURS: Record<ApiTokenExpiry, number | undefined> = { '30d': 30 * 24, '90d': 90 * 24, '1y': 365 * 24, never: undefined }
const SOON_MS = 7 * 24 * 3_600_000

/** The list shape has no status field and revoked keys are not listed, so status comes from `expires_at` alone. */
export function toTokenRecord(credential: IdentityCredential, now: number): ApiTokenRecord {
  const expires = credential.expires_at === undefined ? undefined : Date.parse(credential.expires_at)
  const status = expires === undefined || Number.isNaN(expires) ? 'active' : expires <= now ? 'expired' : expires - now <= SOON_MS ? 'expiring' : 'active'
  return { id: credential.id, name: credential.name, scopes: credential.scopes, status, createdAt: credential.created_at, expiresAt: credential.expires_at, lastUsedAt: credential.last_used_at, canRevoke: true }
}
