/**
 * Display formatters.
 *
 * These come from sysop-ui's `lib/utils.ts`, which the CW-0116 triage split by
 * measurement rather than by argument: `cn()` goes to `design-components` (24
 * component files import it, no transport code does), and these four come here
 * because **zero kit components use them** — verified. They exist purely as
 * consumer-facing display helpers, which is exactly this package's job.
 *
 * They are deliberately dependency-free. `cn()` needs `clsx` and `tailwind-merge`;
 * keeping it out is what leaves this package with `react` as its only peer and
 * nothing else at all.
 */

/** Format a date string as relative time (e.g. "3m ago", "2h ago", "5d ago"). */
export function formatRelativeTime(dateStr: string): string {
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.floor((Date.now() - then) / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return `${Math.max(diffSec, 0)}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

/** Format a short calendar date (e.g. "May 15"). */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Format counts compactly (e.g. "1.2k", "45.3k", "1.2M"). */
export function formatCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

/**
 * Format a duration in seconds as a compact human string — `45s`, `2m 05s`,
 * `1h 03m`. Negative input clamps to 0.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m < 60) return `${m}m ${String(s).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}
