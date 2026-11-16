import type { ResultenvEnvelope } from './resultenv.generated'
import type { ToolContentPart, ToolResultView } from './tool-card'

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
const string = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined

/** Redaction is a display boundary; the host keeps the unmodified receipt. */
function redactedMcp(envelope: ResultenvEnvelope): Record<string, unknown> {
  const source = envelope.mcp_result ?? {}
  const copy = JSON.parse(JSON.stringify(source)) as Record<string, unknown>
  for (const pointer of envelope.redact ?? []) {
    const path = pointer.split('/').slice(1).map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    if (path.shift() !== 'mcp_result' || path.length === 0) continue
    let parent: Record<string, unknown> | unknown[] | undefined = copy
    for (const segment of path.slice(0, -1)) {
      const next: unknown = Array.isArray(parent) ? parent[Number(segment)] : parent?.[segment]
      parent = Array.isArray(next) || record(next) ? next as Record<string, unknown> | unknown[] : undefined
      if (!parent) break
    }
    if (parent) {
      const leaf = path[path.length - 1]
      if (Object.prototype.hasOwnProperty.call(parent, leaf)) (parent as Record<string, unknown>)[leaf] = '[redacted]'
    }
  }
  return copy
}

function contentPart(value: unknown): ToolContentPart {
  const item = record(value) ?? {}
  const type = string(item.type)
  if (type === 'text') return { type: 'text', text: string(item.text) ?? '' }
  if (type === 'image') {
    const mimeType = string(item.mimeType)
    const data = string(item.data)
    return { type: 'image', mimeType, src: data && data.length <= 1_000_000 && mimeType?.startsWith('image/') ? `data:${mimeType};base64,${data}` : undefined }
  }
  if (type === 'audio') {
    const mimeType = string(item.mimeType)
    const data = string(item.data)
    return { type: 'audio', mimeType, src: data && data.length <= 1_000_000 && mimeType?.startsWith('audio/') ? `data:${mimeType};base64,${data}` : undefined }
  }
  if (type === 'resource_link') return { type: 'resource', uri: string(item.uri) ?? '', name: string(item.name), mimeType: string(item.mimeType) }
  if (type === 'resource') {
    const resource = record(item.resource) ?? {}
    return { type: 'resource', uri: string(resource.uri) ?? '', mimeType: string(resource.mimeType), text: string(resource.text) }
  }
  return { type: 'other', mimeType: string(item.mimeType), value: item }
}

/** The only mapping from the shared receipt shape to the transport-free card shape. */
export function toToolResultView(envelope: ResultenvEnvelope): ToolResultView {
  const mcp = redactedMcp(envelope)
  const content = Array.isArray(mcp.content) ? mcp.content.map(contentPart) : []
  const metadata: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(mcp)) {
    if (key !== 'content' && key !== 'structuredContent' && key !== 'isError') metadata[key] = value
  }
  if (Array.isArray(mcp.content)) {
    const detail = mcp.content.map(value => {
      const item = record(value) ?? {}
      return { annotations: item.annotations, _meta: item._meta }
    })
    if (detail.some(item => item.annotations !== undefined || item._meta !== undefined)) metadata.content = detail
  }
  return {
    outcome: envelope.outcome,
    exitCode: envelope.exit_code,
    signal: envelope.signal,
    cancelRequested: envelope.cancel_requested,
    cancelConfirmed: envelope.cancel_confirmed,
    stdout: envelope.stdout,
    stderr: envelope.stderr,
    combinedOutput: envelope.combined_output,
    error: envelope.error ? `${envelope.error.code}: ${envelope.error.message}` : undefined,
    content,
    structuredContent: mcp.structuredContent,
    metadata: Object.keys(metadata).length ? metadata : undefined,
    outputSchemaRef: envelope.output_schema_ref,
    truncation: envelope.truncation?.truncated && envelope.truncation.cursor ? { cursor: envelope.truncation.cursor } : undefined,
  }
}
