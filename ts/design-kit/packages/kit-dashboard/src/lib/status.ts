/**
 * Status presentation tones.
 *
 * Tuned to match Torque's `STATUS_COLORS`, which spreads each status across
 * four shades — a tinted fill, a `40%` border, a solid dot, and a *light*
 * label. The kit carries one `--color-dash-status-*` token per status (so all four
 * palettes stay themeable), plus a `--color-dash-status-*-label` derived from it.
 *
 * THE LABEL USED TO BE COMPUTED HERE, inline, as
 * `text-[color-mix(in_oklab,var(--color-dash-status-done)_60%,var(--color-text))]`.
 * That is a colour literal and an arbitrary value at once, so both design rules
 * reported all twelve — and it was theme-layer work sitting in a component:
 * deriving one colour from two others belongs to the only layer allowed to name
 * a colour. The mix now lives in `styles/theme.css`; this file names the result.
 *
 * The derivation itself is unchanged and deliberate — toward the palette's own
 * text colour rather than toward white, so the phosphor palettes stay coherent
 * (green mixes toward green). Verified identical in all four palettes.
 *
 * Classes are written out as literals (not built from a template) so the
 * Tailwind scanner reliably emits every `*-dash-status-*` utility.
 */

export interface StatusTone {
  /** Tailwind background class (tinted fill). */
  bg: string
  /** Tailwind text-color class (light label). */
  text: string
  /** Tailwind border-color class. */
  border: string
  /** Tailwind background class for the leading dot (solid). */
  dot: string
}

/** Canonical status keys with a dedicated `--color-dash-status-*` token. */
export const STATUS_KEYS = [
  'backlog',
  'todo',
  'queued',
  'doing',
  'review',
  'done',
  'blocked',
  'paused',
  'archived',
  'inbox',
  'routed',
  'indexed',
] as const

export type StatusKey = (typeof STATUS_KEYS)[number]

export const STATUS_TONES: Record<StatusKey, StatusTone> = {
  backlog: {
    bg: 'bg-dash-status-backlog/10',
    border: 'border-dash-status-backlog/40',
    dot: 'bg-dash-status-backlog',
    text: 'text-dash-status-backlog-label',
  },
  todo: {
    bg: 'bg-dash-status-todo/10',
    border: 'border-dash-status-todo/40',
    dot: 'bg-dash-status-todo',
    text: 'text-dash-status-todo-label',
  },
  queued: {
    bg: 'bg-dash-status-queued/10',
    border: 'border-dash-status-queued/40',
    dot: 'bg-dash-status-queued',
    text: 'text-dash-status-queued-label',
  },
  doing: {
    bg: 'bg-dash-status-doing/10',
    border: 'border-dash-status-doing/40',
    dot: 'bg-dash-status-doing',
    text: 'text-dash-status-doing-label',
  },
  review: {
    bg: 'bg-dash-status-review/10',
    border: 'border-dash-status-review/40',
    dot: 'bg-dash-status-review',
    text: 'text-dash-status-review-label',
  },
  done: {
    bg: 'bg-dash-status-done/10',
    border: 'border-dash-status-done/40',
    dot: 'bg-dash-status-done',
    text: 'text-dash-status-done-label',
  },
  blocked: {
    bg: 'bg-dash-status-blocked/10',
    border: 'border-dash-status-blocked/40',
    dot: 'bg-dash-status-blocked',
    text: 'text-dash-status-blocked-label',
  },
  paused: {
    bg: 'bg-dash-status-paused/10',
    border: 'border-dash-status-paused/40',
    dot: 'bg-dash-status-paused',
    text: 'text-dash-status-paused-label',
  },
  archived: {
    bg: 'bg-dash-status-archived/10',
    border: 'border-dash-status-archived/40',
    dot: 'bg-dash-status-archived',
    text: 'text-dash-status-archived-label',
  },
  inbox: {
    bg: 'bg-dash-status-inbox/10',
    border: 'border-dash-status-inbox/40',
    dot: 'bg-dash-status-inbox',
    text: 'text-dash-status-inbox-label',
  },
  routed: {
    bg: 'bg-dash-status-routed/10',
    border: 'border-dash-status-routed/40',
    dot: 'bg-dash-status-routed',
    text: 'text-dash-status-routed-label',
  },
  indexed: {
    bg: 'bg-dash-status-indexed/10',
    border: 'border-dash-status-indexed/40',
    dot: 'bg-dash-status-indexed',
    text: 'text-dash-status-indexed-label',
  },
}

/** Neutral fallback for statuses without a dedicated token. */
export const DEFAULT_STATUS_TONE: StatusTone = {
  bg: 'bg-panel-2',
  text: 'text-text-soft',
  border: 'border-border-subtle',
  dot: 'bg-text-subtle',
}

/** Resolve a status string (case-insensitive) to its presentation tone. */
export function statusTone(status: string): StatusTone {
  return STATUS_TONES[(status || '').toLowerCase() as StatusKey] ?? DEFAULT_STATUS_TONE
}
