import { useState } from 'react'
import { Button, ConfirmDialog, Pill } from '@hollis-labs/design-components'
import { SignInRequired } from '@hollis-labs/kit-account'
import { useIdentity } from '../client/identity-context'
import { errorMessage } from '../client/errors'
import type { IdentitySession } from '../client/types'
import { FormMessage } from './field'
import { deviceLabel, relativeWhen } from './device'
import { useLoad } from './use-load'

/** Active sessions for the signed-in person. The current session is marked and ends through sign out, not here. */
export function SessionsPage({ now }: { readonly now?: number } = {}) {
  const [mounted] = useState(() => Date.now())
  const at = now ?? mounted
  const when = (iso: string) => relativeWhen(iso, at) ?? 'unknown'
  const { client } = useIdentity()
  const sessions = useLoad(() => client.listSessions())
  const [target, setTarget] = useState<IdentitySession | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (sessions.denied) return <SignInRequired reason="denied" />
  const revoke = async () => {
    if (target === null) return
    setBusy(true)
    setError(null)
    try {
      await client.revokeSession(target.id)
      setTarget(null)
      sessions.reload()
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }
  const rows = sessions.data ?? []
  return (
    <section aria-labelledby="identity-sessions-title" aria-busy={sessions.loading} className="flex min-w-0 flex-col gap-3 rounded-panel border border-border bg-bg-elevated p-4">
      <h2 id="identity-sessions-title" className="text-control font-semibold text-fg">Active sessions</h2>
      {sessions.loading ? <div role="status" className="text-control text-fg-muted">Loading sessions…</div> : null}
      {sessions.error ? <div role="alert" className="flex flex-col items-start gap-2 text-control text-danger">{sessions.error}<Button type="button" variant="outline" size="sm" onClick={sessions.reload}>Try again</Button></div> : null}
      {!sessions.loading && !sessions.error && rows.length === 0 ? <p className="text-control text-fg-muted">No active sessions.</p> : null}
      <ul className="flex min-w-0 flex-col gap-3">
        {rows.map((session) => (
          <li key={session.id} className="flex min-w-0 flex-col gap-2 border-b border-divider pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <div className="text-control text-fg"><span title={session.user_agent || undefined}>{deviceLabel(session.user_agent)}</span></div>
              <div className="text-caption text-fg-muted">Started {when(session.created_at)} · Last seen {when(session.last_seen_at)} · Expires {when(session.expires_at)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {session.current ? <Pill tone="success">This session</Pill> : <Button type="button" variant="outline" size="sm" aria-label={`Sign out session on ${deviceLabel(session.user_agent)}`} onClick={() => { setError(null); setTarget(session) }}>Sign out…</Button>}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={target !== null} onOpenChange={(open) => { if (!open && !busy) setTarget(null) }} title="Sign out this session?"
        description={<span className="block">That device is signed out immediately.{error ? <FormMessage tone="error">{error}</FormMessage> : null}</span>}
        confirmLabel="Sign out" busy={busy} onConfirm={() => void revoke()} />
    </section>
  )
}
