import type { ChatSessionAdapter, ChatSessionAttachment, ChatSessionCursor, ChatSessionEvent, ChatSessionLease, ChatSessionPresenceMember, ChatSessionRole } from '@hollis-labs/kit-chat'

/** In-memory fixture. It models chathost admission, not transport or authorization. */
export class FakeChatSessionAdapter implements ChatSessionAdapter {
  private events: ChatSessionEvent[] = []
  private attachments = new Map<string, ChatSessionAttachment>()
  private writer: ChatSessionLease | null = null
  private nextAttachment = 0
  private nextLease = 0

  async attach(role: ChatSessionRole): Promise<ChatSessionAttachment> {
    const attachment = { id: `view-${++this.nextAttachment}`, role }
    this.attachments.set(attachment.id, attachment)
    return attachment
  }

  async detach(attachment: ChatSessionAttachment): Promise<void> {
    this.attachments.delete(attachment.id)
    if (this.writer?.writerId === attachment.id) this.writer = null
  }

  async readEvents(attachment: ChatSessionAttachment, after: ChatSessionCursor): Promise<readonly ChatSessionEvent[]> {
    if (!this.attachments.has(attachment.id)) throw new Error('Attachment is stale')
    return this.events.filter((event) => BigInt(event.cursor) > BigInt(after || '0'))
  }

  async acquire(attachment: ChatSessionAttachment): Promise<ChatSessionLease> {
    if (this.writer && this.writer.expiresAt <= Date.now()) this.writer = null
    if (!this.attachments.has(attachment.id) || attachment.role !== 'controller' || this.writer) throw new Error('Writer lease unavailable')
    return this.issueLease(attachment)
  }

  async takeover(attachment: ChatSessionAttachment): Promise<ChatSessionLease> {
    if (!this.attachments.has(attachment.id) || attachment.role !== 'controller') throw new Error('Controller required')
    return this.issueLease(attachment)
  }

  async renew(lease: ChatSessionLease): Promise<ChatSessionLease> {
    if (this.writer?.id !== lease.id) throw new Error('Writer lease lost')
    this.writer = { ...lease, expiresAt: Date.now() + 30_000 }
    return this.writer
  }

  async submit(lease: ChatSessionLease, id: string, text: string): Promise<ChatSessionCursor> {
    if (this.writer?.id !== lease.id || lease.expiresAt <= Date.now() || !this.attachments.has(lease.writerId)) throw new Error('Writer lease lost')
    const cursor = String(this.events.length + 1)
    this.events.push({ kind: 'item', cursor, id, item: { kind: 'message', id, role: 'user', content: text } })
    return cursor
  }

  async presence(attachment: ChatSessionAttachment): Promise<readonly ChatSessionPresenceMember[]> {
    if (!this.attachments.has(attachment.id)) throw new Error('Attachment is stale')
    return [...this.attachments.values()].map((member) => ({ id: member.id, label: member.id, role: member.role }))
  }

  publish(text: string): ChatSessionCursor {
    const cursor = String(this.events.length + 1)
    this.events.push({ kind: 'item', cursor, id: `output-${cursor}`, item: { kind: 'message', id: `output-${cursor}`, role: 'assistant', content: text } })
    return cursor
  }

  reportGap(from: ChatSessionCursor, to: ChatSessionCursor): ChatSessionCursor {
    const cursor = String(this.events.length + 1)
    this.events.push({ kind: 'gap', cursor, id: `gap-${cursor}`, from, to, reason: 'Earlier events unavailable' })
    return cursor
  }

  private issueLease(attachment: ChatSessionAttachment): ChatSessionLease {
    this.writer = { id: `lease-${++this.nextLease}`, writerId: attachment.id, expiresAt: Date.now() + 30_000 }
    return this.writer
  }
}
