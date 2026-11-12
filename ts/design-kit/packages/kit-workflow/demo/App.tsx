import { useCallback, useEffect, useState } from 'react'
import { addEdge, MiniMap, useEdgesState, useNodesState } from '@xyflow/react'
import type { Connection as FlowConnection, Node as FlowNode, NodeProps, Edge as FlowEdge } from '@xyflow/react'
import { Button } from '@hollis-labs/design-components'
import { BUILTIN_THEMES } from '@hollis-labs/design-tokens'
import {
  Canvas, Connection, Controls, Edge, Node, NodeAction, NodeContent,
  NodeDescription, NodeFooter, NodeHeader, NodeTitle, Panel, Toolbar,
} from '../src/canvas'

type Step = FlowNode<{ label: string; description: string; status: string }, 'step'>
function StepNode({ data, selected }: NodeProps<Step>) {
  return <Node handles={{ target: true, source: true }}>
    <NodeHeader>
      <NodeTitle>{data.label}</NodeTitle><NodeDescription>{data.description}</NodeDescription>
      <NodeAction><span className="text-label text-info">{data.status}</span></NodeAction>
    </NodeHeader>
    <NodeContent><p className="text-control text-fg-secondary">Host-owned content and actions</p></NodeContent>
    <NodeFooter><span className="text-caption text-fg-muted">Source reference · local draft</span></NodeFooter>
    <Toolbar isVisible={selected}><Button size="sm" variant="outline" onClick={() => window.alert(data.label)}>Inspect step</Button></Toolbar>
  </Node>
}
const nodeTypes = { step: StepNode }
const edgeTypes = { animated: Edge.Animated, temporary: Edge.Temporary }
const initialNodes: Step[] = [
  { id: 'input', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Resolve source', description: 'Pinned definition', status: 'ready' } },
  { id: 'validate', type: 'step', position: { x: 430, y: 0 }, data: { label: 'Validate graph', description: 'Schema and policy checks', status: 'running' } },
  { id: 'review', type: 'step', position: { x: 860, y: 0 }, data: { label: 'Review result', description: 'Selected facts', status: 'waiting' } },
]
const initialEdges: FlowEdge[] = [
  { id: 'first', source: 'input', target: 'validate', type: 'animated' },
  { id: 'second', source: 'validate', target: 'review', type: 'temporary' },
]
export function App() {
  const [theme, setTheme] = useState('nanite-default')
  const [mode, setMode] = useState<'light' | 'dark'>('dark')
  useEffect(() => {
    // The contract's hand-written CSS aliases resolve at :root.
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.mode = mode
  }, [theme, mode])
  const [readOnly, setReadOnly] = useState(false)
  const [selected, setSelected] = useState('None')
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const onConnect = useCallback((connection: FlowConnection) => setEdges(current => addEdge({ ...connection, type: 'temporary' }, current)), [setEdges])
  return <main data-theme={theme} data-mode={mode} className="min-h-screen bg-bg p-6 font-sans text-fg">
    <header className="mb-4 flex flex-wrap items-center gap-4">
      <h1 className="text-lg font-semibold">Workflow canvas</h1>
      <label className="flex items-center gap-2 text-control">Theme <select aria-label="Theme" value={theme} onChange={event => setTheme(event.target.value)} className="rounded-control border border-border bg-surface p-2">{BUILTIN_THEMES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <Button variant="outline" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>{mode === 'dark' ? 'Light mode' : 'Dark mode'}</Button>
      <Button variant="outline" onClick={() => setReadOnly(!readOnly)}>{readOnly ? 'Enable editing' : 'Read-only graph'}</Button>
    </header>
    <section className="h-[70vh] overflow-hidden rounded-panel border border-border" aria-label="Workflow demo">
      <Canvas<Step> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} connectionLineComponent={Connection} nodesDraggable={!readOnly} nodesConnectable={!readOnly}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']} onNodeClick={(_, node) => setSelected(node.data.label)}>
        <Controls showInteractive={!readOnly} /><MiniMap pannable zoomable />
        <Panel position="top-left"><span className="px-2 text-control">{readOnly ? 'Run inspection' : 'Draft authoring'} · selected: {selected}</span></Panel>
      </Canvas>
    </section>
    <p className="mt-4 text-sm text-fg-muted">Drag steps, connect ports, select a node for its toolbar, and use controls to zoom. Execution, persistence and inspectors belong to the host.</p>
  </main>
}
