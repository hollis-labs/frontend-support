// @vitest-environment jsdom
import { lazy, useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PluginHostProvider, PluginPanelBody, PluginRenderBoundary, usePluginPanels } from '../src/react.js'
import { harness } from './helpers.js'
afterEach(cleanup)
function Rail() { const panels = usePluginPanels(); return <>{panels.map(panel => <PluginPanelBody key={panel.id} panel={panel} />)}</> }
it('preserves healthy state, injects host context last and removes revoked owners', async () => {
  function View({ session_id }: Record<string, unknown>) { const [count, setCount] = useState(0); return <button onClick={() => setCount(count + 1)}>{String(session_id)}:{count}</button> }
  const h = harness(View)
  render(<PluginHostProvider runtime={h.runtime}><Rail /></PluginHostProvider>)
  fireEvent.click(screen.getByRole('button')); expect(screen.getByText('host-session:1')).toBeTruthy()
  await act(() => h.runtime.sync([{ ...h.entry(), metadata: { unrelated: true } }]))
  expect(screen.getByText('host-session:1')).toBeTruthy()
  await act(() => h.runtime.sync([])); expect(screen.queryByRole('button')).toBeNull()
})
it('isolates throwing exports and recovers on replacement', () => {
  const noise = vi.spyOn(console, 'error').mockImplementation(() => {})
  function Broken(): never { throw new Error('private details') }
  const h = harness(Broken)
  render(<PluginHostProvider runtime={h.runtime}><Rail /><p>Sibling</p></PluginHostProvider>)
  expect(screen.getByText('Plugin view failed.')).toBeTruthy(); expect(screen.getByText('Sibling')).toBeTruthy()
  act(() => h.replace(() => <p>Recovered</p>))
  expect(screen.getByText('Recovered')).toBeTruthy(); expect(screen.queryByText('private details')).toBeNull()
  noise.mockRestore()
})
it('shows Suspense fallback and blocks same-realm rendering after isolation changes', async () => {
  let resolve!: (value: { default: () => React.ReactNode }) => void
  const Lazy = lazy(() => new Promise<{ default: () => React.ReactNode }>(done => { resolve = done }))
  const h = harness(Lazy)
  render(<PluginHostProvider runtime={h.runtime}><Rail /></PluginHostProvider>)
  expect(screen.getByText('Loading plugin view…')).toBeTruthy()
  await act(async () => { resolve({ default: () => <p>Loaded</p> }) })
  expect(screen.getByText('Loaded')).toBeTruthy()
  act(() => h.isolation.set({ appId: 'app', effectiveMode: 'sandboxed-frame', revision: '2' }))
  expect(screen.queryByText('Loaded')).toBeNull(); expect(screen.getByText('Isolated renderer required.')).toBeTruthy()
})
it('does not reset healthy children when the boundary reset key changes', () => {
  function Counter() { const [count, setCount] = useState(0); return <button onClick={() => setCount(count + 1)}>{count}</button> }
  const view = render(<PluginRenderBoundary resetKey="one"><Counter /></PluginRenderBoundary>)
  fireEvent.click(screen.getByRole('button'))
  view.rerender(<PluginRenderBoundary resetKey="two"><Counter /></PluginRenderBoundary>)
  expect(screen.getByText('1')).toBeTruthy()
})
it('keeps same-label review rows distinct and blocks approval and cancellation while busy', async () => {
  const { PluginReviewDialog } = await import('../src/react.js')
  const approve = vi.fn(), change = vi.fn()
  const view = render(<PluginReviewDialog open title="Review" rows={[{ id: 'tool:one', label: 'Shared label', change: 'added' }, { id: 'cap:one', label: 'Shared label', change: 'removed' }]} busy onApprove={approve} onOpenChange={change} />)
  expect(screen.getAllByText('Shared label')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Applying…' }))
  expect(approve).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled()
  view.rerender(<PluginReviewDialog open title="Review" rows={[]} onApprove={approve} onOpenChange={change} />)
  fireEvent.click(screen.getByRole('button', { name: 'Approve' })); expect(approve).toHaveBeenCalledOnce()
})
it('selects registry v2 drawer.tab declarations and renders an owner-qualified tab ID', async () => {
  const { usePluginDrawerTabs, PluginDrawerTabBody } = await import('../src/react.js')
  const h = harness(() => <p>Drawer content</p>)
  await h.runtime.sync([{ ...h.entry(), kind: 'drawer.tab', owner_id: 'owner:name', local_key: 'tab/name' }])
  function Drawer() { const tabs = usePluginDrawerTabs('rail'); return <>{tabs.map(tab => <PluginDrawerTabBody key={tab.id} tab={tab} />)}</> }
  const view = render(<PluginHostProvider runtime={h.runtime}><Drawer /></PluginHostProvider>)
  expect(screen.getByText('Drawer content')).toBeTruthy()
  expect(view.container.querySelector('[data-plugin-tab]')?.getAttribute('data-plugin-tab')).toBe('plugin:owner%3Aname:tab%2Fname')
  expect(h.panels.reconcile).toHaveBeenLastCalledWith(h.runtime.scope, [])
  await act(() => h.runtime.sync([{ ...h.entry(), kind: 'drawer-tab' }]))
  expect(screen.queryByText('Drawer content')).toBeNull()
})
it('displays identity and current/previous bundle evidence and approves without a payload', async () => {
  const { PluginReviewDialog } = await import('../src/react.js')
  const approve = vi.fn()
  render(<PluginReviewDialog open title="Bundle review" plugin={{ id: 'notes', version: '2.0.0' }}
    currentBundle={{ version: 'bundle-new', digest: 'sha256:new-digest' }} previousBundle={{ version: 'bundle-old', digest: 'sha256:old-digest' }}
    rows={[{ id: 'tool:notes', label: 'Notes tool', change: 'changed' }]} onApprove={approve} onOpenChange={() => {}} />)
  for (const text of ['notes', '2.0.0', 'bundle-new', 'sha256:new-digest', 'bundle-old', 'sha256:old-digest', 'changed']) expect(screen.getByText(text)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  expect(approve.mock.calls).toEqual([[]])
})
