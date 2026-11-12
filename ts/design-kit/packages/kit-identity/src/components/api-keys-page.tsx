import { useState } from 'react'
import { ApiTokenManager, EMPTY_API_TOKEN_DRAFT, NewTokenDisclosure, SignInRequired } from '@hollis-labs/kit-account'
import type { ApiTokenDraft, ApiTokenLabels } from '@hollis-labs/kit-account'
import { Button } from '@hollis-labs/design-components'
import { useIdentity } from '../client/identity-context'
import { errorMessage, isDenied } from '../client/errors'
import { ScopeAdder } from './scopes'
import { TTL_HOURS, toTokenRecord } from './token-record'
import { useScopeOptions } from './use-scope-options'
import { useLoad } from './use-load'

const KEY_LABELS: ApiTokenLabels = {
  title: 'Access keys',
  createLabel: 'Create key',
  creatingLabel: 'Creating key…',
  dialogTitle: 'Create access key',
  dialogDescription: 'The key is shown once after it is created.',
  nameLabel: 'Key name',
  emptyLabel: 'No access keys.',
  loadingLabel: 'Loading keys…',
  revokeConfirmLabel: 'Revoke key',
  createDeniedLabel: 'You do not have permission to create access keys.',
  revokeDeniedLabel: 'You do not have permission to revoke this key.',
}

export interface ApiKeysPageProps {
  /** Extra scope names to offer next to the caller's own (the server publishes no catalogue). */
  readonly scopeSuggestions?: readonly string[]
  /** Reference time for relative dates (epoch ms). */
  readonly now?: number
}

/** In-shell page over `GET/POST /keys` and `DELETE /keys/{id}`. Needs `<app>.admin`; without it the list is the denied state. */
export function ApiKeysPage({ scopeSuggestions, now }: ApiKeysPageProps) {
  const { client } = useIdentity()
  const [mounted] = useState(() => Date.now())
  const at = now ?? mounted
  const keys = useLoad(() => client.listKeys())
  const scopes = useScopeOptions(scopeSuggestions)
  const [draft, setDraft] = useState<ApiTokenDraft>(EMPTY_API_TOKEN_DRAFT)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  if (keys.denied || denied) return <SignInRequired reason="denied" />

  const create = async (value: ApiTokenDraft) => {
    setCreating(true)
    setCreateError(null)
    try {
      const created = await client.createKey({ name: value.name.trim(), scopes: value.scopes, ttl_hours: TTL_HOURS[value.expiry] })
      setSecret(created.key)
      setCopied(false)
      setDraft(EMPTY_API_TOKEN_DRAFT)
      setCreateOpen(false)
      keys.reload()
    } catch (failure) {
      if (isDenied(failure)) setDenied(true)
      else {
        // Dialog stays open with the draft; the message shows inside it.
        setCreateError(errorMessage(failure))
      }
    } finally {
      setCreating(false)
    }
  }
  const revoke = async (id: string) => {
    setRevoking(true)
    setRevokeError(null)
    try {
      await client.revokeKey(id)
      setRevokeTarget(null)
      keys.reload()
    } catch (failure) {
      if (isDenied(failure)) setDenied(true)
      else setRevokeError(errorMessage(failure))
    } finally {
      setRevoking(false)
    }
  }
  const addScope = (scope: string): boolean => {
    const ok = scopes.add(scope)
    if (ok) setDraft((current) => ({ ...current, scopes: [...new Set([...current.scopes, scope.trim()])] }))
    return ok
  }
  const dismiss = () => { setSecret(null); setCopied(false) }
  const copy = () => {
    if (secret === null) return
    navigator.clipboard.writeText(secret).then(() => setCopied(true), () => setCopied(false))
  }
  const error = keys.error
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ApiTokenManager tokens={(keys.data ?? []).map((credential) => toTokenRecord(credential, at))} scopeOptions={scopes.options}
        draft={draft} onDraftChange={setDraft} onCreate={(value) => void create(value)} canCreate createOpen={createOpen} onCreateOpenChange={(open) => { setCreateOpen(open); if (open) setCreateError(null) }}
        now={now} labels={KEY_LABELS} createError={createError} scopeSlot={<ScopeAdder onAdd={addScope} disabled={creating} />} creating={creating} loading={keys.loading} error={error}
        revokeTargetId={revokeTarget} onRevokeTargetChange={(id) => { setRevokeTarget(id); setRevokeError(null) }} onRevoke={(id) => void revoke(id)} revoking={revoking} revokeError={revokeError} />
      {keys.error ? <Button type="button" variant="outline" size="sm" className="self-start" onClick={keys.reload}>Try again</Button> : null}
      <NewTokenDisclosure value={secret} onDismiss={dismiss} onCopy={copy} copied={copied} />
    </div>
  )
}
