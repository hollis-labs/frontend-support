import { Button, DetailDialog } from '@hollis-labs/design-components'

export interface NewTokenDisclosureProps {
  /** Ephemeral create response. Host must clear it on dismiss/session change/unmount. */
  readonly value: string | null
  readonly onDismiss: () => void
  /** Explicit user intent only. The host chooses clipboard handling, including errors. */
  readonly onCopy?: () => void
  readonly copied?: boolean
  /** Dialog title. Defaults to "Copy your key now"; a pairing code passes its own. */
  readonly title?: string
  /** Body line under the title. Defaults to the one-time key wording. */
  readonly description?: string
  /** Announced after a copy. Defaults to "Key copied to clipboard." */
  readonly copiedMessage?: string
}

/** No state, browser storage, URL, logging or secret-bearing callback payloads. */
export function NewTokenDisclosure({ value, onDismiss, onCopy, copied = false, title = 'Copy your key now', description = 'This is the only time it is shown. Store it somewhere safe.', copiedMessage = 'Key copied to clipboard.' }: NewTokenDisclosureProps) {
  return (
    <DetailDialog open={value !== null} onClose={onDismiss} title={title}
      footer={<Button type="button" onClick={() => onDismiss()}>Done</Button>}>
      <div className="flex min-w-0 flex-col gap-3 px-4 py-3">
        <p className="text-control text-fg-secondary">{description}</p>
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-control border border-border bg-bg-elevated p-3">
          {/* A text node avoids password-manager/form draft recovery and value attributes. */}
          <pre className="min-w-0 whitespace-pre-wrap font-mono text-control text-fg [overflow-wrap:anywhere]"><code>{value}</code></pre>
          {onCopy ? <Button type="button" variant="outline" size="sm" onClick={() => onCopy()}>{copied ? 'Copied' : 'Copy'}</Button> : null}
        </div>
        {/* Polite live region: the copy confirmation is announced, never the value. */}
        <span role="status" className="text-caption text-fg-muted">{copied ? copiedMessage : ''}</span>
      </div>
    </DetailDialog>
  )
}
