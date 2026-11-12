// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PluginHostProvider, usePluginAction, usePluginSlots } from '../src/react.js'
import type { ActionResult } from '../src/actions-contract.js'
import { actionsHarness, command, success } from './actions-helpers.js'
afterEach(cleanup)
it('dispatches a projected intent through a stable hook without browser events', async () => {
  const h = actionsHarness(), events = vi.spyOn(window, 'dispatchEvent'), callbacks: unknown[] = []
  function Action() {
    const action = usePluginAction(), views = usePluginSlots('inline'); callbacks.push(action)
    return <button onClick={() => { void action(views[0]!) }}>Run action</button>
  }
  try {
    render(<PluginHostProvider runtime={h.runtime}><Action /></PluginHostProvider>)
    fireEvent.click(screen.getByRole('button'))
    await vi.waitFor(() => expect(h.adapter.command).toHaveBeenCalledOnce())
    await act(() => h.runtime.sync(h.entries()))
    expect(callbacks.every(callback => callback === callbacks[0])).toBe(true)
    expect(events).not.toHaveBeenCalled()
  } finally { events.mockRestore(); h.dispose() }
})
it('cancels a hook invocation on unmount and blocks calls retained after unmount', async () => {
  const h = actionsHarness()
  let complete!: (result: ActionResult) => void, invoke!: ReturnType<typeof usePluginAction>
  h.adapter.validate.mockImplementation(() => new Promise(resolve => { complete = resolve }))
  function Action() { invoke = usePluginAction(); return null }
  const mounted = render(<PluginHostProvider runtime={h.runtime}><Action /></PluginHostProvider>)
  const view = h.source(), pending = invoke(view)
  expect(h.adapter.validate).toHaveBeenCalledOnce()
  const signal = h.adapter.validate.mock.calls[0]![2]
  mounted.unmount()
  expect(signal.aborted).toBe(true)
  expect(await pending).toEqual({ status: 'refused', reason: 'cancelled' })
  complete(success()); await Promise.resolve()
  expect(h.adapter.command).not.toHaveBeenCalled()
  expect(await invoke({ ...view, action: command })).toEqual({ status: 'refused', reason: 'cancelled' })
  h.dispose()
})
