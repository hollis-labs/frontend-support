/**
 * Payload parsing helpers.
 *
 * SPLIT OUT OF `json-payload.tsx`, where they were co-exported alongside three
 * components and were the last two lint errors in the repo.
 *
 * The `src/components/ui/**` react-refresh exemption was NOT widened to cover
 * them, and that is the point. That exemption exists for the vendored shadcn
 * variant-helper pattern — `buttonVariants`, `badgeVariants` — which the registry
 * keeps producing, so fighting it means rewriting every component on arrival.
 * These are plain parsers. A component module is the wrong home for a parser
 * regardless of what any rule says, and widening the exemption would have hidden
 * the question rather than answered it.
 */

/** Parse `raw` as a JSON object, or null when it is not one. */
export function safeParseObject(raw: string): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Compact display string for a decomposed payload value. */
export function scalarStr(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const text = JSON.stringify(value)
  return text.length > 48 ? `${text.slice(0, 47)}…` : text
}
