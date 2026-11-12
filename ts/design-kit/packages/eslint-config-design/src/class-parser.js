/**
 * Splitting a className into utilities, correctly.
 *
 * This file exists because the naive version of it is the source of the bug
 * class these rules are most likely to have. Two real examples from the
 * portfolio, both of which a careless parser gets wrong:
 *
 *   `data-[side=right]:bg-surface`  the brackets belong to the VARIANT, not to a
 *                                   value. 192 of kit-dashboard's 415 bracket
 *                                   utilities are this shape.
 *   `bg-bg-elevated` vs `bg-bg-surface`
 *                                   both are `bg-` plus a two-segment name. The
 *                                   first is a real token, the second is
 *                                   invented and renders nothing. They differ by
 *                                   one segment, so nothing structural can tell
 *                                   them apart — only membership in the declared
 *                                   vocabulary can.
 *
 * So: this module splits, and it never judges. Judging is membership testing,
 * and it happens in the rules against the resolved vocabulary.
 */

import { sortedByLength } from './tailwind.js'

/**
 * Split on `sep` at bracket/paren depth 0 only, so `data-[a:b]:x` splits into
 * `data-[a:b]` and `x` rather than on the colon inside the brackets.
 */
function splitTopLevel(input, sep) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '[' || ch === '(') depth++
    else if (ch === ']' || ch === ')') depth--
    else if (ch === sep && depth === 0) {
      parts.push(input.slice(start, i))
      start = i + 1
    }
  }
  parts.push(input.slice(start))
  return parts
}

/**
 * Every whitespace-separated class in a string, with its offset, so a rule can
 * report and fix the exact span rather than the whole literal.
 * @returns {{raw: string, index: number}[]}
 */
export function tokenizeClassString(text) {
  const out = []
  const re = /\S+/g
  let m
  while ((m = re.exec(text)) !== null) out.push({ raw: m[0], index: m.index })
  return out
}

/**
 * Strip variant prefixes and the `!` important marker, leaving the utility.
 * @returns {{utility: string, offset: number, variants: string[]}}
 */
export function stripVariants(cls) {
  const segments = splitTopLevel(cls, ':')
  const utility = segments[segments.length - 1]
  const variants = segments.slice(0, -1)
  let offset = cls.length - utility.length
  let u = utility
  // Tailwind v4 allows a leading or trailing `!`.
  if (u.startsWith('!')) { u = u.slice(1); offset += 1 }
  if (u.endsWith('!')) u = u.slice(0, -1)
  return { utility: u, offset, variants }
}

/**
 * Split a utility into its prefix and the rest, using the LONGEST matching
 * prefix so `border-t-foo` reads as `border-t` + `foo`, not `border` + `t-foo`.
 * @returns {{prefix: string, rest: string} | null}
 */
export function matchPrefix(utility, prefixes) {
  for (const p of sortedByLength(prefixes)) {
    if (utility.startsWith(p + '-')) return { prefix: p, rest: utility.slice(p.length + 1) }
  }
  return null
}

/**
 * Peel the `/opacity` modifier off a value. `bg-status-running/10` must test
 * `status-running` for membership, not `status-running/10`.
 * @returns {{value: string, opacity: string | null}}
 */
export function splitOpacity(rest) {
  const parts = splitTopLevel(rest, '/')
  if (parts.length < 2) return { value: rest, opacity: null }
  return { value: parts.slice(0, -1).join('/'), opacity: parts[parts.length - 1] }
}

/** `[13px]` -> `13px`; anything else -> null. */
export function arbitraryValue(value) {
  if (value.length > 2 && value.startsWith('[') && value.endsWith(']')) return value.slice(1, -1)
  return null
}

/**
 * A value that is computed rather than literal — `var(--x)`, `calc(...)`,
 * `min(...)`. Real in the kit: `rounded-[min(var(--radius-md),10px)]` x3. Still
 * an arbitrary value, but never safe to autofix, because no single named step is
 * equivalent to an expression.
 */
export function isComputed(value) {
  return /(^|[^a-z-])(var|calc|min|max|clamp|env|attr)\s*\(/.test(value)
}

/** Full parse of one class. Returns null when there is no prefix match. */
export function parseUtility(cls, prefixes) {
  const { utility, offset } = stripVariants(cls)
  const negative = utility.startsWith('-')
  const bare = negative ? utility.slice(1) : utility
  const matched = matchPrefix(bare, prefixes)
  if (!matched) return null
  const { value, opacity } = splitOpacity(matched.rest)
  return {
    prefix: matched.prefix,
    value,
    opacity,
    negative,
    arbitrary: arbitraryValue(value),
    // offset of the utility (past any variants) within the original class token
    offset: offset + (negative ? 1 : 0),
    utility: bare,
  }
}
