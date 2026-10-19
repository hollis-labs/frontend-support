import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Position, ReactFlowProvider, getBezierPath, getSimpleBezierPath } from '@xyflow/react'
import type { EdgeProps, Node as FlowNode, NodeProps } from '@xyflow/react'
import { Canvas, Connection, Controls, Edge, Node, NodeContent, NodeHeader, NodeTitle, Panel, Toolbar } from '../canvas'

beforeAll(() => {
  // jsdom has no layout engine. Supply the browser measurement boundary while
  // keeping React Flow's provider, handles, controls and event dispatch real.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('DOMMatrixReadOnly', class { m22 = 1 })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 800 })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 600 })
})
afterEach(cleanup)

type Step = FlowNode<{ label: string }, 'step'>
function StepNode({ data }: NodeProps<Step>) {
  return <Node handles={{ source: true, target: true }} targetHandleProps={{ id: 'in', position: Position.Top }} sourceHandleProps={{ id: 'out', position: Position.Bottom }}>
    <NodeHeader><NodeTitle>{data.label}</NodeTitle></NodeHeader><NodeContent>Details</NodeContent>
    <Toolbar isVisible><button>Inspect</button></Toolbar>
  </Node>
}
const nodeTypes = { step: StepNode }
const nodes: Step[] = [{ id: 'step', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Validate' } }]
const geometry: EdgeProps = { id: 'edge', source: 'one', target: 'two', sourceX: 100, sourceY: 150, targetX: 300, targetY: 240, sourcePosition: Position.Bottom, targetPosition: Position.Top, data: {}, selected: false, animated: false, selectable: true, deletable: true }

describe('real workflow renderer', () => {
  it('renders custom nodes, handle IDs/orientations, panel and toolbar; reports host selection', async () => {
    const onNodeClick = vi.fn()
    const { container } = render(<Canvas<Step> nodes={nodes} edges={[]} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView={false}><Panel position="top-right">Inspector</Panel><Controls /></Canvas>)
    expect(screen.getByText('Validate')).toBeTruthy()
    expect(screen.getByText('Inspector')).toBeTruthy()
    expect(screen.getByText('Inspect')).toBeTruthy()
    expect(container.querySelector('[data-handleid="in"]')?.classList.contains('react-flow__handle-top')).toBe(true)
    expect(container.querySelector('[data-handleid="out"]')?.classList.contains('react-flow__handle-bottom')).toBe(true)
    fireEvent.click(screen.getByText('Validate'))
    await waitFor(() => expect(onNodeClick).toHaveBeenCalled())
    expect(onNodeClick.mock.calls[0][1].id).toBe('step')
    expect(container.querySelector('.kit-workflow')).toBeTruthy()
  })

  it('allows a read-only host to disable dragging, connection, deletion and built-in background', () => {
    const { container } = render(<Canvas<Step> nodes={nodes} edges={[]} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false} deleteKeyCode={null} background={false} fitView={false}><Controls showInteractive={false} /></Canvas>)
    expect(container.querySelector('.react-flow__node')?.classList.contains('draggable')).toBe(false)
    expect(container.querySelector('.react-flow__background')).toBeNull()
    expect(screen.queryByRole('button', { name: /toggle interactivity/i })).toBeNull()
  })

  it('forwards controls callbacks and custom panel/toolbar properties', () => {
    const onZoomIn = vi.fn()
    const { container } = render(<ReactFlowProvider><Controls onZoomIn={onZoomIn} /><Panel position="bottom-left" aria-label="Facts">Facts</Panel><Toolbar nodeId="step" isVisible offset={20}><span>Actions</span></Toolbar></ReactFlowProvider>)
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))
    expect(onZoomIn).toHaveBeenCalledOnce()
    expect(screen.getByLabelText('Facts').classList.contains('bottom')).toBe(true)
    expect(container.querySelector('.wf-controls')).toBeTruthy()
  })
})

describe('edge and connection geometry', () => {
  it('uses resolved top/bottom handle coordinates and forwards markers/style on animated edges', () => {
    const [path] = getBezierPath(geometry)
    const { container } = render(<svg><Edge.Animated {...geometry} markerEnd="url(#arrow)" style={{ stroke: 'var(--color-info)' }} /></svg>)
    const edge = container.querySelector('.react-flow__edge-path')!
    expect(edge.getAttribute('d')).toBe(path)
    expect(edge.getAttribute('marker-end')).toBe('url(#arrow)')
    expect(edge.getAttribute('style')).toContain('var(--color-info)')
    expect(container.querySelector('.wf-edge-traveller')?.getAttribute('style')).toContain(path)
  })
  it('renders dashed temporary geometry and preserves caller markers', () => {
    const [path] = getSimpleBezierPath(geometry)
    const { container } = render(<svg><Edge.Temporary {...geometry} markerStart="url(#start)" /></svg>)
    const edge = container.querySelector('.wf-edge-temporary')!
    expect(edge.getAttribute('d')).toBe(path)
    expect(edge.getAttribute('marker-start')).toBe('url(#start)')
  })
  it('projects connection coordinates and validation state without app semantics', () => {
    const { container } = render(<svg><Connection fromX={10} fromY={20} toX={90} toY={60} connectionStatus="invalid" /></svg>)
    expect(container.querySelector('path')?.getAttribute('d')).toBe('M10,20 C 50,20 50,60 90,60')
    expect(container.querySelector('circle')?.getAttribute('cx')).toBe('90')
    expect(container.querySelector('g')?.getAttribute('data-status')).toBe('invalid')
  })
})
