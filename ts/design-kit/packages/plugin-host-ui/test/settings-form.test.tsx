// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppIsolationConfigForm, PluginConfigForm, createPluginSettingsController, projectAppIsolationSettings, projectPluginSettings } from '../src/settings.js'
import { capabilities, snapshot, target, transport } from './settings-helpers.js'
afterEach(cleanup)
function projection() { return projectPluginSettings([{ key: 'name', type: 'string', label: 'Name' }, { key: 'ratio', type: 'number', label: 'Ratio' }, { key: 'token', type: 'secret', label: 'Token' }], capabilities(['name', 'ratio', 'token'])) }
async function ready(label: string) { await waitFor(() => expect((screen.getByLabelText(label) as HTMLInputElement).disabled).toBe(false)) }
it('uses the kit finite-number control and submits a number, with transient secret input cleared after save', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  render(<PluginConfigForm controller={controller} />); await ready('Ratio')
  expect(screen.getByLabelText('Ratio').getAttribute('inputmode')).toBe('decimal')
  expect((screen.getByLabelText('Token') as HTMLInputElement).value).toBe('')
  expect(screen.getByText(/Secret is set/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Ratio'), { target: { value: '2.5' } })
  fireEvent.change(screen.getByLabelText('Token'), { target: { value: 'new-secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(adapter.save).toHaveBeenCalled())
  await ready('Ratio')
  expect(vi.mocked(adapter.save).mock.calls[0]?.[1].changes.set).toEqual({ ratio: 2.5, token: 'new-secret' })
  expect((screen.getByLabelText('Token') as HTMLInputElement).value).toBe('')
  expect(controller.getSnapshot().draft).toEqual({})
})
it('retains visible dirty edits during a background conflict and provides discard/reload', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  render(<PluginConfigForm controller={controller} />); await ready('Name')
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unsaved' } })
  vi.mocked(adapter.read).mockResolvedValue({ ...snapshot('two'), values: { ...snapshot().values, name: { ...snapshot().values.name!, value: 'Background' } } })
  await act(() => controller.refresh())
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Unsaved')
  expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText(/Background read preserved your draft/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Discard and reload' })); await ready('Name')
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Background')
})
it('clears transient drafts on form unload and displays unsupported schemas as unavailable', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  const view = render(<PluginConfigForm controller={controller} />); await ready('Token')
  fireEvent.change(screen.getByLabelText('Token'), { target: { value: 'transient' } })
  view.unmount(); expect(controller.getSnapshot().draft).toEqual({})
  const unsupported = createPluginSettingsController(projectPluginSettings([{ key: 'nested', type: 'object' }], capabilities(['nested'])), adapter, target)
  render(<PluginConfigForm controller={unsupported} />)
  expect(screen.getByRole('alert').textContent).toContain('Unsupported scalar field type')
})
it.each(['active', 'pending_restart', 'unknown'] as const)('shows host app isolation provenance and %s apply state without choosing a default', async applyState => {
  const caps = capabilities(['isolation']); caps.permissions = { isolation: { editable: true, restart_required: true, apply_target: 'example-app' } }
  const adapter = transport({ revision: 'host-one', values: { isolation: { present: true, value: 'sandboxed-frame', editable: true, has_override: true, source: { kind: 'override', label: 'App operator' }, apply_state: applyState } },
    apply: { restartRequired: applyState === 'pending_restart', applyTargets: applyState === 'pending_restart' ? ['example-app'] : [] } })
  const controller = createPluginSettingsController(projectAppIsolationSettings('isolation', caps), adapter, { kind: 'app', appId: 'example', scope: { kind: 'client', id: 'app-setting' } })
  render(<AppIsolationConfigForm controller={controller} />); await ready('App isolation mode (required)')
  expect(screen.getByText('Source: override — App operator')).toBeTruthy()
  expect(screen.getByText(`Apply state: ${applyState === 'pending_restart' ? 'Pending restart' : applyState === 'active' ? 'Active' : 'Unknown'}`)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('App isolation mode (required)'), { target: { value: '1' } })
  expect(controller.getSnapshot().draft.isolation).toEqual({ kind: 'value', value: 'main-origin' })
  expect(controller.getSnapshot().values.isolation?.value).toBe('sandboxed-frame')
})
it('cannot present a plugin-owned group as an app isolation setting', async () => {
  const controller = createPluginSettingsController(projection(), transport(), target)
  render(<AppIsolationConfigForm controller={controller} />)
  expect(screen.getByRole('alert').textContent).toBe('App isolation settings unavailable.')
})
it('offers cancellation during pending validation and clears its secret draft', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  render(<PluginConfigForm controller={controller} />); await ready('Token')
  fireEvent.change(screen.getByLabelText('Token'), { target: { value: 'transient' } })
  let resolve!: (value: { valid: boolean; errors: [] }) => void
  vi.mocked(adapter.validate).mockImplementation(() => new Promise(done => { resolve = done }))
  fireEvent.click(screen.getByRole('button', { name: 'Validate changes' }))
  expect(screen.getByRole('button', { name: 'Cancel operation' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel operation' }))
  expect(vi.mocked(adapter.validate).mock.calls[0]?.[2].aborted).toBe(true)
  expect((screen.getByLabelText('Token') as HTMLInputElement).value).toBe('')
  await act(async () => { resolve({ valid: true, errors: [] }) })
  expect(controller.getSnapshot().validation).toBeUndefined()
})
