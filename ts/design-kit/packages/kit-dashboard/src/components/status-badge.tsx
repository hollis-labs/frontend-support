import { statusTone, type StatusKey } from '../lib/status'

interface StatusBadgeProps {
  status: string
  /** App-owned vocabulary can borrow a kit tone without changing its label. */
  tone?: StatusKey
  className?: string
}

/**
 * Status pill — a dot + label in a tinted, bordered chip. Dimensions and
 * shade relationships match Torque's status pills exactly; themed via the
 * `--color-status-*` tokens.
 */
export function StatusBadge({ status, tone: toneKey, className = '' }: StatusBadgeProps) {
  const tone = statusTone(toneKey ?? status)

  return (
    <span
      className={`inline-flex items-center gap-2 rounded border px-2 py-1 dash-record-status ${tone.border} ${tone.bg} ${tone.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      <span>{status || 'unknown'}</span>
    </span>
  )
}
