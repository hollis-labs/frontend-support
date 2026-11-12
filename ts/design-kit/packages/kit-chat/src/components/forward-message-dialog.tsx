import { useId, useRef, useState } from 'react'
import { Button, FormDialog, InputCombobox, Textarea } from '@hollis-labs/design-components'

export interface ForwardRecipient {
  id: string
  label: string
  description?: string
  /** Addresses, session IDs, roles and aliases supplied by the host. */
  keywords?: string[]
}

export interface ForwardMessageDialogProps {
  recipients: ForwardRecipient[]
  source: string
  sourceLabel: string
  loading?: boolean
  loadError?: string | null
  onRetry?: () => void
  /** Return a validation message without truncating the source. */
  validate?: (recipientId: string, note: string) => string | null
  onSend: (recipientId: string, note: string) => Promise<void>
  onClose: () => void
}

/** Controlled-data forwarding flow. Only explicit Send invokes the host transport. */
export function ForwardMessageDialog({ recipients, source, sourceLabel, loading, loadError, onRetry, validate, onSend, onClose }: ForwardMessageDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const noteId = useId()
  const recipientInput = useRef<HTMLInputElement>(null)
  const selected = recipients.find(r => r.id === selectedId)
  const problem = selected ? validate?.(selected.id, note) : null
  const close = () => { if (!sending.current) onClose() }
  const submit = async () => {
    if (!selected || loading || problem || sending.current) return
    sending.current = true
    setBusy(true)
    setError(null)
    try { await onSend(selected.id, note); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not forward this message. Try again.') }
    finally { sending.current = false; setBusy(false) }
  }
  const preview = source.replace(/\s+/g, ' ').trim()
  return (
    <FormDialog open initialFocus={recipientInput} onClose={close} title="Forward message" description="Send this message to another agent."
      className="chat-forward-dialog" submitOnEnter={false} onSubmit={submit} submitting={busy} submitLabel={busy ? 'Sending…' : 'Send'}
      submitDisabled={!selected || loading || !!problem}>
      <InputCombobox inputRef={recipientInput} label="To" items={recipients} value={selectedId} onChange={id => { setSelectedId(id); setError(null) }}
        disabled={busy} loading={loading} placeholder="Name, URN, session ID…" />
      {loadError && <div role="alert" className="text-control text-danger">{loadError}{onRetry && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onRetry}>Retry</Button>}</div>}
      <section aria-label="Forwarded message preview" className="chat-forward-preview border-l-2 border-info/50 pl-3">
        <p className="mb-1 font-mono text-caption text-fg-muted">From {sourceLabel}</p>
        <p className="line-clamp-2 break-words text-control leading-relaxed text-fg-secondary">{preview.length > 220 ? `${preview.slice(0, 220)}…` : preview}</p>
        <p className="mt-1 text-caption text-fg-faint">Full message included</p>
      </section>
      <div className="space-y-2"><label htmlFor={noteId} className="font-mono text-label text-fg-muted">Your message <span className="text-fg-faint">(optional)</span></label><Textarea id={noteId} value={note} onChange={e => setNote(e.target.value)} disabled={busy} placeholder="What would you like this agent to do?" rows={3} className="resize-none text-control" /></div>
      {(error || problem) && <p role="alert" className="text-control text-danger">{error || problem}</p>}
    </FormDialog>
  )
}
