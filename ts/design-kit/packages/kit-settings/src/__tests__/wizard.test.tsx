import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SettingsWizard, settingsWizardGroups } from '../index'
import type { SettingsGroup, SettingsState, SettingsWizardProps } from '../index'
import { initialStates, nanite, tachyon } from '../../demo/fixtures'
afterEach(cleanup)
const required = nanite.settings[0], optional = tachyon.settings[0]
const props = (groups: readonly SettingsGroup[] = [optional, ...nanite.settings]): SettingsWizardProps => ({ contractVersion: 1, groups, states: initialStates, step: 0, onStepChange: vi.fn(), onDraftChange: vi.fn(), onComplete: vi.fn() })
it('orders required groups first stably and remains static while drafts and completion change', () => {
  const p = props(), { rerender } = render(<SettingsWizard {...p} />)
  const steps = screen.getByRole('list', { name: 'Setup steps' })
  expect(within(steps).getAllByRole('listitem').map(el => el.textContent?.split(' — ')[0])).toEqual(['1. Preferences', '2. Deployment configuration', '3. Example notifier (hypothetical plugin)', '4. Observation connections', '5. Review'])
  const before = within(steps).getAllByRole('listitem').map(el => el.textContent?.split(' — ')[0])
  rerender(<SettingsWizard {...p} states={{ ...initialStates, [required.id]: { ...initialStates[required.id], draft: { tool_drawer_retention: { kind: 'value', value: 999 } } } }} />)
  expect(within(steps).getAllByRole('listitem').map(el => el.textContent?.split(' — ')[0])).toEqual(before)
  expect(within(steps).getAllByRole('listitem')[0].textContent).toContain('Needs attention')
  expect(settingsWizardGroups(p.groups).map(g => g.id)).toEqual([required.id, nanite.settings[1].id, nanite.settings[2].id, optional.id])
})
it('places required fields before optional fields without changing order within either partition', () => {
  const group = { ...optional, schema: { ...optional.schema, required: ['tether_url'] } }
  render(<SettingsWizard {...props([group])} />)
  const labels = Array.from(document.querySelectorAll('label')).map(el => el.textContent)
  expect(labels).toEqual(['Tether API URL (required)', 'Nanite API URL', 'Torque API URL'])
})
it('blocks Next and forced click for an absent or invalid required value using the existing evaluator', () => {
  const p = props([required])
  const s: SettingsState = { ...initialStates[required.id], draft: { tool_drawer_retention: { kind: 'value', value: 999 } } }
  render(<SettingsWizard {...p} states={{ [required.id]: s }} />)
  const next = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement
  expect(next.disabled).toBe(true)
  fireEvent.click(next)
  expect(p.onStepChange).not.toHaveBeenCalled()
  expect(screen.getByText('Choose a listed value.')).toBeTruthy()
})
it('resumes exactly the host step and draft, and does not own navigation or clear a draft', () => {
  const p = props(), group = optional, draft = { nanite_url: { kind: 'value' as const, value: 'http://resumed.example' } }
  const { rerender } = render(<SettingsWizard {...p} step={3} states={{ ...initialStates, [group.id]: { ...initialStates[group.id], draft } }} />)
  expect((screen.getByLabelText('Nanite API URL') as HTMLInputElement).value).toBe('http://resumed.example')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(p.onStepChange).toHaveBeenCalledWith(2)
  expect(screen.getByLabelText('Nanite API URL')).toBeTruthy()
  rerender(<SettingsWizard {...p} step={4} states={{ ...initialStates, [group.id]: { ...initialStates[group.id], draft } }} />)
  expect(screen.getByText('Nanite API URL: http://resumed.example')).toBeTruthy()
  expect(p.onDraftChange).not.toHaveBeenCalled()
})
it('shows unreported checks truthfully, requests them explicitly and blocks host-required checks', () => {
  const p = props([optional]), onCheck = vi.fn(), { rerender } = render(<SettingsWizard {...p} onCheck={onCheck} />)
  expect(screen.getByText('Connectivity check: Not reported')).toBeTruthy()
  expect(screen.queryByText('Connectivity check: OK')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Request connectivity check' }))
  expect(onCheck).toHaveBeenCalledWith(optional.id)
  rerender(<SettingsWizard {...p} checks={{ [optional.id]: { status: 'failed', blocking: true, message: 'Host says unavailable' } }} />)
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true)
  rerender(<SettingsWizard {...p} checks={{ [optional.id]: { status: 'failed', blocking: false } }} />)
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false)
})
it.each(['idle', 'running'] as const)('requires OK for blocking %s checks and never invents OK', status => {
  render(<SettingsWizard {...props([optional])} checks={{ [optional.id]: { status, blocking: true } }} />)
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByText('Connectivity check: OK')).toBeNull()
})
it('renders locked settings as context without inputs or draft callbacks', () => {
  const group = nanite.settings[1], p = props([group]);render(<SettingsWizard {...p} />)
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.getByLabelText('Listen address (required)').tagName).toBe('OUTPUT')
  expect(screen.getByText('127.0.0.1:8090')).toBeTruthy()
  expect(screen.getByText(/Read only: Managed/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false)
  expect(p.onDraftChange).not.toHaveBeenCalled()
})
it('keeps secret replacement blank initially and redacts replacements on review', () => {
  const group = nanite.settings[2], p = props([group]), { rerender } = render(<SettingsWizard {...p} />)
  expect((screen.getByLabelText('API token (required)') as HTMLInputElement).value).toBe('')
  const s = { ...initialStates[group.id], draft: { api_token: { kind: 'value' as const, value: 'never-review-this-secret' } } }
  rerender(<SettingsWizard {...p} step={1} states={{ [group.id]: s }} />)
  expect(screen.getByText('API token: will be replaced')).toBeTruthy()
  expect(document.body.textContent).not.toContain('never-review-this-secret')
  fireEvent.click(screen.getByRole('button', { name: 'Submit setup' }))
  expect(p.onComplete).toHaveBeenCalledWith([{ groupId: group.id, changes: { set: { api_token: 'never-review-this-secret' }, unset: [] } }])
  expect(p.onDraftChange).not.toHaveBeenCalled()
})
it('emits one ordered plan; displays partial results and retains failed/unreported drafts until host refresh', () => {
  const p = props([optional, required])
  const states: Record<string, SettingsState> = { ...initialStates, [required.id]: { ...initialStates[required.id], draft: { developer_mode: { kind: 'value' as const, value: true } } }, [optional.id]: { ...initialStates[optional.id], draft: { nanite_url: { kind: 'value' as const, value: 'http://pending.example' } } } }
  const { rerender } = render(<SettingsWizard {...p} step={2} states={states} />)
  expect(screen.getAllByText('Save result: Not reported')).toHaveLength(2)
  expect(screen.queryByText('Save result: Saved')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Submit setup' }))
  expect(p.onComplete).toHaveBeenCalledWith([{ groupId: required.id, changes: { set: { developer_mode: true }, unset: [] } }, { groupId: optional.id, changes: { set: { nanite_url: 'http://pending.example' }, unset: [] } }])
  const results = { [required.id]: { status: 'saved' as const }, [optional.id]: { status: 'failed' as const, message: 'Try manually after reconcile' } }
  const updated: Record<string, SettingsState> = { ...states, [required.id]: { ...states[required.id], values: { ...states[required.id].values, developer_mode: { ...states[required.id].values.developer_mode, value: true } }, draft: {} } }
  rerender(<SettingsWizard {...p} step={2} states={updated} results={results} />)
  expect(screen.getByText('Save result: Saved')).toBeTruthy()
  expect(screen.getByRole('alert').textContent).toContain('Save result: Failed')
  expect(screen.getByText('Nanite API URL: http://pending.example')).toBeTruthy()
  expect(p.onComplete).toHaveBeenCalledTimes(1) // No automatic retry.
  fireEvent.click(screen.getByRole('button', { name: 'Submit setup' }))
  expect(p.onComplete).toHaveBeenLastCalledWith([{ groupId: optional.id, changes: { set: { nanite_url: 'http://pending.example' }, unset: [] } }])
  expect(p.onDraftChange).not.toHaveBeenCalled()
})
it('blocks final submit for invalid values or saving results even when the host resumes review directly', () => {
  const p = props([optional]), s = { ...initialStates[optional.id], draft: { nanite_url: { kind: 'value' as const, value: '' } } }
  const { rerender } = render(<SettingsWizard {...p} step={1} states={{ [optional.id]: s }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Submit setup' }))
  expect(p.onComplete).not.toHaveBeenCalled()
  rerender(<SettingsWizard {...p} step={1} results={{ [optional.id]: { status: 'saving' } }} />)
  expect((screen.getByRole('button', { name: 'Submit setup' }) as HTMLButtonElement).disabled).toBe(true)
})
it('fails closed without steps for unsupported schema or contract version and invalid resumed step', () => {
  const g = { ...optional, schema: { ...optional.schema, properties: { nested: { type: 'object' } } }, fields: { nested: { editable: true, secret: false, restart_required: false } } }
  const p = props([g]), { rerender } = render(<SettingsWizard {...p} />)
  expect(screen.getByRole('alert').textContent).toContain('Unsupported')
  expect(screen.queryByRole('list', { name: 'Setup steps' })).toBeNull()
  rerender(<SettingsWizard {...props()} contractVersion={2} />)
  expect(screen.queryByRole('button')).toBeNull()
  rerender(<SettingsWizard {...props()} step={999} />)
  expect(screen.getByRole('alert').textContent).toContain('unavailable setup step')
})
