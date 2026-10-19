import { useState, type ReactNode } from 'react'
import { cn } from '../lib/utils'
import { ACCENT_BORDER_L_CLASSES, type Accent } from '../lib/tone'
import { ChevronRight } from 'lucide-react'

interface CollapsibleSectionProps {
  label: string
  /**
   * Left accent-bar tint. Default `neutral`.
   *
   * REPLACES sysop-ui's `SectionAccent = 'blue' | 'violet' | 'amber' | 'red' |
   * 'green' | 'neutral'`. CW-0116 §E called that the worst of the nine API
   * violations, and it is: the PUBLIC TYPE was a list of colour names, so every
   * consumer's call site named a colour. The one rule governs a component's API
   * as much as its internals, and a prop whose values are colours moves the
   * violation outward to everyone who imports it.
   *
   * The mapping is by intent — blue meant informational, red meant dangerous,
   * green meant good. Those meanings survive a re-theme; the colour names do not.
   *   blue -> info   violet -> primary   amber -> warning
   *   red  -> danger green  -> success   neutral -> neutral
   */
  accent?: Accent
  children: ReactNode
  /** Default true. `false` → always open, no toggle. */
  collapsible?: boolean
  /** Initial open state when collapsible. Default false. */
  defaultOpen?: boolean
  /** Inline summary shown beside the label while collapsed. */
  summary?: string
  className?: string
}

/**
 * Accent-bordered, collapsible detail section. For the flat titled divider
 * inside a `DetailDialog`, use `DetailSection` instead.
 */
export function CollapsibleSection({
  label,
  accent = 'neutral',
  children,
  collapsible = true,
  defaultOpen = false,
  summary,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true)
  const show = !collapsible || open

  return (
    <section
      className={cn(
        'rounded-md border border-l-2 border-divider bg-bg',
        ACCENT_BORDER_L_CLASSES[accent],
        className,
      )}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-hover/40"
        >
          <span className="text-caption uppercase tracking-label text-fg-faint">{label}</span>
          <span className="flex items-center gap-2 text-caption text-fg-faint">
            {summary && !open ? <span className="max-w-md truncate">{summary}</span> : null}
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', open && 'rotate-90')}
            />
          </span>
        </button>
      ) : (
        <div className="px-3 py-2">
          <span className="text-caption uppercase tracking-label text-fg-faint">{label}</span>
        </div>
      )}
      {show ? (
        <div className="border-t border-divider px-3 py-3">{children}</div>
      ) : null}
    </section>
  )
}
