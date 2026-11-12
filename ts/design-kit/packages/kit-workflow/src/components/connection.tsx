/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/connection.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/connection.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Raw stroke, white endpoint and dimensions replaced by token CSS; expose connection validation state.
 */
import type { ConnectionLineComponentProps } from '@xyflow/react'

const HALF = 0.5
type ConnectionProps = Pick<ConnectionLineComponentProps, "fromX" | "fromY" | "toX" | "toY" | "connectionStatus">
export const Connection = ({ fromX, fromY, toX, toY, connectionStatus }: ConnectionProps) => (
  <g className="wf-connection" data-status={connectionStatus}>
    <path d={`M${fromX},${fromY} C ${fromX + (toX - fromX) * HALF},${fromY} ${fromX + (toX - fromX) * HALF},${toY} ${toX},${toY}`} fill="none" />
    <circle cx={toX} cy={toY} />
  </g>
)
