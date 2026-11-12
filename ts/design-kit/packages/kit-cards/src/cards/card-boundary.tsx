import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Bug } from 'lucide-react'
import { Envelope, EnvelopeBody, EnvelopeHeader } from './envelope'

/**
 * Keeps one broken card from taking the transcript down.
 *
 * THIS IS NOT THE MISS BOUNDARY, AND THE DISTINCTION MATTERS. `resolve` never throws
 * — a wire kind with no renderer comes back as a classification and `CardMiss` draws
 * it. So this boundary is not for "we could not find a renderer"; it is for a
 * renderer that WAS found, ran, and threw partway through drawing. Wrapping
 * resolution in a try/catch would be defending against a failure the protocol already
 * made impossible, while leaving the real one uncovered.
 *
 * IT IS A CLASS COMPONENT BECAUSE REACT STILL HAS NO HOOK FOR THIS. `getDerivedStateFromError`
 * has no function-component equivalent in React 19, so this is the one class in the
 * package and it is not a style choice.
 *
 * THE KEY PROP IS THE RESET, and it is the caller's job. A boundary that has caught
 * an error stays caught until it is remounted; passing `key={envelopeId}` at the call
 * site means a new envelope gets a fresh boundary while a re-render of the broken one
 * stays broken, which is the behaviour you want. There is deliberately no "try again"
 * button: re-rendering the same component with the same props reproduces the same
 * throw, and a button that visibly does nothing is worse than no button.
 */

export interface CardBoundaryProps {
  readonly children: ReactNode
  /** Named in the failure card, so the person can say which card broke. */
  readonly wireKind?: string
  /**
   * Report it. A thrown card is a real defect and the transcript is not a bug
   * tracker — without this the only record is a card that quietly reads "failed".
   */
  readonly onError?: (error: Error, info: ErrorInfo) => void
  /** Replace the failure card entirely. */
  readonly fallback?: (error: Error) => ReactNode
}

interface CardBoundaryState {
  readonly error: Error | null
}

export class CardBoundary extends Component<CardBoundaryProps, CardBoundaryState> {
  state: CardBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): CardBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  render(): ReactNode {
    const { error } = this.state
    if (error == null) return this.props.children
    if (this.props.fallback) return this.props.fallback(error)

    return (
      <Envelope accent="danger">
        <EnvelopeHeader
          icon={Bug}
          label="Card failed"
          tone="danger"
          meta={this.props.wireKind != null ? <code>{this.props.wireKind}</code> : null}
        />
        <EnvelopeBody
          title="This card threw while rendering."
          description="The rest of the conversation is unaffected. This is a defect in the card, not in what it was trying to show."
        >
          {/*
            * THE MESSAGE IS SHOWN, NOT SWALLOWED. A boundary that hides the reason
            * makes every report "a card broke", which is unactionable. The stack is
            * deliberately NOT shown — it is noise in a transcript and `onError` is
            * where a host sends it.
            */}
          <p className="font-mono text-xs break-words text-danger">{error.message}</p>
        </EnvelopeBody>
      </Envelope>
    )
  }
}
