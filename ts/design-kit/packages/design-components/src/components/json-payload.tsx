import type { DialogOptions } from '../hooks/use-dialog-options'
import { useMemo } from 'react'
import { useCopy } from '../hooks/use-copy'
import { safeParseObject, scalarStr } from '../lib/payload'
import { Check, Copy, Eye } from 'lucide-react'
import { JsonViewer } from './json-viewer'
import { CopyButton } from './copy-button'
import { DetailDialog } from './detail-dialog'

export interface PayloadActionsProps {
  raw: string
  onView: () => void
  viewLabel?: string
}

/**
 * Inline view + copy icon pair for a table cell. `onView` opens a payload
 * modal; the copy icon copies `raw` without leaving the table.
 */
export function PayloadActions({
  raw,
  onView,
  viewLabel = 'View payload',
}: PayloadActionsProps) {
  const { copied, copy } = useCopy()
  if (!raw) return <span className="text-label text-fg-faint">—</span>
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        title={viewLabel}
        aria-label={viewLabel}
        onClick={(event) => {
          event.stopPropagation()
          onView()
        }}
        className="rounded p-1 text-fg-faint transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Copy payload"
        aria-label="Copy payload"
        onClick={(event) => {
          event.stopPropagation()
          copy(raw)
        }}
        className="rounded p-1 text-fg-faint transition-colors hover:bg-surface-hover hover:text-fg"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

export interface PayloadSummaryProps {
  raw: string
  maxEntries?: number
}

/** Decomposed payload preview for dense tables. */
export function PayloadSummary({ raw, maxEntries = 6 }: PayloadSummaryProps) {
  const parsed = useMemo(() => safeParseObject(raw), [raw])
  if (!parsed) {
    return raw ? (
      <span className="block truncate font-mono text-label text-fg-faint">{raw}</span>
    ) : (
      <span className="text-label text-fg-faint">—</span>
    )
  }
  const entries = Object.entries(parsed).slice(0, maxEntries)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {entries.map(([key, value]) => (
        <span key={key} className="whitespace-nowrap text-label">
          <span className="text-fg-faint">{key}:</span>{' '}
          <span className="font-mono text-fg-muted">{scalarStr(value)}</span>
        </span>
      ))}
    </div>
  )
}

export interface JsonModalProps extends DialogOptions {
  open: boolean
  onClose: () => void
  title: string
  raw: string
  copyLabel?: string
}

/** Modal showing a syntax-highlighted payload with a copy action. */
export function JsonModal({
  open,
  onClose,
  title,
  raw,
  copyLabel = 'Copy payload',
  ...dialogOptions
}: JsonModalProps) {
  const value = useMemo<unknown>(() => {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }, [raw])

  return (
    <DetailDialog
      {...dialogOptions}
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end">
          <CopyButton text={raw} label={copyLabel} />
        </div>
      }
    >
      <div className="px-4 py-3">
        <JsonViewer value={value} />
      </div>
    </DetailDialog>
  )
}
