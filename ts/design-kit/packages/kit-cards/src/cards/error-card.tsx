import type { ReactNode } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { Button, type Tone } from '@hollis-labs/design-components'
import { ActionBar } from '../layout'
import { CardNotice } from '../answerable'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'

/**
 * A terminal failure, drawn as a card: what went wrong, a code a person can quote, and
 * optionally a retry the HOST owns.
 *
 * REUSE CHECK. `Callout` is the generic notice and is the right tool for a banner —
 * that is `StatusBanner` below. A failure that arrives AS a card (an agent's run died,
 * an effect failed) needs the chassis, the kicker and a detail region, so this is a
 * small composition rather than a Callout in a box. It is not answerable: there is
 * nothing to decide, only a retry the host may expose.
 */

export interface ErrorCardProps {
  readonly title: ReactNode
  readonly description?: ReactNode
  /** A stable code or id to quote. Shown monospace. */
  readonly code?: string
  /** Technical detail, collapsed into its own region. */
  readonly detail?: ReactNode
  readonly onRetry?: () => void
  readonly retryLabel?: ReactNode
  readonly className?: string
}

export function ErrorCard({ title, description, code, detail, onRetry, retryLabel = 'Retry', className }: ErrorCardProps) {
  return (
    <Envelope accent="danger" className={className}>
      <EnvelopeHeader icon={AlertTriangle} tone="danger" label="Failed" meta={code ?? null} />
      <EnvelopeBody title={title} description={description}>
        {detail != null ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-control border border-border-subtle bg-surface p-3 font-mono text-caption text-fg-secondary">
            {detail}
          </pre>
        ) : null}
      </EnvelopeBody>
      {onRetry ? (
        <EnvelopeFooter>
          <ActionBar>
            <Button type="button" variant="outline" size="sm" className="max-sm:min-h-11" onClick={onRetry}>
              {retryLabel}
            </Button>
          </ActionBar>
        </EnvelopeFooter>
      ) : null}
    </Envelope>
  )
}

export interface StatusBannerProps {
  readonly tone?: Tone
  readonly children: ReactNode
  readonly action?: ReactNode
  /** `alert` only when the person must act now. */
  readonly urgent?: boolean
  readonly className?: string
}

/** A one-line status strip. Announces politely unless `urgent`. */
export function StatusBanner({ tone = 'info', children, action, urgent = false, className }: StatusBannerProps) {
  return (
    <CardNotice tone={tone} icon={tone === 'danger' || tone === 'warning' ? AlertTriangle : Info} role={urgent ? 'alert' : 'status'} action={action} className={className}>
      {children}
    </CardNotice>
  )
}
