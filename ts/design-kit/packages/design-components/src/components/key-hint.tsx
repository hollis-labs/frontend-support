import type { HTMLAttributes } from 'react'
import { cn } from '../lib/utils'

/**
 * A key hint: one keycap, or a chord as `keys={['Ctrl', 'K']}` (rendered as separate caps).
 * Presentational only; it binds nothing. Use it in menus, tooltips and help text.
 */
export interface KeyHintProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** A single key label, or the keys of a chord in order. */
  readonly keys: string | readonly string[]
}

export function KeyHint({ keys, className, ...props }: KeyHintProps) {
  const list = typeof keys === 'string' ? [keys] : keys
  return (
    <span data-slot="key-hint" className={cn('inline-flex items-center gap-0.5', className)} {...props}>
      {list.map((key, i) => (
        <kbd
          key={`${i}-${key}`}
          className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-border bg-bg-elevated px-1 font-mono text-caption leading-4 text-fg-muted"
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}
