import { expect, it, vi } from 'vitest'
import { createPluginSettingsController } from '../src/settings-controller.js'
import { projectPluginSettings, projectAppIsolationSettings } from '../src/settings-model.js'
import { capabilities, snapshot, target, transport } from './settings-helpers.js'
function projection() { return projectPluginSettings([{ key: 'name', type: 'string' }, { key: 'ratio', type: 'number' }, { key: 'token', type: 'secret' }], capabilities(['name', 'ratio', 'token'])) }
it('preserves a dirty draft across a background revision change, blocks save, and adopts on cancel', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  await controller.refresh(); controller.setDraft({ name: { kind: 'value', value: 'Unsaved' }, token: { kind: 'value', value: 'transient-secret' } })
  vi.mocked(adapter.read).mockResolvedValue({ ...snapshot('two'), values: { ...snapshot().values, name: { ...snapshot().values.name!, value: 'Background' } } })
  await controller.refresh()
  expect(controller.getSnapshot().draft.name).toEqual({ kind: 'value', value: 'Unsaved' })
  expect(controller.getSnapshot().values.name?.value).toBe('Original')
  expect(controller.getSnapshot().conflict).toEqual({ baseRevision: 'one', currentRevision: 'two' })
  await controller.save(); expect(adapter.save).not.toHaveBeenCalled()
  controller.cancel(); expect(controller.getSnapshot().draft).toEqual({})
  expect(controller.getSnapshot().values.name?.value).toBe('Background')
  expect(controller.getSnapshot().revision).toBe('two')
})
it('validates before revision-bound save and clears transient secrets without echoing them into values', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  await controller.refresh()
  controller.setDraft({ ratio: { kind: 'text', text: '2.5' }, token: { kind: 'value', value: 'new-secret' } })
  await controller.save()
  expect(adapter.validate).toHaveBeenCalledWith(target, { revision: 'one', changes: { set: { ratio: 2.5, token: 'new-secret' }, unset: [] } }, expect.any(AbortSignal))
  expect(adapter.save).toHaveBeenCalledWith(target, expect.objectContaining({ revision: 'one' }), expect.any(AbortSignal))
  expect(controller.getSnapshot().draft).toEqual({})
  expect(controller.getSnapshot().values.token).not.toHaveProperty('value')
})
it('surfaces backend conflicts, retains ordinary drafts and clears secret drafts after a failed save', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  vi.mocked(adapter.save).mockResolvedValue({ status: 'conflict', revision: 'other' })
  await controller.refresh(); controller.setDraft({ name: { kind: 'value', value: 'Unsaved' }, token: { kind: 'value', value: 'new-secret' } })
  await controller.save()
  expect(controller.getSnapshot().conflict?.currentRevision).toBe('other')
  expect(controller.getSnapshot().draft.name).toBeTruthy()
  expect(controller.getSnapshot().draft.token).toBeUndefined()
})
it('does not expose transport errors or host validation messages containing submitted secrets', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  await controller.refresh(); controller.setDraft({ token: { kind: 'value', value: 'new-secret' } })
  vi.mocked(adapter.validate).mockResolvedValue({ valid: false, errors: [{ path: '/token', code: 'bad', message: 'new-secret is invalid' }] })
  await controller.save()
  expect(JSON.stringify(controller.getSnapshot())).not.toContain('new-secret')
  expect(adapter.save).not.toHaveBeenCalled()
  controller.setDraft({ token: { kind: 'value', value: 'new-secret' } })
  vi.mocked(adapter.validate).mockRejectedValue(new Error('new-secret private data'))
  await controller.save()
  expect(controller.getSnapshot().error).toBe('Settings operation failed.')
  expect(controller.getSnapshot().draft).toEqual({})
})
it('rejects secret snapshots that contain a value, with an explicit unavailable state', async () => {
  const raw = snapshot(); const adapter = transport({ ...raw, values: { ...raw.values, token: { ...raw.values.token!, value: 'must-never-be-rendered' } } })
  const controller = createPluginSettingsController(projection(), adapter, target)
  await controller.refresh()
  expect(controller.getSnapshot().phase).toBe('unavailable')
  expect(JSON.stringify(controller.getSnapshot())).not.toContain('must-never-be-rendered')
})
it('aborts reads and fences late completion on owner unload', async () => {
  const adapter = transport(); let resolve!: (value: ReturnType<typeof snapshot>) => void
  vi.mocked(adapter.read).mockImplementation(() => new Promise(done => { resolve = done }))
  const controller = createPluginSettingsController(projection(), adapter, target)
  const pending = controller.refresh(), signal = vi.mocked(adapter.read).mock.calls[0]![1]
  controller.dispose(); expect(signal.aborted).toBe(true)
  resolve(snapshot()); await pending
  expect(controller.getSnapshot().phase).toBe('disposed')
  expect(controller.getSnapshot().values).toEqual({}); expect(controller.getSnapshot().draft).toEqual({})
})
it('clears staged secrets and aborts active validation on cancellation', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  await controller.refresh(); controller.setDraft({ token: { kind: 'value', value: 'staged' } })
  let resolve!: (v: { valid: boolean; errors: [] }) => void
  vi.mocked(adapter.validate).mockImplementation(() => new Promise(done => { resolve = done }))
  const pending = controller.validate(); const signal = vi.mocked(adapter.validate).mock.calls[0]![2]
  controller.cancel(); expect(signal.aborted).toBe(true)
  resolve({ valid: true, errors: [] }); await pending
  expect(controller.getSnapshot().draft).toEqual({}); expect(controller.getSnapshot().validation).toBeUndefined()
})
it('validates staged reset intent and submits only explicit override keys', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  await controller.refresh(); controller.setDraft({ name: { kind: 'unset' } }); await controller.reset()
  expect(adapter.reset).toHaveBeenCalledWith(target, { revision: 'one', keys: ['name'] }, expect.any(AbortSignal))
  expect(controller.getSnapshot().draft).toEqual({})
})
it('fails closed without transport or with plugin ownership of the app isolation group', async () => {
  const missing = createPluginSettingsController(projection(), undefined, target)
  expect(missing.getSnapshot().phase).toBe('unavailable')
  const adapter = transport(), host = projectAppIsolationSettings('isolation', capabilities(['isolation']))
  const wrong = createPluginSettingsController(host, adapter, target)
  await wrong.refresh(); expect(adapter.read).not.toHaveBeenCalled()
  expect(wrong.getSnapshot().phase).toBe('unavailable')
})
it('preserves read-only permissions and refuses forged drafts without calling transport mutations', async () => {
  const caps = capabilities(['name']); caps.can_update = false; caps.can_reset = false
  caps.permissions = { name: { editable: false, read_only_reason: 'Host policy', restart_required: false } }
  const adapter = transport({ revision: 'readonly', values: { name: { present: true, value: 'Fixed', editable: false, has_override: false, read_only_reason: 'Host policy' } } })
  const controller = createPluginSettingsController(projectPluginSettings([{ key: 'name', type: 'string' }], caps), adapter, target)
  await controller.refresh(); controller.setDraft({ name: { kind: 'value', value: 'Forged' } })
  await controller.save(); expect(adapter.save).not.toHaveBeenCalled(); expect(adapter.validate).not.toHaveBeenCalled()
})
it('requires a non-empty stable settings scope ID', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, { ...target, scope: { kind: 'project', id: '' } })
  await controller.refresh(); expect(controller.getSnapshot().phase).toBe('unavailable'); expect(adapter.read).not.toHaveBeenCalled()
})
it('shares one retained read and clears secret custody only when the last form unloads', async () => {
  const adapter = transport(), controller = createPluginSettingsController(projection(), adapter, target)
  const first = controller.retain(), second = controller.retain(); await Promise.resolve()
  expect(adapter.read).toHaveBeenCalledOnce()
  controller.setDraft({ token: { kind: 'value', value: 'transient' } })
  first(); expect(controller.getSnapshot().draft.token).toBeTruthy()
  second(); second(); expect(controller.getSnapshot().draft).toEqual({})
  const replay = controller.retain(); await Promise.resolve()
  expect(adapter.read).toHaveBeenCalledTimes(2)
  replay(); expect(controller.getSnapshot().phase).toBe('ready')
})
