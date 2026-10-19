/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/edge.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/edge.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Token CSS instead of raw SVG values/SMIL; motion opt-in with reduced-motion fallback; honor resolved coordinates and markers for all handle orientations.
 */
import { Animated } from './edge-animated'
import { Temporary } from './edge-temporary'

export const Edge = { Animated, Temporary }
