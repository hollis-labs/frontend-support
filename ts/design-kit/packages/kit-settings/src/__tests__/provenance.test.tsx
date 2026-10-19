import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SettingsProvenanceRenderer } from '../index'
import type { SettingsProvenanceState } from '../index'
import { nanite, tachyon, initialStates } from '../../demo/fixtures'
afterEach(cleanup)
const group = tachyon.settings[0]
const base = (): SettingsProvenanceState => ({ ...initialStates[group.id], values: Object.fromEntries(Object.entries(initialStates[group.id].values).map(([k, v]) => [k, { ...v, source: { kind: 'override', label: 'plugin override' }, apply_state: 'pending_restart' }])), apply: { restartRequired: true, applyTargets: ['backend-target'] } })
const renderState = (state: SettingsProvenanceState, onApply = vi.fn()) => render(<SettingsProvenanceRenderer contractVersion={1} groups={[group]} states={{ [group.id]: state }} onDraftChange={vi.fn()} onApply={onApply} />)
it.each(['default', 'env', 'file', 'override'])('shows %s provenance exactly as the host supplied', kind => {
  const s = base();const values = { ...s.values, nanite_url: { ...s.values.nanite_url, source: { kind, label: 'safe label' } } }
  renderState({ ...s, values })
  expect(screen.getByText(`Source: ${kind} — safe label`)).toBeTruthy()
})
it.each([undefined, { kind: 'mystery', label: 'unknown' }, { kind: 'default' }])('never treats missing/unknown source as default: %j', source => {
  const s = base();renderState({ ...s, values: { ...s.values, nanite_url: { ...s.values.nanite_url, source } } })
  expect(screen.getByRole('alert').textContent).toContain('provenance is missing or unsupported')
  expect(screen.queryByText(/Source: default/)).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
})
it('shows source for a secret while keeping the replacement blank', () => {
  const g = nanite.settings[2], s = initialStates[g.id]
  render(<SettingsProvenanceRenderer contractVersion={1} groups={[g]} states={{ [g.id]: { ...s, values: { api_token: { ...s.values.api_token, source: { kind: 'override', label: 'plugin secret override' }, apply_state: 'unknown' } }, apply: { restartRequired: false, applyTargets: [] } } }} onDraftChange={vi.fn()} />)
  expect(screen.getByText('Source: override — plugin secret override')).toBeTruthy()
  expect((screen.getByLabelText('API token (required)') as HTMLInputElement).value).toBe('')
  expect(screen.getByText('Apply state: Unknown')).toBeTruthy()
})
it('emits host targets verbatim, preserves pending after failure, and only reflects applied state after rerender', () => {
  const s = base(), onApply = vi.fn()
  const { rerender } = renderState(s, onApply)
  fireEvent.click(screen.getByRole('button', { name: 'Apply / restart' }))
  expect(onApply).toHaveBeenCalledWith(group.id, ['backend-target']) // Not the declared observe-ops target.
  expect(screen.getAllByText('Apply state: Pending restart')).toHaveLength(3)
  rerender(<SettingsProvenanceRenderer contractVersion={1} groups={[group]} states={{ [group.id]: { ...s, applyError: 'Apply failed' } }} onDraftChange={vi.fn()} onApply={onApply} />)
  expect(screen.getByRole('alert').textContent).toBe('Apply failed')
  expect(screen.getAllByText('Apply state: Pending restart')).toHaveLength(3)
  const active = { ...s, values: Object.fromEntries(Object.entries(s.values).map(([k, v]) => [k, { ...v, apply_state: 'active' }])), apply: { restartRequired: false, applyTargets: [] } }
  rerender(<SettingsProvenanceRenderer contractVersion={1} groups={[group]} states={{ [group.id]: active }} onDraftChange={vi.fn()} onApply={onApply} />)
  expect(screen.queryByText('Apply state: Pending restart')).toBeNull()
  expect(screen.getAllByText('Apply state: Active')).toHaveLength(3)
  expect(screen.queryByRole('button', { name: 'Apply / restart' })).toBeNull()
})
it('disables apply while busy and never emits it from a forced event', () => {
  const onApply = vi.fn();renderState({ ...base(), applying: true }, onApply)
  fireEvent.click(screen.getByRole('button', { name: 'Applying…' }))
  expect(onApply).not.toHaveBeenCalled()
})
it('fails closed for unknown apply state', () => {
  const s = base();renderState({ ...s, values: { ...s.values, nanite_url: { ...s.values.nanite_url, apply_state: 'guess' } } })
  expect(screen.getByRole('alert').textContent).toContain('apply state is missing or unsupported')
  expect(screen.queryByRole('button')).toBeNull()
})
it('offers no apply for a conservative pending field with no declared target and empty projection', () => {
  const g = nanite.settings[0], s = initialStates[g.id]
  const values = Object.fromEntries(Object.entries(s.values).map(([k, v]) => [k, { ...v, source: { kind: 'override', label: 'app override' }, apply_state: k === 'developer_mode' ? 'pending_restart' : 'unknown' }]))
  const onApply = vi.fn()
  render(<SettingsProvenanceRenderer contractVersion={1} groups={[g]} states={{ [g.id]: { ...s, values, apply: { restartRequired: true, applyTargets: [] } } }} onDraftChange={vi.fn()} onApply={onApply} />)
  expect(screen.getByText('Apply state: Pending restart')).toBeTruthy()
  expect(screen.getByRole('alert').textContent).toBe('A restart is needed but the app did not say what to restart.')
  expect(screen.queryByRole('button', { name: 'Apply / restart' })).toBeNull()
  expect(onApply).not.toHaveBeenCalled()
})
it.each([undefined, { restartRequired: true, applyTargets: [''] }, { restartRequired: false, applyTargets: ['target'] }, { restartRequired: true, applyTargets: ['target', 'target'] }])('does not guess from invalid/missing projection %j', apply => {
  renderState({ ...base(), apply })
  expect(screen.queryByRole('button', { name: 'Apply / restart' })).toBeNull()
  expect(screen.getByRole('alert')).toBeTruthy()
})
it('shows both sides of a disagreement without reconciling or hiding pending', () => {
  renderState({ ...base(), apply: { restartRequired: false, applyTargets: [] } })
  expect(screen.getAllByText('Apply state: Pending restart')).toHaveLength(3)
  expect(screen.getByText('Fields report pending restart; the app projection reports no restart required.')).toBeTruthy()
})

it('fails closed for contradictory restart declarations even with a host empty unavailable message', () => {
  const g = nanite.settings[0], s = initialStates[g.id]
  const fields = { ...g.fields, developer_mode: { ...g.fields.developer_mode, apply_target: 'forbidden-when-not-required' } }
  render(<SettingsProvenanceRenderer contractVersion={1} groups={[{ ...g, fields }]} states={{ [g.id]: s }} groupUnavailable={{ [g.id]: '' }} onDraftChange={vi.fn()} />)
  expect(screen.getByRole('alert').textContent).toContain('restart declaration is inconsistent')
  expect(screen.queryByRole('button')).toBeNull()
})
it('does not interpret unknown as active and shows required projection independently of field states', () => {
  const s = base(), values = Object.fromEntries(Object.entries(s.values).map(([k, v]) => [k, { ...v, apply_state: 'unknown' }]))
  renderState({ ...s, values })
  expect(screen.getAllByText('Apply state: Unknown')).toHaveLength(3)
  expect(screen.queryByText('Apply state: Active')).toBeNull()
  expect(screen.getByText('The app requires a restart; no field reports pending restart.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Apply / restart' })).toBeTruthy()
})

it('opt-in text presentation keeps locked values labelled and preserves metadata', () => {
  const id = 'preferences'
  const locked = { id, label: 'Preferences', schema: { type: 'object', additionalProperties: false,
    properties: { retention: { type: 'integer', title: 'Retention', enum: [5, 15], readOnly: true } } },
    fields: { retention: { editable: false, secret: false, restart_required: false, read_only_reason: 'Read-only preference' } },
    capabilities: { can_read: true, can_validate: false, can_update: false, can_reset: false } }
  const state: SettingsProvenanceState = { draft: {}, values: { retention: { present: true, value: 15,
    editable: false, has_override: true, read_only_reason: 'Read-only preference',
    source: { kind: 'override', label: 'Persisted application preference' }, apply_state: 'unknown' } } }
  const common = { contractVersion: 1, groups: [locked], states: { [id]: state }, onDraftChange: vi.fn() }
  const { rerender, container } = render(<SettingsProvenanceRenderer {...common} />)
  expect(screen.getByLabelText('Retention').tagName).toBe('SELECT')
  rerender(<SettingsProvenanceRenderer {...common} readOnlyContext />)
  expect(screen.getByLabelText('Retention').tagName).toBe('OUTPUT')
  expect(screen.getByLabelText('Retention').textContent).toBe('15')
  expect(container.querySelector('input, select, textarea')).toBeNull()
  expect(screen.getByText('Source: override — Persisted application preference')).toBeTruthy()
  expect(screen.getByText('Apply state: Unknown')).toBeTruthy()
  rerender(<SettingsProvenanceRenderer {...common} readOnlyContext={false} />)
  expect(screen.getByLabelText('Retention').tagName).toBe('SELECT')
})
