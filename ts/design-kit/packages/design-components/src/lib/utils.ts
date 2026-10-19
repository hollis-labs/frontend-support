import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { RADIUS_TOKENS, TEXT_TOKENS } from '@hollis-labs/design-tokens'

// Unknown text-* names otherwise fall into the color group: text-info would
// erase text-caption and leave a Pill at its inherited font size.
const merge = extendTailwindMerge({
  extend: {
    // Tailwind's radius theme feeds the existing rounded/corner groups, so
    // contract names conflict with known steps and keep last-argument semantics.
    theme: { radius: [...RADIUS_TOKENS] },
    classGroups: { 'font-size': [{ text: [...TEXT_TOKENS] }] },
  },
})

/**
 * `cn()` comes from sysop-ui's `lib/utils.ts`, which the CW-0116 triage split by
 * measurement rather than by argument: this goes here because every component
 * needs it and no transport code does, and the four display formatters that
 * shared the file went to `design-app-runtime` because **zero kit components use
 * them** — verified. Nothing was left behind; the other half is
 * `@hollis-labs/design-app-runtime`'s `lib/format.ts`.
 */
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
