import type { CardViewModel } from './types'

export interface ExpiryDisplay {
  /** Absolute expiry, ms since epoch. Always what is shown first. */
  readonly at: number
  /** Whole seconds left, ONLY inside the final minute; null before that. */
  readonly countdownSeconds: number | null
}

/**
 * How to DISPLAY an expiry. This never changes a card's state: `expired` arrives from
 * the server like any other terminal status. A client that flipped a card to expired
 * from its own clock would draw a ghost card against a server still accepting answers.
 */
export function describeExpiry(card: Pick<CardViewModel, 'expiresAt'>, now: number): ExpiryDisplay | null {
  if (card.expiresAt == null) return null
  const left = card.expiresAt - now
  return { at: card.expiresAt, countdownSeconds: left > 0 && left <= 60_000 ? Math.ceil(left / 1000) : null }
}
