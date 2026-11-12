const UNITS: readonly (readonly [string, number])[] = [['day', 86_400_000], ['hour', 3_600_000], ['minute', 60_000]]

/** Short label for a User-Agent: "Chrome on Linux". Unrecognised or empty input is "Unknown device". */
export function deviceLabel(userAgent: string | undefined): string {
  const ua = userAgent ?? ''
  if (ua === '') return 'Unknown device'
  const browser = /\b(Edg|OPR|Firefox|FxiOS|CriOS|Chrome|HeadlessChrome|Safari)\//.exec(ua)?.[1]
  const name = browser === undefined ? null : browser === 'Edg' ? 'Edge' : browser === 'OPR' ? 'Opera' : browser === 'FxiOS' ? 'Firefox' : browser === 'CriOS' || browser === 'HeadlessChrome' ? 'Chrome' : browser === 'Safari' && !/Version\//.test(ua) ? null : browser
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux|X11/.test(ua) ? 'Linux' : null
  if (name !== null && os !== null) return `${name} on ${os}`
  return name ?? os ?? 'Unknown device'
}

/** "3 minutes ago" / "in 2 days"; null when the input is not a date. */
export function relativeWhen(iso: string, now: number): string | null {
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return null
  const delta = at - now
  for (const [unit, size] of UNITS) {
    const count = Math.floor(Math.abs(delta) / size)
    if (count >= 1) return delta < 0 ? `${count} ${unit}${count === 1 ? '' : 's'} ago` : `in ${count} ${unit}${count === 1 ? '' : 's'}`
  }
  return 'just now'
}
