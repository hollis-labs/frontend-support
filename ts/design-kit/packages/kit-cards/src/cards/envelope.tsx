import type { HTMLAttributes, ReactNode } from 'react'
import { cn, ACCENT_BORDER_L_CLASSES, ACCENT_TEXT_CLASSES, type Accent } from '@hollis-labs/design-components'
import type { IconComponent } from '@hollis-labs/design-components'

/**
 * The card chassis — the shell every card in this kit composes from.
 *
 * WHY THE NAME IS `Envelope` AND NOT `Card`. `docs/token-contract.md` §12 names this
 * component, by this name, as where the portfolio's inset accent stripe goes. It is
 * also what Nanite has called the shape since it was built, and renaming a thing two
 * documents already name buys nothing.
 *
 * ACCENT IS TYPED OFF THE CONTRACT, AND THAT IS THE WHOLE RECONCILIATION. Nanite's
 * `EnvelopeTone` is seven values — neutral, primary, success, warning, danger, info,
 * brand — and `design-components`' `Accent` is `ContractAccent | 'neutral'`, which is
 * the same seven. So there is no mapping table, no third tone vocabulary, and no
 * local string-literal union: dropping a tone from the contract becomes a compile
 * error here rather than a prop pointing at a token that no longer exists.
 *
 * AND THE ARBITRARY VALUE DIES AS A SIDE EFFECT. Nanite draws the stripe with
 * `shadow-[inset_3px_0_0_0_var(--color-success)]`, once per tone — nine occurrences
 * that §12 lists as debt. Drawing it with `border-l-4` plus the
 * `ACCENT_BORDER_L_CLASSES` map that `design-components` already ships retires them
 * because the right component exists, not because anyone went hunting. 4px is a named
 * step; 3px was not.
 */

export interface EnvelopeProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Draws the left accent rule. ABSENT MEANS NO RULE — `neutral` is a rule in the
   * border colour, which is a different thing and the distinction is load-bearing:
   * most cards want no stripe at all, and an unaccented card is the common case.
   */
  readonly accent?: Accent
  /**
   * Dial the card back for a terminal state — applied, rejected, dismissed. A
   * resolved decision should still be readable and should stop competing for
   * attention with the live conversation around it.
   */
  readonly muted?: boolean
}

export function Envelope({ accent, muted, className, children, ...rest }: EnvelopeProps) {
  return (
    <div
      data-slot="envelope"
      data-accent={accent}
      className={cn(
        'relative min-w-0 w-full overflow-hidden rounded-panel border border-border-subtle bg-bg-elevated',
        accent ? cn('border-l-4', ACCENT_BORDER_L_CLASSES[accent]) : null,
        muted ? 'opacity-70' : null,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export interface EnvelopeHeaderProps {
  readonly icon?: IconComponent
  /** The mono, uppercase kicker. Short — it is a category, not a title. */
  readonly label: ReactNode
  /** Right-aligned, usually a count, a timestamp or an id. */
  readonly meta?: ReactNode
  /**
   * Colours the ICON only. `Envelope`'s `accent` draws the left rule; these are
   * deliberately separate so a card can carry a quiet frame and a loud glyph.
   */
  readonly tone?: Accent
  /** Rightmost slot, after `meta` — actions belong here. */
  readonly action?: ReactNode
  readonly className?: string
}

export function EnvelopeHeader({
  icon: Icon,
  label,
  meta,
  tone = 'neutral',
  action,
  className,
}: EnvelopeHeaderProps) {
  return (
    <div
      data-slot="envelope-header"
      className={cn('flex items-center justify-between gap-3 px-4 py-2.5', className)}
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? <Icon className={cn('size-3.5 shrink-0', ACCENT_TEXT_CLASSES[tone])} /> : null}
        <span className="truncate font-mono text-label font-semibold uppercase tracking-label text-fg-muted">
          {label}
        </span>
      </div>
      {meta != null || action != null ? (
        <div className="flex shrink-0 items-center gap-2">
          {meta != null ? <span className="font-mono text-label text-fg-muted">{meta}</span> : null}
          {action}
        </div>
      ) : null}
    </div>
  )
}

export interface EnvelopeBodyProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The display title — distinct from the header's mono kicker. */
  readonly title?: ReactNode
  readonly description?: ReactNode
}

export function EnvelopeBody({
  title,
  description,
  className,
  children,
  ...rest
}: EnvelopeBodyProps) {
  const hasLede = title != null || description != null

  return (
    <div data-slot="envelope-body" className={cn('min-w-0 px-4 py-3 [overflow-wrap:anywhere]', className)} {...rest}>
      {title != null ? <h3 className="text-sm font-semibold leading-snug text-fg">{title}</h3> : null}
      {description != null ? (
        <p className="mt-1 text-control leading-relaxed text-fg-secondary">{description}</p>
      ) : null}
      {hasLede && children != null ? <div className="mt-3">{children}</div> : null}
      {hasLede ? null : children}
    </div>
  )
}

export type EnvelopeFooterProps = HTMLAttributes<HTMLDivElement>

/**
 * The action row. Bordered on top, because a footer that carries buttons needs to
 * read as separate from the content those buttons act on.
 */
export function EnvelopeFooter({ className, children, ...rest }: EnvelopeFooterProps) {
  return (
    <div
      data-slot="envelope-footer"
      className={cn('flex items-center gap-2 border-t border-border-subtle px-4 py-2.5', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export interface EnvelopeSectionProps extends HTMLAttributes<HTMLDivElement> {
  readonly label?: ReactNode
}

/** A labelled block inside the body — for cards that group more than one thing. */
export function EnvelopeSection({ label, className, children, ...rest }: EnvelopeSectionProps) {
  return (
    <div data-slot="envelope-section" className={cn('space-y-1.5', className)} {...rest}>
      {label != null ? (
        <div className="font-mono text-caption font-semibold uppercase tracking-label text-fg-muted">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  )
}
