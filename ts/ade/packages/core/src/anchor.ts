import type { Anchor } from "./types.js"

/** Whether two anchors point at the same part (labels aside). */
export function sameAnchor(a: Anchor, b: Anchor): boolean {
  const strip = ({ label: _l, ...rest }: Anchor) => rest
  return JSON.stringify(sorted(strip(a))) === JSON.stringify(sorted(strip(b)))
}

/** Whether `got` has everything `want` asks for (a partial, deep match). No `want` matches all. */
export function inputMatches(want: unknown, got: unknown): boolean {
  if (want === undefined || want === null) return true
  if (typeof want !== "object") return want === got
  if (typeof got !== "object" || got === null) return false
  if (Array.isArray(want))
    return (
      Array.isArray(got) &&
      want.length === got.length &&
      want.every((w, i) => inputMatches(w, got[i]))
    )
  return Object.entries(want as Record<string, unknown>).every(([k, v]) =>
    inputMatches(v, (got as Record<string, unknown>)[k]),
  )
}

function sorted(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sorted)
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, x]) => [k, sorted(x)]),
    )
  return v
}

/** An anchor at a named part of a surface. */
export const at = (surface: string, kind: string, id: string, label?: string): Anchor => ({
  surface,
  target: { kind, id },
  ...(label ? { label } : {}),
})
