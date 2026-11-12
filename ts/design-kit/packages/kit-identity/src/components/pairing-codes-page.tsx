import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Checkbox, FormDialog, Input } from '@hollis-labs/design-components'
import { NewTokenDisclosure, SignInRequired } from '@hollis-labs/kit-account'
import { useIdentity } from '../client/identity-context'
import { errorMessage, isDenied } from '../client/errors'
import { FormMessage } from './field'
import { ScopeAdder } from './scopes'
import { useScopeOptions } from './use-scope-options'

const CODE_LIFETIMES = [
  { minutes: 10, label: '10 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 1440, label: '24 hours' },
] as const

export interface PairingCodesPageProps {
  readonly scopeSuggestions?: readonly string[]
}

function holdsAdmin(scopes: readonly string[]): boolean {
  return scopes.some((scope) => scope === '*' || scope.endsWith('.admin'))
}

/**
 * In-shell page over `POST /pairing-codes` (needs `<app>.admin`). There is no list or revoke route, so the page is an
 * explanation and one action; the code is shown once and cleared on dismiss.
 */
export function PairingCodesPage({ scopeSuggestions }: PairingCodesPageProps) {
  const { client, scopes: held } = useIdentity()
  const id = useId()
  const scopes = useScopeOptions(scopeSuggestions)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<readonly string[]>([])
  const [minutes, setMinutes] = useState<number>(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<{ code: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [denied, setDenied] = useState(false)

  // The caller's scopes are known only after sign-in; when it is, a non-admin is told before trying.
  if (denied || (held !== null && !holdsAdmin(held))) return <SignInRequired reason="denied" />

  const valid = name.trim() !== '' && picked.length > 0
  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await client.createPairingCode({ name: name.trim(), scopes: picked, ttl_minutes: minutes })
      setSecret({ code: created.code, expiresAt: created.expires_at })
      setCopied(false)
      setOpen(false)
      setName('')
      setPicked([])
    } catch (failure) {
      if (isDenied(failure)) setDenied(true)
      else setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }
  const expires = secret === null ? null : new Date(secret.expiresAt)
  const expiresText = expires === null || Number.isNaN(expires.getTime()) ? 'It expires soon.' : `It expires at ${expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and works once.`
  return (
    <section aria-labelledby={`${id}-title`} className="flex min-w-0 flex-col items-start gap-3 rounded-panel border border-border bg-bg-elevated p-4">
      <h2 id={`${id}-title`} className="text-control font-semibold text-fg">Pairing codes</h2>
      <p className="text-control text-fg-secondary">A pairing code lets a device you control exchange it, once, for an API key with the scopes you choose. Codes cannot be listed or revoked, so keep their lifetime short.</p>
      <Button type="button" size="sm" onClick={() => { setError(null); setOpen(true) }}>Generate pairing code</Button>
      <FormDialog open={open} onClose={() => { if (!busy) setOpen(false) }} title="Generate pairing code" description="The code is shown once after it is generated." submitLabel={busy ? 'Generating…' : 'Generate code'} submitting={busy} submitDisabled={!valid || busy} onSubmit={() => void submit()}>
        <label htmlFor={`${id}-name`} className="block text-label text-fg-secondary">Name</label>
        <Input id={`${id}-name`} value={name} disabled={busy} required autoComplete="off" onChange={(event) => setName(event.target.value)} className="text-control md:text-control text-fg" />
        <fieldset disabled={busy} className="flex flex-col gap-2">
          <legend className="mb-2 text-label text-fg-secondary">Scopes the key will have</legend>
          {scopes.options.map((scope, index) => (
            <div key={scope.id} className="flex items-start gap-2">
              <Checkbox id={`${id}-scope-${index}`} checked={picked.includes(scope.id)} onCheckedChange={(checked) => setPicked(checked ? [...new Set([...picked, scope.id])] : picked.filter((value) => value !== scope.id))} />
              <label htmlFor={`${id}-scope-${index}`} className="text-control text-fg [overflow-wrap:anywhere]">{scope.label}</label>
            </div>
          ))}
        </fieldset>
        <ScopeAdder onAdd={(scope) => { const ok = scopes.add(scope); if (ok) setPicked((current) => [...new Set([...current, scope.trim()])]); return ok }} disabled={busy} />
        <label htmlFor={`${id}-life`} className="block text-label text-fg-secondary">Code lifetime</label>
        <select id={`${id}-life`} value={minutes} disabled={busy} onChange={(event) => setMinutes(Number(event.target.value))} className="h-9 w-full rounded-control border border-border bg-bg-elevated px-2 text-control text-fg">
          {CODE_LIFETIMES.map((option) => <option key={option.minutes} value={option.minutes}>{option.label}</option>)}
        </select>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      </FormDialog>
      <NewTokenDisclosure value={secret?.code ?? null} title="Copy your pairing code now" description={`This is the only time it is shown. ${expiresText}`} copiedMessage="Pairing code copied to clipboard."
        onDismiss={() => { setSecret(null); setCopied(false) }} copied={copied}
        onCopy={() => { if (secret) navigator.clipboard.writeText(secret.code).then(() => setCopied(true), () => setCopied(false)) }} />
    </section>
  )
}
