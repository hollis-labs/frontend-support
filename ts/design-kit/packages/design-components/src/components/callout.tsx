import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CircleCheck, Info } from 'lucide-react'
import { cn } from '../lib/utils'
import { TONE_CLASSES, type Tone } from '../lib/tone'

const TONE_ICONS: Record<Tone, ReactNode> = {
  neutral: <Info />,
  success: <CircleCheck />,
  danger: <AlertCircle />,
  warning: <AlertTriangle />,
  info: <Info />,
}

interface CalloutProps {
  /** Color tone. Default `info`. */
  tone?: Tone
  /** Optional eyebrow label, rendered uppercase above the body. */
  title?: string
  /** Override the default tone icon. Pass `null` to omit the icon entirely. */
  icon?: ReactNode
  /** Trailing action slot — buttons, links. */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * Tone-colored message box — the generic alert/notice primitive. Apps wrap it
 * for domain notices (a blocked-reason banner, a checkpoint prompt) instead of
 * re-styling a bordered box each time.
 */
export function Callout({
  tone = 'info',
  title,
  icon,
  actions,
  className,
  children,
}: CalloutProps) {
  const resolvedIcon = icon === undefined ? TONE_ICONS[tone] : icon
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-md border px-4 py-3 text-control',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {resolvedIcon ? (
        <span className="mt-0.5 shrink-0 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>
          {resolvedIcon}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? (
          <div className="text-caption font-medium uppercase tracking-label">{title}</div>
        ) : null}
        <div className="min-w-0 break-words leading-relaxed">{children}</div>
      </div>
      {actions ? <div className="flex shrink-0 items-start gap-2">{actions}</div> : null}
    </div>
  )
}
