const UNITS: readonly (readonly [string, number])[] = [['year', 31_536_000_000], ['month', 2_592_000_000], ['day', 86_400_000], ['hour', 3_600_000], ['minute', 60_000]]

function span(ms: number): string {
  for (const [unit, size] of UNITS) {
    const count = Math.floor(ms / size)
    if (count >= 1) return `${count} ${unit}${count === 1 ? '' : 's'}`
  }
  return 'moments'
}

/** "3 days ago" / "in 3 days". Invalid input yields null so callers can say "unknown". */
export function relativeTime(iso: string | undefined, now: number): string | null {
  if (iso === undefined) return null
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return null
  const delta = at - now
  const text = span(Math.abs(delta))
  if (text === 'moments') return 'just now'
  return delta < 0 ? `${text} ago` : `in ${text}`
}
