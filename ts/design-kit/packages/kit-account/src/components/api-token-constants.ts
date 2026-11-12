import type { ApiTokenDraft } from './api-token-manager'

/** Closed set. A value outside it (a newer host) renders as "Unknown" with no action. */
export const API_TOKEN_STATUSES = ['active', 'expiring', 'revoked', 'expired'] as const
export type ApiTokenStatus = (typeof API_TOKEN_STATUSES)[number]

export const API_TOKEN_EXPIRIES = [
  { id: '30d', label: 'In 30 days' },
  { id: '90d', label: 'In 90 days' },
  { id: '1y', label: 'In 1 year' },
  { id: 'never', label: 'No expiry (discouraged)' },
] as const
export type ApiTokenExpiry = (typeof API_TOKEN_EXPIRIES)[number]['id']

/** Empty draft with the recommended 90-day expiry. */
export const EMPTY_API_TOKEN_DRAFT: ApiTokenDraft = { name: '', scopes: [], expiry: '90d' }

