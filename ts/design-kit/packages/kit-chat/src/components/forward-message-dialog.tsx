import { useId, useRef, useState } from 'react'
import { ArrowUpRight, MessageSquare, Send } from 'lucide-react'
import { Button, Command, CommandEmpty, CommandInput, CommandItem, CommandList, Dialog, DialogContent, DialogDescription, DialogTitle, Textarea } from '@hollis-labs/design-components'

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
    <Dialog open onOpenChange={open => { if (!open) close() }}>
      <DialogContent showCloseButton={false} className="flex h-[640px] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0" widthClassName="w-[640px] max-w-[calc(100vw-2rem)]">
        <header className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4">
          <ArrowUpRight className="mt-1 size-5 text-primary" aria-hidden />
          <div className="min-w-0"><DialogTitle className="text-base font-semibold text-fg">Forward to an agent</DialogTitle><DialogDescription className="mt-1 text-control text-fg-muted">Choose a recipient, then add your message.</DialogDescription></div>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {selected ? (
            <div className="flex items-start gap-3 rounded-panel border border-border bg-surface p-3">
              <MessageSquare className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1"><p className="text-control font-medium text-fg">{selected.label}</p><p className="break-all text-caption text-fg-muted">{selected.description}</p></div>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setSelectedId(null); setError(null) }}>Change</Button>
            </div>
          ) : (
            <Command label="Search agents" className="h-auto rounded-panel border border-border bg-bg p-1">
              <CommandInput aria-label="Search agents" placeholder="Search name, URN, session, role…" autoFocus />
              <CommandList className="max-h-56" aria-label="Agent results">
                {loading ? <p role="status" className="p-4 text-control text-fg-muted">Loading agents…</p> : <CommandEmpty>No agents match your search.</CommandEmpty>}
                {recipients.map(r => <CommandItem key={r.id} value={r.id} keywords={[r.label, ...(r.keywords ?? [])]} onSelect={() => { setSelectedId(r.id); setError(null) }} className="items-start gap-3 py-3">
                  <MessageSquare className="mt-1 size-4 text-fg-muted" aria-hidden /><span className="min-w-0"><span className="block text-control font-medium">{r.label}</span><span className="block truncate text-caption text-fg-muted">{r.description}</span></span>
                </CommandItem>)}
              </CommandList>
            </Command>
          )}
          {loadError && <div role="alert" className="text-control text-danger">{loadError}{onRetry && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onRetry}>Retry</Button>}</div>}
          <section aria-label="Forwarded message preview" className="space-y-2">
            <h3 className="text-label font-medium uppercase tracking-label text-fg-muted">Forwarded message</h3>
            <div className="rounded-panel border border-border bg-surface px-3 py-3"><p className="mb-2 truncate text-caption text-fg-muted">{sourceLabel}</p><p className="line-clamp-3 break-words text-control leading-relaxed text-fg-secondary">{preview.length > 280 ? `${preview.slice(0, 280)}…` : preview}</p></div>
            <p className="text-caption text-fg-faint">The full message will be included.</p>
          </section>
          <div className="space-y-2"><label htmlFor={noteId} className="text-label font-medium uppercase tracking-label text-fg-muted">Your message <span className="normal-case tracking-normal">(optional)</span></label><Textarea id={noteId} value={note} onChange={e => setNote(e.target.value)} disabled={busy} placeholder="What would you like this agent to do?" rows={4} className="resize-y text-control" /></div>
          {(error || problem) && <p role="alert" className="text-control text-danger">{error || problem}</p>}
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-bg px-5 py-3">
          <span className="min-w-0 truncate text-caption text-fg-muted">{selected ? `To ${selected.label}` : 'Select an agent to continue'}</span>
          <div className="flex shrink-0 gap-2"><Button type="button" variant="ghost" onClick={close} disabled={busy}>Cancel</Button><Button type="button" onClick={() => void submit()} disabled={!selected || loading || !!problem || busy}><Send className="size-3.5" aria-hidden />{busy ? 'Sending…' : 'Send'}</Button></div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
