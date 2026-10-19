import { Streamdown } from 'streamdown'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'

/**
 * `@hollis-labs/kit-chat/markdown` — streaming-safe markdown for a chat transcript.
 *
 * WHY THIS IS A SEPARATE SUBPATH AND AN OPTIONAL PEER, which is the whole point:
 * `streamdown` adds 11,148 kB to a consumer's `node_modules` — more than the entire
 * Base UI headless layer this portfolio accepted. `ChatStream` therefore takes
 * already-rendered content and knows nothing about markdown, and a host that renders
 * its own markdown, or none, pays nothing for this. Importing this module is the
 * moment you opt in.
 *
 * WHY streamdown RATHER THAN ASSEMBLING marked + Shiki OURSELVES. Streaming markdown
 * is a genuinely hard problem and an easy one to get subtly wrong: content arrives
 * token by token, so the parser sees unterminated code fences, half-written tables and
 * dangling emphasis on every frame. `streamdown` solves that with `remend` and has
 * been through more edge cases than we would write tests for. `marked` is 488 kB and
 * would have left that work to us. Behind an opt-in export, buying the correctness is
 * the right trade; in the base package it would not have been.
 *
 * YOU MUST ADD ONE `@source` LINE TO USE THIS. See `../styles/markdown.css`, which
 * ships it so you do not have to count `../` segments, and the `/markdown` section of
 * this package's README.
 */

export interface ChatMarkdownProps
  extends Omit<ComponentProps<typeof Streamdown>, 'children' | 'mode' | 'className'> {
  /** The markdown source. Partial is fine — that is what this is for. */
  readonly children: string
  /**
   * Whether more content is still arriving.
   *
   * Maps to streamdown's `mode`, and it matters: in streaming mode it repairs
   * unterminated constructs so a half-written fence renders as a code block instead of
   * as literal backticks. Leaving it on after a stream finishes is harmless; leaving it
   * off during one is the visible bug.
   */
  readonly streaming?: boolean
  readonly className?: string
}

/**
 * A `Streamdown` with this design system's tokens applied and nothing else added.
 *
 * Deliberately thin. Every `StreamdownProps` option passes through, so a host that
 * needs Mermaid, KaTeX, a different Shiki theme or its own component overrides
 * configures them here rather than waiting for us to surface a prop.
 */
export function ChatMarkdown({ children, streaming = false, className, ...rest }: ChatMarkdownProps) {
  return (
    <Streamdown
      mode={streaming ? 'streaming' : 'static'}
      className={cn('text-control text-fg', className)}
      {...rest}
    >
      {children}
    </Streamdown>
  )
}

/**
 * Re-exported so a host configuring streamdown does not need a direct import of a
 * package it declared as an optional peer — and so the version it configures against
 * is the one this module renders with.
 */
export type { StreamdownProps } from 'streamdown'
export type ChatMarkdownNode = ReactNode
