/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/edge.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/edge.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Token CSS instead of raw SVG values/SMIL; motion opt-in with reduced-motion fallback; honor resolved coordinates and markers for all handle orientations.
 */
import { BaseEdge, getSimpleBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export const Temporary = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerStart, markerEnd, style }: EdgeProps) => {
  const [path] = getSimpleBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  return <BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} className="wf-edge-temporary" style={style} />
}
