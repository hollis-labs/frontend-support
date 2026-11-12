import { useState } from 'react'
import { ApiTokenManager, EMPTY_API_TOKEN_DRAFT, NewTokenDisclosure, SignInRequired } from '@hollis-labs/kit-account'
import type { ApiTokenDraft } from '@hollis-labs/kit-account'
import { Button } from '@hollis-labs/design-components'
import { useIdentity } from '../client/identity-context'
import { errorMessage, isDenied } from '../client/errors'
import { ScopeAdder } from './scopes'
import { TTL_HOURS, toTokenRecord } from './token-record'
import { useScopeOptions } from './use-scope-options'
import { useLoad } from './use-load'

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
        // The manager has no in-dialog error slot: close it so the message shows, draft retained.
        setCreateError(errorMessage(failure))
        setCreateOpen(false)
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
  const error = keys.error ?? createError
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ApiTokenManager tokens={(keys.data ?? []).map((credential) => toTokenRecord(credential, at))} scopeOptions={scopes.options}
        draft={draft} onDraftChange={setDraft} onCreate={(value) => void create(value)} canCreate createOpen={createOpen} onCreateOpenChange={(open) => { setCreateOpen(open); if (open) setCreateError(null) }}
        now={now} scopeSlot={<ScopeAdder onAdd={addScope} disabled={creating} />} creating={creating} loading={keys.loading} error={error}
        revokeTargetId={revokeTarget} onRevokeTargetChange={(id) => { setRevokeTarget(id); setRevokeError(null) }} onRevoke={(id) => void revoke(id)} revoking={revoking} revokeError={revokeError} />
      {keys.error ? <Button type="button" variant="outline" size="sm" className="self-start" onClick={keys.reload}>Try again</Button> : null}
      <NewTokenDisclosure value={secret} onDismiss={dismiss} onCopy={copy} copied={copied} />
    </div>
  )
}
