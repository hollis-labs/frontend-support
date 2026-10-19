import { useMemo, type ReactNode } from 'react'
import { cn } from '../lib/utils'

interface JsonViewerProps {
  /** Any JSON-serializable value. */
  value: unknown
  /** Extra classes on the `<pre>` (e.g. a `max-h-*` to cap height). */
  className?: string
}

// Matches: a quoted string — as a key when a `:` follows, asserted rather than
// consumed — a literal (true/false/null), or a number.
//
// THE LOOKAHEAD IS THE POINT, AND IT REPLACED A `\s*:?` THAT CONSUMED. With the
// `\s*` inside the match, a string followed by whitespace carried that whitespace
// and the emitted `<span>` wrapped it — in practice the last element before a
// closing bracket, whose span swallowed the newline AND the bracket's indent.
// `{"tags":["one","two"]}` pretty-printed produced exactly one such match,
// `"two"\n  `. It rendered identically while every role was colour-only, which is
// how it survived; it would have started painting across line breaks the moment a
// role took a background, border or underline, which is what a syntax palette
// invites. Asserting `(?=\s*:)` ends every match at the closing quote.
//
// ONE APPEARANCE CHANGE CAME WITH IT, approved as part of this pass rather than
// slipped in: the `:` is no longer inside the key's match, so it renders in the
// surrounding text colour instead of the key colour. Every object key, every
// palette. That is the whole of the visible difference.
//
// `key` is a named group because both string alternatives match the same text —
// the lookahead consumes nothing, so the matched substring alone cannot say which
// one fired.
const TOKEN = /((?<key>"(?:[^"\\]|\\.)*")(?=\s*:)|"(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

/**
 * THE SYNTAX PALETTE — now its own contract family, §3.10.
 *
 * The history, because the shape of this file only makes sense with it. CW-0116
 * called the original token bug "the worst kind": four `--color-status-*` tokens
 * used as SYNTAX colours, so retuning the operations status palette silently
 * restyled JSON. The contract burned the `status-` prefix, so that had to move —
 * and it moved to the feedback family, which was the same defect one family over.
 * `danger` means danger; a string is not a success. The categories here are
 * syntactic and the names they borrowed were semantic.
 *
 * IT ALSO DID NOT RENDER. Measured across the four sysop palettes: the feedback
 * map produced five distinct colours in ONE of them. Amber rendered `string`,
 * `number` and `boolean` as the same `#ffd060`; green and high-contrast collapsed
 * two each. Syntax highlighting that does not highlight — which is why this is a
 * repair and not a tidy-up.
 *
 * `chart-1..5` was the obvious home and is the wrong one. Both families are
 * categorical, but charts paint fills at WCAG's 3:1 and syntax paints small mono
 * text at 4.5:1, and no single five-stop ramp clears both bars — the derivation
 * with the separation charts want puts two of these roles below AA in all four
 * palettes. `SYNTAX_TOKENS` carries that argument in full. The chart family stays
 * an undesigned placeholder by Chrispian's own decision.
 *
 * So these five names are the family, and the values are rule R4 in the theme
 * layer — a lightness ramp between each palette's own `fg` and `fg-faint`. This
 * component names tokens and computes nothing, which is the one rule.
 */
const SYNTAX = {
  key: 'text-syntax-key',
  string: 'text-syntax-string',
  boolean: 'text-syntax-boolean',
  null: 'text-syntax-null',
  number: 'text-syntax-number',
} as const

function classFor(match: RegExpExecArray | RegExpMatchArray): string {
  const text = match[0]
  if (text.startsWith('"')) {
    // The lookahead consumes nothing, so the group — not the text — says which.
    return match.groups?.key !== undefined ? SYNTAX.key : SYNTAX.string
  }
  if (text === 'true' || text === 'false') return SYNTAX.boolean
  if (text === 'null') return SYNTAX.null
  return SYNTAX.number
}

/**
 * Syntax-highlighted, read-only JSON view. Pretty-prints the value and tints
 * keys / strings / numbers / literals so the output follows the active theme.
 */
export function JsonViewer({ value, className }: JsonViewerProps) {
  const nodes = useMemo<ReactNode[]>(() => {
    let text: string
    try {
      text = JSON.stringify(value, null, 2) ?? String(value)
    } catch {
      text = String(value)
    }

    const out: ReactNode[] = []
    let last = 0
    let key = 0
    for (const match of text.matchAll(TOKEN)) {
      const index = match.index ?? 0
      if (index > last) out.push(text.slice(last, index))
      out.push(
        <span key={key++} className={classFor(match)}>
          {match[0]}
        </span>,
      )
      last = index + match[0].length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
  }, [value])

  return (
    <pre
      className={cn(
        'overflow-auto rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs leading-5 text-fg-secondary',
        className,
      )}
    >
      <code>{nodes}</code>
    </pre>
  )
}
