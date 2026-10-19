/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/image.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/image.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: native host-owned src/alt/mediaType props; no AI SDK or base64 conversion; shared cn and token radius.
 */
import type { ComponentProps } from 'react'
import { cn } from '@hollis-labs/design-components'

export type ImageProps = Omit<ComponentProps<'img'>, 'src' | 'alt'> & {
  src: string
  /** Required alternative text; use an empty string for a decorative image. */
  alt: string
  /** Host-supplied metadata, not a conversion instruction. */
  mediaType?: string
}

export function Image({ src, alt, mediaType, className, ...props }: ImageProps) {
  return <img {...props} src={src} alt={alt} data-media-type={mediaType} className={cn('h-auto max-w-full rounded-panel', className)} />
}
