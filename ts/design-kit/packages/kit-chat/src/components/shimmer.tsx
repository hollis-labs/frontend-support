/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/shimmer.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/shimmer.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: motion/react replaced by opt-in CSS; token colors/spacing; reduced motion; no module cache.
 */
import { memo, type CSSProperties, type ElementType } from 'react'
import { cn } from '@hollis-labs/design-components'

export interface TextShimmerProps {
  children: string
  as?: ElementType
  className?: string
  /** Seconds per sweep. Zero disables motion. */
  duration?: number
  /** Highlight width multiplier relative to text length and the spacing token. */
  spread?: number
}

export const Shimmer = memo(function Shimmer({ children, as: Component = 'p', className, duration = 2, spread = 2 }: TextShimmerProps) {
  const seconds = Number.isFinite(duration) && duration >= 0 ? duration : 2
  const width = Number.isFinite(spread) && spread >= 0 ? spread : 2
  return (
    <Component className={cn('hl-chat-shimmer relative inline-block text-fg-muted', className)}
      style={{ '--hl-chat-shimmer-duration': `${seconds}s`, '--hl-chat-shimmer-spread': children.length * width / 4 } as CSSProperties}>
      {children}
    </Component>
  )
})
