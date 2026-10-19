import { useEffect, useRef, useState } from 'react'
import { Button } from '@hollis-labs/design-components'
import { Attachment, AttachmentDropzone, AttachmentEmpty, AttachmentHoverCard, AttachmentHoverCardContent, AttachmentHoverCardTrigger, AttachmentInfo, AttachmentPreview, AttachmentRemove, Attachments, ChatInput, PromptInputActionAddAttachments } from '@hollis-labs/kit-chat'
import type { AttachmentData } from '@hollis-labs/kit-chat'

/** Host owns File objects, list mutations and object URL lifetime; no uploads. */
export function AttachmentsDemo() {
  const [items, setItems] = useState<AttachmentData[]>([
    { id: 'readme', type: 'file', filename: 'README.txt', mediaType: 'text/plain' },
    { id: 'source', type: 'source-document', title: 'Release notes', filename: 'notes.md', mediaType: 'text/markdown' },
  ])
  const urls = useRef(new Map<string, string>())
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('Drop images or text files, or choose with the button.')
  const [disabled, setDisabled] = useState(false)
  useEffect(() => {
    const ownedUrls = urls.current
    return () => { for (const url of ownedUrls.values()) URL.revokeObjectURL(url); ownedUrls.clear() }
  }, [])
  const remove = (id: string) => {
    const url = urls.current.get(id)
    if (url) URL.revokeObjectURL(url)
    urls.current.delete(id)
    setItems(current => current.filter(item => item.id !== id))
    setStatus('Removed attachment')
  }
  const rows = (variant: 'grid' | 'inline' | 'list') => <Attachments variant={variant}>
    {items.length === 0 && <AttachmentEmpty />}
    {items.map(item => <Attachment key={item.id} data={item} onRemove={disabled ? undefined : () => remove(item.id)}>
      <AttachmentPreview /><AttachmentInfo showMediaType />
      <AttachmentRemove label={`Remove ${item.type === 'file' ? item.filename : item.title} (${variant})`} />
    </Attachment>)}
  </Attachments>
  return <section className="mx-auto max-w-3xl space-y-4 p-4 text-fg">
    <h1 className="text-heading font-semibold">Host-controlled attachments</h1>
    <Button variant="outline" onClick={() => setDisabled(current => !current)}>{disabled ? 'Enable attachments' : 'Disable attachments'}</Button>
    <AttachmentDropzone disabled={disabled} accept="image/*,.txt,.md" attachmentCount={items.length} maxFiles={6} maxFileSize={2000000}
      className="space-y-4 rounded-panel border border-border bg-bg-elevated p-4"
      onFilesSelect={files => {
        const added = files.map(file => {
          const id = crypto.randomUUID(), url = URL.createObjectURL(file)
          urls.current.set(id, url)
          return { id, type: 'file' as const, filename: file.name, mediaType: file.type, url }
        })
        setItems(current => [...current, ...added]); setStatus(`Added ${added.length} attachment(s)`)
      }}
      onFilesReject={rejections => setStatus(rejections.map(({ file, code }) => `${file.name}: ${code}`).join(', '))}>
      <h2 className="text-control font-semibold">Grid</h2>{rows('grid')}
      <h2 className="text-control font-semibold">Inline</h2>{rows('inline')}
      <h2 className="text-control font-semibold">List</h2>{rows('list')}
      <AttachmentHoverCard>
        <AttachmentHoverCardTrigger render={<Button type="button" variant="outline" />}>Preview details</AttachmentHoverCardTrigger>
        <AttachmentHoverCardContent aria-label="Attachment preview details">
          <p className="text-control">Keyboard and touch accessible attachment details</p>{rows('list')}
        </AttachmentHoverCardContent>
      </AttachmentHoverCard>
      <ChatInput value={draft} onValueChange={setDraft} onSubmit={() => setStatus('Host submit requested')}
        disabled={disabled} toolbarStart={<PromptInputActionAddAttachments />}
        triggers={[{ id: 'files', kind: 'reference', char: '@', items: [{ id: 'readme', label: 'README.txt' }] }]} />
    </AttachmentDropzone>
    <p role="status" className="text-control text-fg-muted">{status}</p>
  </section>
}
