import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import type { IconComponent } from '@hollis-labs/design-components'
import type { Tone } from '@hollis-labs/design-tokens'
import { Envelope, EnvelopeBody, EnvelopeHeader } from './envelope'

/**
 * A titled statement with a tone. The simplest card there is, and the one a host
 * reaches for when the agent has something to say that is not a message.
 *
 * `tone` IS THE CONTRACT'S `Tone`, NOT A LOCAL UNION. Nanite calls this prop
 * `variant` and types it `'info' | 'success' | 'warning' | 'danger'` inline — the
 * same four names the contract ships as `Tone`, restated. Typed off the export, the
 * four stay in sync by construction, and `neutral` is correctly NOT offered: a card
 * whose whole job is to signal a state has no neutral state to signal.
 *
 * AND IT COMES FROM `design-tokens`, NOT `design-components`. The two export a
 * `Tone` and they are DIFFERENT TYPES: the contract's is the four feedback names,
 * and base widens it to `ContractTone | 'neutral'` because a Pill needs an unstyled
 * default. Importing the wrong one here is a compile error rather than a card with a
 * `neutral` branch nobody wrote — which is how this was caught.
 */

export interface InfoCardProps {
  readonly title: ReactNode
  readonly body?: ReactNode
  /** Default `info`. Drives the icon, the kicker and the accent rule together. */
  readonly tone?: Tone
  /** Override the mono kicker. Defaults to a word matching the tone. */
  readonly label?: ReactNode
  readonly className?: string
}

const TONE_PRESET = {
  info: { icon: Info, label: 'Info' },
  success: { icon: CheckCircle, label: 'Success' },
  warning: { icon: AlertTriangle, label: 'Notice' },
  danger: { icon: XCircle, label: 'Alert' },
} as const satisfies Record<Tone, { icon: IconComponent; label: string }>

export function InfoCard({ title, body, tone = 'info', label, className }: InfoCardProps) {
  const preset = TONE_PRESET[tone]

  return (
    <Envelope accent={tone} className={className}>
      <EnvelopeHeader icon={preset.icon} label={label ?? preset.label} tone={tone} />
      <EnvelopeBody title={title} description={body} />
    </Envelope>
  )
}
