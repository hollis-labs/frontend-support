/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/canvas.tsx
 * Source:   https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/canvas.tsx
 * Version:  ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Generic controlled props retained; stylesheet is explicit opt-in; token-scoped class; configurable background.
 */
import { Background, ReactFlow } from '@xyflow/react'
import type { Edge as FlowEdge, Node as FlowNode, ReactFlowProps } from '@xyflow/react'
import type { ComponentProps } from 'react'
import { cn } from '@hollis-labs/design-components'

export type CanvasProps<NodeType extends FlowNode = FlowNode, EdgeType extends FlowEdge = FlowEdge> = ReactFlowProps<NodeType, EdgeType> & {
  /** Disable the default background when supplying your own. */
  background?: boolean
  backgroundProps?: ComponentProps<typeof Background>
}
const deleteKeyCode = ['Backspace', 'Delete']

/** Controlled rendering: graph data, mutations and execution remain host-owned. */
export function Canvas<NodeType extends FlowNode = FlowNode, EdgeType extends FlowEdge = FlowEdge>({ children, className, background = true, backgroundProps, ...props }: CanvasProps<NodeType, EdgeType>) {
  return <ReactFlow<NodeType, EdgeType>
    deleteKeyCode={deleteKeyCode} fitView panOnDrag={false} panOnScroll
    selectionOnDrag zoomOnDoubleClick={false}
    {...props} className={cn('kit-workflow', className)}
  >
    {background && <Background {...backgroundProps} />}
    {children}
  </ReactFlow>
}
