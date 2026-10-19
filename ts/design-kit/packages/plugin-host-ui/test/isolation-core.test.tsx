// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { PluginHostProvider, PluginPanelBody, PluginDrawerTabBody, WidgetRenderer, usePluginPanels } from '../src/react.js'
import type { PluginFrameController, PluginFrameRenderState } from '../src/host.js'
import { harness, store } from './helpers.js'
afterEach(cleanup)
function Rail() { const panels = usePluginPanels(); return <>{panels.map(panel => <PluginPanelBody key={panel.id} panel={panel} />)}</> }
function frameHarness() {
  let active = true
  const state = store<PluginFrameRenderState>({ status: 'loading' }), changed = store(0), dispose = vi.fn(), update = vi.fn()
  const controller: PluginFrameController = {
    isCurrent: vi.fn(() => active), subscribe: changed.subscribe,
    mount: vi.fn((container, _view, props) => {
      void _view
      const body = document.createElement('p'); body.textContent = `Frame:${String(props.session_id)}`; container.append(body)
      return { ...state, update, dispose: () => { dispose(); body.remove() } }
    }),
  }
  const parentExport = vi.fn(() => <p>Executed parent export</p>), h = harness(parentExport, undefined, controller)
  h.isolation.set({ appId: 'app', effectiveMode: 'sandboxed-frame', revision: '1' })
  return { ...h, controller, parentExport, state, dispose, update, revokeFrame() { active = false; changed.set(1) } }
}
it('makes sandboxed components available only with a live controller and current owner', () => {
  const h = frameHarness(), release = h.runtime.retain(), panel = h.runtime.getSnapshot().views[0]!
  expect(panel.availability).toBe('available'); expect(h.runtime.isCurrent(panel)).toBe(true)
  h.revokeFrame(); expect(h.runtime.isCurrent(panel)).toBe(false)
  release(); h.runtime.dispose()
  const noController = harness(), stop = noController.runtime.retain()
  noController.isolation.set({ appId: 'app', effectiveMode: 'sandboxed-frame', revision: '2' })
  expect(noController.runtime.getSnapshot().views[0]!.availability).toBe('isolated-controller-required')
  stop(); noController.runtime.dispose()
})
it('selects the frame body without executing the parent export, injects context and disposes on revocation', async () => {
  const h = frameHarness()
  render(<PluginHostProvider runtime={h.runtime}><Rail /></PluginHostProvider>)
  expect(screen.getByText('Frame:host-session')).toBeTruthy(); expect(screen.getByText('Loading plugin view…')).toBeTruthy()
  expect(h.parentExport).not.toHaveBeenCalled(); expect(h.controller.mount).toHaveBeenCalledOnce()
  act(() => h.state.set({ status: 'ready' })); expect(screen.queryByText('Loading plugin view…')).toBeNull()
  act(() => h.renderContext.set({ session_id: 'new-session' })); expect(h.update).toHaveBeenLastCalledWith({ session_id: 'new-session' })
  await act(() => h.runtime.sync([{ ...h.entry(), metadata: { unrelated: true } }]))
  expect(h.controller.mount).toHaveBeenCalledOnce()
  act(() => h.revokeFrame()); expect(screen.queryByText('Frame:host-session')).toBeNull(); expect(h.dispose).toHaveBeenCalledOnce()
})
it('disposes an old frame before entering main-origin and refuses unknown app policy', () => {
  const h = frameHarness(), order: string[] = []
  h.dispose.mockImplementation(() => order.push('disposed'))
  h.parentExport.mockImplementation(() => { order.push('parent'); return <p>Parent view</p> })
  render(<PluginHostProvider runtime={h.runtime}><Rail /></PluginHostProvider>)
  act(() => h.isolation.set({ appId: 'wrong-app', effectiveMode: 'main-origin', revision: '2' }))
  expect(screen.queryByText('Frame:host-session')).toBeNull(); expect(h.parentExport).not.toHaveBeenCalled()
  act(() => h.isolation.set({ appId: 'app', effectiveMode: 'main-origin', revision: '3' }))
  expect(order[0]).toBe('disposed'); expect(screen.getByText('Parent view')).toBeTruthy()
})
it('shares the structural frame path with drawer and widget bodies and exposes explicit failure', () => {
  const h = frameHarness(), release = h.runtime.retain(), view = h.runtime.getSnapshot().views[0]!
  const rendered = render(<PluginHostProvider runtime={h.runtime}><PluginDrawerTabBody tab={view} /><WidgetRenderer widget={{ ...view, widget: true }} /></PluginHostProvider>)
  expect(h.controller.mount).toHaveBeenCalledTimes(2); expect(h.parentExport).not.toHaveBeenCalled()
  act(() => h.state.set({ status: 'failed', reason: 'policy-unavailable' }))
  expect(screen.getAllByText('Plugin view failed.')).toHaveLength(2)
  rendered.unmount(); expect(h.dispose).toHaveBeenCalledTimes(2); release(); h.runtime.dispose()
})

it('detaches and reports a failing frame surface immediately even when its cleanup throws', () => {
  const h = frameHarness()
  h.update.mockImplementation(() => { throw new Error('private update') })
  h.dispose.mockImplementation(() => { throw new Error('private cleanup') })
  render(<PluginHostProvider runtime={h.runtime}><Rail /></PluginHostProvider>)
  expect(screen.queryByText('Frame:host-session')).toBeNull()
  expect(screen.getByText('Plugin view failed.')).toBeTruthy()
  expect(h.dispose).toHaveBeenCalledOnce()
  expect(h.diagnostics).toHaveBeenCalledWith(expect.objectContaining({ reason: 'frame-cleanup-failed' }))
  expect(h.parentExport).not.toHaveBeenCalled()
})
