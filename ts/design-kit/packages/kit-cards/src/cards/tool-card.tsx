import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CircleHelp, Clock3, OctagonX, Wrench } from 'lucide-react'
import { Button, cn, type Accent } from '@hollis-labs/design-components'
import { Envelope, EnvelopeBody, EnvelopeHeader } from './envelope'

/** Display contract. Hosts adapt their receipt schema to this shape; no transport lives here. */
export type ToolOutcome = 'success' | 'nonzero_exit' | 'error' | 'timeout' | 'cancelled' | 'unknown'

export type ToolContentPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image'; readonly src?: string; readonly mimeType?: string; readonly alt?: string }
  | { readonly type: 'audio'; readonly src?: string; readonly mimeType?: string }
  | { readonly type: 'resource'; readonly uri: string; readonly name?: string; readonly mimeType?: string }
  | { readonly type: 'other'; readonly mimeType?: string; readonly value: unknown }

export interface ToolResultView {
  readonly outcome: ToolOutcome
  readonly exitCode?: number | null
  readonly stdout?: string
  readonly stderr?: string
  readonly error?: string
  readonly content?: readonly ToolContentPart[]
  readonly structuredContent?: unknown
  readonly metadata?: unknown
  readonly outputSchemaRef?: string
  readonly truncation?: { readonly cursor: string; readonly reason?: string }
}

const outcomePresentation: Record<ToolOutcome, { label: string; detail: string; tone: Accent; icon: typeof CheckCircle2 }> = {
  success: { label: 'Succeeded', detail: 'Tool completed successfully.', tone: 'success', icon: CheckCircle2 },
  nonzero_exit: { label: 'Nonzero exit', detail: 'The process exited with an error status.', tone: 'danger', icon: OctagonX },
  error: { label: 'Tool error', detail: 'The tool reported an error.', tone: 'danger', icon: AlertTriangle },
  timeout: { label: 'Timed out', detail: 'The operation timed out; its effect may need checking.', tone: 'warning', icon: Clock3 },
  cancelled: { label: 'Cancelled', detail: 'Cancellation was reported; check the receipt for effects.', tone: 'warning', icon: OctagonX },
  unknown: { label: 'Outcome unknown', detail: 'Result not recorded; an effect is possible.', tone: 'warning', icon: CircleHelp },
}

/** A conservative DOM budget. A host can fetch more with the opaque cursor. */
const TEXT_LIMIT = 4096
const JSON_LIMIT = 4096

function bounded(text: string, limit = TEXT_LIMIT) {
  return text.length > limit ? `${text.slice(0, limit)}\n… Preview limited to ${limit} characters` : text
}

function jsonPreview(value: unknown): string {
  try {
    const serialized = JSON.stringify(value, null, 2)
    return bounded(serialized ?? String(value), JSON_LIMIT)
  } catch {
    return '[Value could not be serialized for display]'
  }
}

function TextSection({ label, value }: { label: string; value: string }) {
  return <section className="space-y-1" aria-label={label}>
    <h4 className="font-mono text-caption font-semibold uppercase tracking-label text-fg-muted">{label}</h4>
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-control border border-border-subtle bg-surface p-3 font-mono text-caption text-fg-secondary">{bounded(value)}</pre>
  </section>
}

function ContentPart({ part, index }: { part: ToolContentPart; index: number }): ReactNode {
  switch (part.type) {
    case 'text': return <TextSection label={`Text content ${index + 1}`} value={part.text} />
    case 'image': return <section aria-label={`Image content ${index + 1}`} className="space-y-1">
      <h4 className="text-caption font-medium text-fg-muted">Image{part.mimeType ? ` · ${part.mimeType}` : ''}</h4>
      {part.src ? <img src={part.src} alt={part.alt ?? 'Tool result image'} className="max-h-64 max-w-full object-contain" /> : <p className="text-caption text-fg-muted">Image available in receipt</p>}
    </section>
    case 'audio': return <section aria-label={`Audio content ${index + 1}`} className="space-y-1">
      <h4 className="text-caption font-medium text-fg-muted">Audio{part.mimeType ? ` · ${part.mimeType}` : ''}</h4>
      {part.src ? <audio controls src={part.src} className="max-w-full" /> : <p className="text-caption text-fg-muted">Audio available in receipt</p>}
    </section>
    case 'resource': return <section aria-label={`Resource content ${index + 1}`} className="text-caption text-fg-secondary">
      <span className="font-medium">{part.name ?? 'Resource'}</span>{part.mimeType ? ` · ${part.mimeType}` : ''}<code className="block break-all">{bounded(part.uri, 512)}</code>
    </section>
    case 'other': return <TextSection label={`Other content ${index + 1}${part.mimeType ? ` · ${part.mimeType}` : ''}`} value={jsonPreview(part.value)} />
  }
}

export interface ToolResultContentProps extends HTMLAttributes<HTMLDivElement> {
  readonly result: ToolResultView
  /** The host owns pagination. Cursor is opaque and must be passed through unchanged. */
  readonly onLoadMore?: (cursor: string) => void
}

export function ToolResultContent({ result, onLoadMore, className, ...rest }: ToolResultContentProps) {
  const [expanded, setExpanded] = useState(false)
  const presentation = outcomePresentation[result.outcome]
  const hasDetail = result.stdout !== undefined || result.stderr !== undefined || result.error !== undefined ||
    Boolean(result.content?.length) || result.structuredContent !== undefined || result.metadata !== undefined || result.outputSchemaRef !== undefined
  const detail = <div className="space-y-3">
    {result.exitCode !== undefined && result.exitCode !== null ? <p className="text-caption">Exit code: <code>{result.exitCode}</code></p> : null}
    {result.stdout !== undefined ? <TextSection label="stdout" value={result.stdout} /> : null}
    {result.stderr !== undefined ? <TextSection label="stderr" value={result.stderr} /> : null}
    {result.error !== undefined ? <TextSection label="Error detail" value={result.error} /> : null}
    {result.content?.map((part, index) => <ContentPart key={index} part={part} index={index} />)}
    {result.structuredContent !== undefined ? <TextSection label="Structured content" value={jsonPreview(result.structuredContent)} /> : null}
    {result.metadata !== undefined ? <TextSection label="Metadata" value={jsonPreview(result.metadata)} /> : null}
    {result.outputSchemaRef !== undefined ? <p className="break-all text-caption text-fg-secondary">Output schema: <code>{bounded(result.outputSchemaRef, 512)}</code></p> : null}
  </div>
  return <div className={cn('space-y-3 text-control', className)} data-slot="tool-result" data-outcome={result.outcome} {...rest}>
    <div className="flex items-start gap-2" role="status"><presentation.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div><strong className="font-semibold">{presentation.label}</strong><p className="text-caption text-fg-secondary">{presentation.detail}</p></div>
    </div>
    {hasDetail ? <div><Button type="button" variant="outline" size="sm" className="max-sm:min-h-11" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide result details' : 'Show result details'}</Button>{expanded ? <div className="mt-3">{detail}</div> : null}</div> : null}
    {result.truncation ? <div className="space-y-1 text-caption"><p>Output truncated{result.truncation.reason ? `: ${result.truncation.reason}` : '.'}</p>{onLoadMore ? <Button type="button" variant="outline" size="sm" className="max-sm:min-h-11" onClick={() => onLoadMore(result.truncation!.cursor)}>Load more</Button> : null}</div> : null}
  </div>
}

export interface ToolCardProps {
  readonly toolName: string
  readonly result: ToolResultView
  readonly onLoadMore?: (cursor: string) => void
  readonly className?: string
}

/** Shared card shape. Kit-chat reuses ToolResultContent inside its existing Tool row. */
export function ToolCard({ toolName, result, onLoadMore, className }: ToolCardProps) {
  const presentation = outcomePresentation[result.outcome]
  return <Envelope accent={presentation.tone} className={className} data-slot="tool-card">
    <EnvelopeHeader icon={Wrench} label={toolName} meta={presentation.label} tone={presentation.tone} />
    <EnvelopeBody><ToolResultContent result={result} onLoadMore={onLoadMore} /></EnvelopeBody>
  </Envelope>
}
