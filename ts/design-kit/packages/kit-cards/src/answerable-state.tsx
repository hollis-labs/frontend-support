import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle, Clock, Link2Off, XCircle } from 'lucide-react'
import type { IconComponent, Tone } from '@hollis-labs/design-components'
import { acceptsInput, classifyPriorResponse, type PriorResponseState } from './response'

/** Shared answerable state. See answerable.tsx for the components that draw it. */

/** Who, when and what was chosen — the post-resolve form of every answerable card. */
export interface CardReceipt {
  readonly who?: ReactNode
  readonly when?: ReactNode
  readonly summary?: ReactNode
}

/** Read-only because the viewer lacks the assurance the card needs. Not an error. */
export interface CardElevation {
  readonly reason: ReactNode
  /** The elevation CTA slot — a button or link the HOST owns. The kit never elevates. */
  readonly action?: ReactNode
}

export interface AnswerableStateProps {
  /** Whatever the wire last recorded for this card, verbatim. See `response.ts`. */
  readonly priorStatus?: string | null
  /** The host is mid-submit (it owns the request). Combines with the local busy flag. */
  readonly busy?: boolean
  /**
   * The host got a 409: the card changed under the person. Their input is KEPT
   * (nothing here clears it); the card says so and offers `onReload`.
   */
  readonly stale?: boolean
  readonly onReload?: () => void
  readonly elevation?: CardElevation
  readonly receipt?: CardReceipt
  /** Link to the replacement, shown when the recorded status is `superseded`. */
  readonly supersededBy?: ReactNode
}

export interface AnswerableState {
  readonly state: PriorResponseState
  /** The card is open and nothing blocks it from being edited. */
  readonly live: boolean
  /** Controls should be disabled: not live, read-only, stale, or a submit is running. */
  readonly disabled: boolean
  readonly busy: boolean
  /**
   * The card was open in THIS mount and is now terminal — i.e. the person (or a server
   * push) just resolved it. A card that merely mounts terminal never sets this, so a
   * reload does not steal focus. The footer uses it to take focus back from the
   * buttons that just disappeared.
   */
  readonly transitioned: boolean
  /** Run an async responder with the busy flag set around it. */
  readonly run: (fn: () => void | Promise<void>) => Promise<void>
}

export function useAnswerable({
  priorStatus,
  busy: hostBusy,
  stale,
  elevation,
}: Pick<AnswerableStateProps, 'priorStatus' | 'busy' | 'stale' | 'elevation'>): AnswerableState {
  const state = classifyPriorResponse(priorStatus)
  const [localBusy, setLocalBusy] = useState(false)
  const busy = localBusy || hostBusy === true
  const live = acceptsInput(state)
  const [wasLive, setWasLive] = useState(live)
  if (live && !wasLive) setWasLive(true)
  const disabled = !live || busy || stale === true || elevation != null

  async function run(fn: () => void | Promise<void>) {
    if (disabled) return
    setLocalBusy(true)
    try {
      await fn()
    } finally {
      setLocalBusy(false)
    }
  }

  return { state, live, disabled, busy, transitioned: wasLive && !live, run }
}

export interface Presentation {
  readonly icon: IconComponent
  readonly tone: Tone
  readonly text: string
  /** Short form for a header pill. */
  readonly short: string
}

export function presentationFor(state: PriorResponseState): Presentation | null {
  switch (state.kind) {
    case 'open':
      return null
    case 'pending':
      return { icon: Clock, tone: 'info', text: 'Working…', short: 'Working' }
    case 'submitted':
      return { icon: CheckCircle, tone: 'success', text: 'Submitted', short: 'Submitted' }
    case 'canceled':
      return { icon: XCircle, tone: 'neutral', text: 'Dismissed', short: 'Dismissed' }
    case 'expired':
      return { icon: Clock, tone: 'neutral', text: 'Expired — no longer accepting answers', short: 'Expired' }
    case 'superseded':
      return { icon: Link2Off, tone: 'neutral', text: 'Superseded by a newer card', short: 'Superseded' }
    case 'failed':
      return { icon: AlertTriangle, tone: 'danger', text: 'Failed', short: 'Failed' }
    case 'unrecognized':
      return { icon: AlertTriangle, tone: 'warning', text: 'Unknown state', short: 'Unknown state' }
  }
}

/** The short pill text for a header `meta` slot. Null while the card is open. */
export function resolvedLabel(state: PriorResponseState): { text: string; tone: Tone } | null {
  const p = presentationFor(state)
  if (!p) return null
  return { text: p.short, tone: p.tone }
}

