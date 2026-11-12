import { useId, useState } from 'react'
import { relativeTime } from './token-time'
import { API_TOKEN_EXPIRIES, API_TOKEN_STATUSES } from './api-token-constants'
import type { ApiTokenExpiry, ApiTokenStatus } from './api-token-constants'
import type { ReactNode } from 'react'
import { Button, Callout, Checkbox, ConfirmDialog, FormDialog, Input, Pill } from '@hollis-labs/design-components'

/** Display metadata only. Never put the token value/prefix/hash in this model. */
export interface ApiTokenRecord {
  readonly id: string
  readonly name: string
  readonly scopes: readonly string[]
  readonly status: ApiTokenStatus
  /** ISO 8601 timestamps. Missing or unparseable values render as unknown, never raw. */
  readonly createdAt: string
  readonly expiresAt?: string
  /** Absent means the token has never been used. */
  readonly lastUsedAt?: string
  readonly canRevoke: boolean
  /** Shown instead of a Revoke action when `canRevoke` is false on a revocable token. */
  readonly revokeDeniedReason?: ReactNode
  readonly detail?: ReactNode
}

export interface ApiTokenDraft {
  readonly name: string
  readonly scopes: readonly string[]
  readonly expiry: ApiTokenExpiry
}

export interface ApiTokenScope {
  readonly id: string
  readonly label: string
  readonly description?: ReactNode
}

/** Wording overrides so a host can say "key" (or anything else) instead of "token". Every field is optional. */
export interface ApiTokenLabels {
  /** Section heading. Default "API tokens". */
  readonly title?: string
  /** Create button. Default "Create token". */
  readonly createLabel?: string
  /** Create button while submitting. Default "Creating token…". */
  readonly creatingLabel?: string
  /** Create dialog title. Default "Create API token". */
  readonly dialogTitle?: string
  /** Create dialog description. Default "The token is shown once after it is created." */
  readonly dialogDescription?: string
  /** Name field label. Default "Token name". */
  readonly nameLabel?: string
  /** Empty state. Default "No API tokens." */
  readonly emptyLabel?: string
  /** Loading text. Default "Loading tokens…". */
  readonly loadingLabel?: string
  /** Revoke confirm button. Default "Revoke token". */
  readonly revokeConfirmLabel?: string
  /** Shown while creation is not allowed and no `createDeniedReason` is given. */
  readonly createDeniedLabel?: string
  /** Shown beside a revoke the caller may not perform when the record has no reason. */
  readonly revokeDeniedLabel?: string
}

export interface ApiTokenManagerProps {
  readonly tokens: readonly ApiTokenRecord[]
  readonly scopeOptions: readonly ApiTokenScope[]
  readonly draft: ApiTokenDraft
  readonly onDraftChange: (draft: ApiTokenDraft) => void
  readonly onCreate: (draft: ApiTokenDraft) => void
  readonly canCreate: boolean
  /** Why creation is unavailable; shown while `canCreate` is false. */
  readonly createDeniedReason?: ReactNode
  readonly createOpen: boolean
  readonly onCreateOpenChange: (open: boolean) => void
  /** Reference time for relative dates (epoch ms). Defaults to the current time. */
  readonly now?: number
  readonly creating?: boolean
  readonly loading?: boolean
  /** Sanitized host message; raw transport errors may contain credentials. */
  readonly error?: ReactNode
  readonly revokeTargetId: string | null
  readonly onRevokeTargetChange: (id: string | null) => void
  readonly onRevoke: (id: string) => void
  readonly revoking?: boolean
  readonly revokeError?: ReactNode
  /** Rendered inside the create dialog under the scope list, for hosts with free-form scopes (for example an "add a scope" field). */
  readonly scopeSlot?: ReactNode
  /** Wording overrides; defaults keep the "token" vocabulary. */
  readonly labels?: ApiTokenLabels
  /** Sanitized create failure, announced inside the create dialog so the draft stays on screen. */
  readonly createError?: ReactNode
}

const STATUS_LABEL: Record<ApiTokenStatus, string> = { active: 'Active', expiring: 'Expiring', revoked: 'Revoked', expired: 'Expired' }

function isStatus(value: string): value is ApiTokenStatus {
  return (API_TOKEN_STATUSES as readonly string[]).includes(value)
}

function statusLabel(token: ApiTokenRecord, now: number): string {
  if (!isStatus(token.status)) return 'Unknown'
  if (token.status === 'expiring') {
    const when = relativeTime(token.expiresAt, now)
    return when ? `Expires ${when}` : STATUS_LABEL.expiring
  }
  return STATUS_LABEL[token.status]
}

function activity(token: ApiTokenRecord, now: number): string {
  const created = relativeTime(token.createdAt, now)
  const parts = [token.scopes.join(', ') || 'No scopes', created ? `Created ${created}` : 'Created unknown']
  if (token.lastUsedAt === undefined) parts.push('Never used')
  else parts.push(`Used ${relativeTime(token.lastUsedAt, now) ?? 'unknown'}`)
  if (token.status !== 'expiring' && token.expiresAt !== undefined) {
    const when = relativeTime(token.expiresAt, now)
    parts.push(when ? `${token.status === 'expired' ? 'Expired' : 'Expires'} ${when}` : 'Expiry unknown')
  }
  return parts.join(' · ')
}

export function ApiTokenManager({ tokens, scopeOptions, draft, onDraftChange, onCreate, canCreate, createDeniedReason, createOpen, onCreateOpenChange, now, creating = false, loading = false, error, revokeTargetId, onRevokeTargetChange, onRevoke, revoking = false, revokeError, scopeSlot, labels, createError }: ApiTokenManagerProps) {
  const id = useId()
  const text = { title: 'API tokens', createLabel: 'Create token', creatingLabel: 'Creating token…', dialogTitle: 'Create API token', dialogDescription: 'The token is shown once after it is created.', nameLabel: 'Token name', emptyLabel: 'No API tokens.', loadingLabel: 'Loading tokens…', revokeConfirmLabel: 'Revoke token', createDeniedLabel: 'You do not have permission to create API tokens.', revokeDeniedLabel: 'You do not have permission to revoke this token.', ...labels }
  const [mounted] = useState(() => Date.now())
  const at = now ?? mounted
  const target = tokens.find((token) => token.id === revokeTargetId && isRevocable(token) && token.canRevoke)
  const blocked = loading || creating || !canCreate
  const validScopes = draft.scopes.length > 0 && draft.scopes.every((scope) => scopeOptions.some((option) => option.id === scope))
  const validExpiry = API_TOKEN_EXPIRIES.some((option) => option.id === draft.expiry)
  const canSubmit = !blocked && draft.name.trim() !== '' && validScopes && validExpiry
  return (
    <section aria-labelledby={`${id}-title`} aria-busy={loading} className="flex min-w-0 flex-col gap-4 rounded-panel border border-border bg-bg-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="text-control font-semibold text-fg">{text.title}</h2>
        <Button type="button" size="sm" disabled={blocked} aria-describedby={canCreate ? undefined : `${id}-create-denied`} onClick={() => onCreateOpenChange(true)}>{text.createLabel}</Button>
      </div>
      {!canCreate ? <p id={`${id}-create-denied`} className="text-caption text-fg-muted">{createDeniedReason ?? text.createDeniedLabel}</p> : null}
      {loading ? <div role="status" className="text-control text-fg-muted">{text.loadingLabel}</div> : null}
      {error ? <div role="alert" className="text-control text-danger">{error}</div> : null}
      <ul className="flex min-w-0 flex-col gap-3">
        {tokens.map((token, index) => {
          const known = isStatus(token.status)
          const deniedId = `${id}-denied-${index}`
          const denied = isRevocable(token) && !token.canRevoke
          return (
            <li key={token.id} className="flex min-w-0 flex-col gap-2 border-b border-divider pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <div className="text-control text-fg">{token.name}</div>
                <div className="text-caption text-fg-muted">{activity(token, at)}</div>
                {denied ? <div id={deniedId} className="text-caption text-fg-muted">{token.revokeDeniedReason ?? text.revokeDeniedLabel}</div> : null}
                {token.detail ? <div className="text-caption text-fg-muted">{token.detail}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Pill tone={token.status === 'active' ? 'success' : known && token.status === 'expiring' ? 'warning' : 'neutral'}>{statusLabel(token, at)}</Pill>
                {isRevocable(token) ? <Button type="button" variant="outline" size="sm" aria-label={`Revoke ${token.name}`} aria-describedby={denied ? deniedId : undefined} disabled={loading || revoking || !token.canRevoke} onClick={() => onRevokeTargetChange(token.id)}>Revoke…</Button> : null}
              </div>
            </li>
          )
        })}
      </ul>
      {!loading && !error && tokens.length === 0 ? <p className="text-control text-fg-muted">{text.emptyLabel}</p> : null}
      <FormDialog open={createOpen && canCreate} onClose={() => onCreateOpenChange(false)} title={text.dialogTitle} description={text.dialogDescription} submitLabel={creating ? text.creatingLabel : text.createLabel} submitting={creating} submitDisabled={!canSubmit}
        onSubmit={() => { if (canSubmit) onCreate(draft) }}>
        {createError ? <Callout tone="danger">{createError}</Callout> : null}
        <label htmlFor={`${id}-name`} className="block text-label text-fg-secondary">{text.nameLabel}</label>
        <Input id={`${id}-name`} value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} required disabled={blocked} autoComplete="off" className="text-control md:text-control text-fg" />
        <fieldset disabled={blocked} className="flex flex-col gap-2">
          <legend className="mb-2 text-label text-fg-secondary">Scopes</legend>
          {scopeOptions.map((scope, index) => (
            <div key={scope.id} className="flex items-start gap-2">
              <Checkbox id={`${id}-scope-${index}`} checked={draft.scopes.includes(scope.id)} disabled={blocked} onCheckedChange={(checked) => onDraftChange({ ...draft, scopes: checked ? [...new Set([...draft.scopes, scope.id])] : draft.scopes.filter((value) => value !== scope.id) })} aria-describedby={scope.description ? `${id}-description-${index}` : undefined} />
              <div className="min-w-0">
                <label htmlFor={`${id}-scope-${index}`} className="text-control text-fg">{scope.label}</label>
                {scope.description ? <div id={`${id}-description-${index}`} className="text-caption text-fg-muted">{scope.description}</div> : null}
              </div>
            </div>
          ))}
        </fieldset>
        {scopeSlot}
        <p className="text-caption text-fg-muted">Choose at least one available scope. The host enforces access permissions.</p>
        {!validScopes && draft.scopes.length > 0 ? <div role="alert" className="flex flex-col items-start gap-2 text-control text-danger">
          <span>Some selected scopes are unavailable. Choose current scopes.</span>
          <Button type="button" variant="ghost" size="sm" disabled={blocked} onClick={() => onDraftChange({ ...draft, scopes: draft.scopes.filter((scope) => scopeOptions.some((option) => option.id === scope)) })}>Clear unavailable scopes</Button>
        </div> : null}
        <label htmlFor={`${id}-expiry`} className="block text-label text-fg-secondary">Expires</label>
        <select id={`${id}-expiry`} value={draft.expiry} disabled={blocked} aria-describedby={`${id}-expiry-hint`} onChange={(event) => onDraftChange({ ...draft, expiry: event.target.value as ApiTokenExpiry })} className="h-9 w-full rounded-control border border-border bg-bg-elevated px-2 text-control text-fg">
          {API_TOKEN_EXPIRIES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <p id={`${id}-expiry-hint`} className={draft.expiry === 'never' ? 'text-caption text-warning' : 'text-caption text-fg-muted'}>Keys without expiry are discouraged.</p>
      </FormDialog>
      <ConfirmDialog open={target !== undefined} onOpenChange={(open) => { if (!open && !revoking) onRevokeTargetChange(null) }} title={`Revoke \u201c${target?.name ?? ''}\u201d?`}
        description={<span className="block [overflow-wrap:anywhere]">Anything using this key stops working immediately. This cannot be undone.{revokeError ? <span role="alert" className="mt-2 block text-danger">{revokeError}</span> : null}</span>}
        confirmLabel={text.revokeConfirmLabel} busy={loading || revoking} onConfirm={() => { if (target && !loading && !revoking) onRevoke(target.id) }} />
    </section>
  )
}

function isRevocable(token: ApiTokenRecord): boolean {
  return token.status === 'active' || token.status === 'expiring'
}
