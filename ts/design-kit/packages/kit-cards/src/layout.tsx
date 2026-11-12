import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'
import { fieldIds } from './field-ids'
import { EnvelopeSection, type EnvelopeSectionProps } from './cards/envelope'

/**
 * The closed layout set: Stack, Row, Section, Field, ActionBar. A platform user
 * composes cards from these instead of writing JSX with raw classes; nothing here
 * takes a class-shaped prop for spacing, so the set cannot grow a value.
 */

const GAP = { sm: 'gap-1.5', md: 'gap-3', lg: 'gap-5' } as const
export type LayoutGap = keyof typeof GAP

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  readonly gap?: LayoutGap
}
export function Stack({ gap = 'md', className, ...rest }: StackProps) {
  return <div data-slot="stack" className={cn('flex min-w-0 flex-col', GAP[gap], className)} {...rest} />
}

export interface RowProps extends HTMLAttributes<HTMLDivElement> {
  readonly gap?: LayoutGap
  /** Wrap on a narrow viewport. Default true: a row never forces document scroll. */
  readonly wrap?: boolean
}
export function Row({ gap = 'md', wrap = true, className, ...rest }: RowProps) {
  return (
    <div
      data-slot="row"
      className={cn('flex min-w-0 items-center', GAP[gap], wrap ? 'flex-wrap' : null, className)}
      {...rest}
    />
  )
}

export function Section(props: EnvelopeSectionProps) {
  return <EnvelopeSection {...props} />
}

export interface FieldProps {
  /** The control's id; the hint and error ids derive from it (see `fieldIds`). */
  readonly id: string
  readonly label: ReactNode
  readonly required?: boolean
  readonly hint?: ReactNode
  /** Inline error. Rendered with danger tone and linked by `aria-describedby`. */
  readonly error?: ReactNode
  readonly className?: string
  readonly children: ReactNode
}

export function Field({ id, label, required, hint, error, className, children }: FieldProps) {
  const ids = fieldIds(id)
  return (
    <div data-slot="field" className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-control font-medium text-fg">
        {label}
        {required ? <span className="text-danger" aria-hidden> *</span> : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      {children}
      {hint != null ? <p id={ids.hint} className="text-caption text-fg-muted">{hint}</p> : null}
      {error != null ? <p id={ids.error} className="text-caption text-danger">{error}</p> : null}
    </div>
  )
}

export type ActionBarProps = HTMLAttributes<HTMLDivElement>
/** The action row. Wraps rather than overflows; right-aligned, primary last. */
export function ActionBar({ className, ...rest }: ActionBarProps) {
  return (
    <div
      data-slot="action-bar"
      role="group"
      className={cn('flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2', className)}
      {...rest}
    />
  )
}
