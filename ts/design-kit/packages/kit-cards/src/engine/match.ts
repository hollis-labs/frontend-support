import type { CardInput, CardRule, MatchValue, RuleMatch } from './types'

function fits(pattern: MatchValue | undefined, actual: string | undefined): boolean {
  if (pattern === undefined) return true
  if (actual === undefined) return false
  const list = typeof pattern === 'string' ? [pattern] : pattern
  return list.some((p) => (p.endsWith('*') ? actual.startsWith(p.slice(0, -1)) : p === actual))
}

export function matches(match: RuleMatch, card: CardInput): boolean {
  return (
    fits(match.kind, card.kind) &&
    fits(match.source, card.source) &&
    fits(match.risk, card.risk) &&
    (match.blocking === undefined || match.blocking === (card.blocking === true))
  )
}

export function pickRule(rules: readonly CardRule[], card: CardInput): CardRule | null {
  return rules.find((r) => matches(r.match, card)) ?? null
}

export function dedupeKeyFor(rule: CardRule, card: CardInput): string | null {
  if (!rule.dedupeBy || rule.dedupeBy.length === 0) return null
  return rule.dedupeBy.map((f) => card[f] ?? '').join(':')
}
