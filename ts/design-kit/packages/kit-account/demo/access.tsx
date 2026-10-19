import { useEffect, useRef, useState } from 'react'
import { Button, ConfirmDialog } from '@hollis-labs/design-components'
import { ApiTokenManager, ConnectedAccounts, NewTokenDisclosure } from '@hollis-labs/kit-account'
import type { ApiTokenDraft, ApiTokenRecord, ConnectedAccount } from '@hollis-labs/kit-account'

// All data is synthetic. Operations simulate host providers, not a kit transport.
function AccessHost({ session }: { readonly session: number }) {
  const [tokens, setTokens] = useState<readonly ApiTokenRecord[]>([
    { id: 'seed', name: 'Existing automation', scopes: ['read'], status: 'active', canRevoke: true },
    { id: 'unknown', name: 'Unsupported state', scopes: ['read'], status: 'future-state', canRevoke: true },
  ])
  const [draft, setDraft] = useState<ApiTokenDraft>({ name: '', scopes: [] })
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const [createError, setCreateError] = useState('')
  const [revokeError, setRevokeError] = useState('')
  const [failCreate, setFailCreate] = useState(false)
  const [failRevoke, setFailRevoke] = useState(false)
  const [failConnect, setFailConnect] = useState(false)
  const [accounts, setAccounts] = useState<readonly ConnectedAccount[]>([
    { id: 'mail', provider: 'Mail', status: 'disconnected', canConnect: true, canDisconnect: false },
    { id: 'calendar', provider: 'Calendar', status: 'connected', accountLabel: 'Fixture calendar', canConnect: false, canDisconnect: true },
    { id: 'future', provider: 'Unknown provider', status: 'future-state', canConnect: true, canDisconnect: true },
  ])
  const [connectionError, setConnectionError] = useState('')
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const requests = useRef(new Set<string>())
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const serial = useRef(0)
  useEffect(() => {
    const pending = timers.current
    return () => { pending.forEach(clearTimeout); pending.clear() }
  }, [])
  const later = (key: string, start: () => void, finish: () => void) => {
    if (requests.current.has(key)) return
    requests.current.add(key); start()
    const timer = setTimeout(() => { timers.current.delete(timer); requests.current.delete(key); finish() }, 350)
    timers.current.add(timer)
  }
  const create = (value: ApiTokenDraft) => later('create', () => { setCreating(true); setCreateError(''); setSecret(null); setCopied(false) }, () => {
    setCreating(false)
    if (failCreate) { setCreateError('Fixture creation failed; draft retained.'); return }
    serial.current += 1
    setTokens((rows) => [...rows, { id: `created-${serial.current}`, name: value.name, scopes: value.scopes, status: 'active', canRevoke: true }])
    // Intentionally fake; no real API credential is embedded or requested.
    setSecret('fixture-only-not-a-valid-credential-'.repeat(8))
    setDraft({ name: '', scopes: [] })
  })
  const revoke = (id: string) => later('revoke', () => { setRevoking(true); setRevokeError('') }, () => {
    setRevoking(false)
    if (failRevoke) { setRevokeError('Fixture revoke failed; token remains active.'); return }
    setTokens((rows) => rows.map((row) => row.id === id ? { ...row, status: 'revoked', canRevoke: false } : row))
    setRevokeTarget(null)
  })
  const connect = (id: string) => later(id, () => {
    setConnectionError('')
    setAccounts((rows) => rows.map((row) => row.id === id ? { ...row, status: 'connecting' } : row))
  }, () => {
    if (failConnect) setConnectionError('Fixture provider unavailable; retry connect.')
    setAccounts((rows) => rows.map((row) => row.id === id ? { ...row, status: failConnect ? 'error' : 'connected', canConnect: failConnect, canDisconnect: !failConnect, accountLabel: failConnect ? undefined : 'Fixture mail' } : row))
  })
  const disconnect = () => {
    const id = disconnectTarget
    if (id === null) return
    later(id, () => { setDisconnecting(true); setAccounts((rows) => rows.map((row) => row.id === id ? { ...row, status: 'disconnecting' } : row)) }, () => {
      setDisconnecting(false); setDisconnectTarget(null)
      setAccounts((rows) => rows.map((row) => row.id === id ? { ...row, status: 'disconnected', canConnect: true, canDisconnect: false, accountLabel: undefined } : row))
    })
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 bg-bg p-4 text-fg">
      <span className="text-control">Fixture context {session}</span>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setFailCreate(!failCreate)}>{failCreate ? 'Allow creation' : 'Fail creation'}</Button>
        <Button onClick={() => setFailRevoke(!failRevoke)}>{failRevoke ? 'Allow revocation' : 'Fail revocation'}</Button>
        <Button onClick={() => setFailConnect(!failConnect)}>{failConnect ? 'Allow connection' : 'Fail connection'}</Button>
      </div>
      <NewTokenDisclosure value={secret} onDismiss={() => { setSecret(null); setCopied(false) }} copied={copied} onCopy={() => {
        if (secret !== null) void navigator.clipboard.writeText(secret).then(() => setCopied(true)).catch(() => setCreateError('Copy unavailable; select the token manually.'))
      }} />
      <ApiTokenManager tokens={tokens} scopeOptions={[{ id: 'read', label: 'Read' }, { id: 'write', label: 'Write' }]} draft={draft} onDraftChange={setDraft} onCreate={create} canCreate creating={creating} error={createError}
        revokeTargetId={revokeTarget} onRevokeTargetChange={(id) => { setRevokeTarget(id); setRevokeError('') }} onRevoke={revoke} revoking={revoking} revokeError={revokeError} />
      <ConnectedAccounts accounts={accounts} onConnect={connect} onDisconnect={setDisconnectTarget} error={connectionError} />
      <ConfirmDialog open={disconnectTarget !== null} onOpenChange={(open) => { if (!open && !disconnecting) setDisconnectTarget(null) }} title="Disconnect provider?" description="Host-owned confirmation before disconnecting." confirmLabel="Disconnect provider" onConfirm={disconnect} busy={disconnecting} />
    </main>
  )
}

export function AccountAccessFixture() {
  const [session, setSession] = useState(1)
  return <><Button onClick={() => setSession(session + 1)}>Switch account context</Button><AccessHost key={session} session={session} /></>
}
