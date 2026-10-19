/**
 * Vendored from AI Elements (Vercel, Apache-2.0), attachment interaction only.
 * Upstream: packages/elements/src/prompt-input.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/prompt-input.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Local drop target and native picker emit File[]; host owns list,
 * URLs and uploads. No store, global listeners, screenshot or composer logic.
 * Extension matching and per-file rejection events; shared Button/cn, tokens.
 */
import { createContext, useContext, useRef, useState } from 'react'
import type { ComponentProps, HTMLAttributes } from 'react'
import { Button, cn } from '@hollis-labs/design-components'
import { Paperclip } from 'lucide-react'

export interface AttachmentRejection {
  file: File
  code: 'accept' | 'max_file_size' | 'max_files'
}
export interface AttachmentDropzoneProps extends HTMLAttributes<HTMLDivElement> {
  onFilesSelect: (files: File[]) => void
  onFilesReject?: (rejections: AttachmentRejection[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  /** Number already held by the host, used only to calculate remaining capacity. */
  attachmentCount?: number
  maxFiles?: number
  maxFileSize?: number
  inputLabel?: string
}

const PickerContext = createContext<{ open: () => void; disabled: boolean } | null>(null)

/** Browser accept is a chooser hint; drop validation is presentation, not server validation. */
export function AttachmentDropzone({ children, className, onFilesSelect, onFilesReject,
  accept, multiple = true, disabled = false, attachmentCount = 0, maxFiles, maxFileSize,
  inputLabel = 'Choose attachments', onDragOver, onDragLeave, onDrop, ...props
}: AttachmentDropzoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const select = (incoming: File[]) => {
    if (disabled) return
    const patterns = accept?.split(',').map(value => value.trim().toLowerCase()).filter(Boolean) ?? []
    const remaining = maxFiles === undefined ? Infinity : Math.max(0, Math.floor(maxFiles) - Math.max(0, attachmentCount))
    const capacity = multiple ? remaining : Math.min(1, remaining)
    const accepted: File[] = [], rejected: AttachmentRejection[] = []
    for (const file of incoming) {
      const mime = file.type.toLowerCase(), name = file.name.toLowerCase()
      const matches = patterns.length === 0 || patterns.some(pattern => pattern.startsWith('.')
        ? name.endsWith(pattern) : pattern.endsWith('/*') ? mime.startsWith(pattern.slice(0, -1)) : mime === pattern)
      const code = !matches ? 'accept' : maxFileSize !== undefined && file.size > maxFileSize
        ? 'max_file_size' : accepted.length >= capacity ? 'max_files' : null
      if (code) rejected.push({ file, code })
      else accepted.push(file)
    }
    if (rejected.length) onFilesReject?.(rejected)
    if (accepted.length) onFilesSelect(accepted)
  }
  return <PickerContext.Provider value={{ open: () => input.current?.click(), disabled }}>
    <div {...props} className={cn('relative rounded-panel', dragging && !disabled && 'ring-2 ring-ring', className)}
      data-dragging={dragging && !disabled ? '' : undefined}
      onDragOver={event => {
        onDragOver?.(event)
        if (event.defaultPrevented || !Array.from(event.dataTransfer.types).includes('Files')) return
        event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
        if (!disabled) setDragging(true)
      }}
      onDragLeave={event => {
        onDragLeave?.(event)
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={event => {
        onDrop?.(event); setDragging(false)
        if (event.defaultPrevented || !event.dataTransfer.files.length) return
        event.preventDefault()
        if (!disabled) select(Array.from(event.dataTransfer.files))
      }}>
      <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label={inputLabel}
        accept={accept} multiple={multiple} disabled={disabled}
        onChange={event => {
          const files = Array.from(event.currentTarget.files ?? [])
          event.currentTarget.value = ''
          select(files)
        }} />
      {children}
    </div>
  </PickerContext.Provider>
}

export type PromptInputActionAddAttachmentsProps = ComponentProps<typeof Button> & { label?: string }
/** Upstream action name retained, composed in ChatInput.toolbarStart or any local toolbar. */
export function PromptInputActionAddAttachments({ label = 'Add photos or files', children, disabled,
  onClick, ...props }: PromptInputActionAddAttachmentsProps) {
  const picker = useContext(PickerContext)
  if (!picker) throw new Error('PromptInputActionAddAttachments must be inside AttachmentDropzone')
  return <Button variant="ghost" {...props} type="button" disabled={disabled || picker.disabled}
    aria-label={props['aria-label'] ?? label} onClick={event => {
      onClick?.(event)
      if (!event.defaultPrevented) picker.open()
    }}>{children ?? <><Paperclip aria-hidden="true" className="size-4" />{label}</>}</Button>
}
