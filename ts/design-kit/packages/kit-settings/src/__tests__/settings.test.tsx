import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SettingsGroupForm, SettingsRenderer, evaluateSettings, inspectSettingsGroup, snapshotProblem } from '../index'
import type { GroupProfile, SettingsGroup, SettingsState } from '../index'
import { initialStates, nanite, tachyon } from '../../demo/fixtures'
afterEach(cleanup)
const preferences = nanite.settings[0]
const locked = nanite.settings[1]
const secret = nanite.settings[2]
const connections = tachyon.settings[0]
const state = (g: SettingsGroup) => initialStates[g.id]
const profile = (g: SettingsGroup) => {
  const p = inspectSettingsGroup(g)
  expect(typeof p).toBe('object')
  return p as GroupProfile
}
const scalarGroup = (schema: object, secretField = false): SettingsGroup => ({
  id: 'scalar', label: 'Scalar', schema: { type: 'object', additionalProperties: false, properties: { value: schema }, required: ['value'] },
  fields: { value: { editable: true, secret: secretField, restart_required: false } },
  capabilities: { can_read: true, can_validate: true, can_update: true, can_reset: true },
})
const scalarState = (value: string | number | boolean): SettingsState => ({ draft: {}, values: { value: { present: true, value, editable: true, has_override: true } } })

describe('approved scalar form profile', () => {
  it('accepts both authored examples and distinguishes false, negative integer and empty string', () => {
    for (const g of [...nanite.settings, ...tachyon.settings]) {
      const p = profile(g)
      expect(snapshotProblem(p, state(g).values)).toBeUndefined()
      expect(evaluateSettings(p, state(g).values, {}).errors).toEqual([])
    }
    const out = evaluateSettings(profile(preferences), state(preferences).values, {
      developer_mode: { kind: 'value', value: true }, tool_drawer_retention: { kind: 'value', value: 5 }, embedding_mode: { kind: 'value', value: 'disabled' },
    })
    expect(out.changes.set).toEqual({ developer_mode: true, tool_drawer_retention: 5, embedding_mode: 'disabled' })
    const values = { ...state(preferences).values, developer_mode: { ...state(preferences).values.developer_mode, value: true }, tool_drawer_retention: { ...state(preferences).values.tool_drawer_retention, value: 5 }, embedding_mode: { ...state(preferences).values.embedding_mode, value: 'disabled' } }
    expect(evaluateSettings(profile(preferences), values, { developer_mode: { kind: 'value', value: false }, tool_drawer_retention: { kind: 'value', value: -1 }, embedding_mode: { kind: 'value', value: '' } }).changes.set).toEqual({ developer_mode: false, tool_drawer_retention: -1, embedding_mode: '' })
  })
  it.each([{ type: 'array', items: { type: 'string' } }, { type: 'object' }, { type: 'string', oneOf: [] }, { type: 'string', $ref: 'https://example.test/schema' }, { type: ['string', 'null'] }, { type: 'string', pattern: '[' }])('fails closed for unsupported schema %j', schema => {
    expect(typeof inspectSettingsGroup(scalarGroup(schema))).toBe('string')
  })
  it('fails closed for conflicting permissions, missing declarations and secret defaults', () => {
    expect(typeof inspectSettingsGroup(scalarGroup({ type: 'string', readOnly: true }))).toBe('string')
    expect(typeof inspectSettingsGroup({ ...preferences, fields: {} })).toBe('string')
    expect(typeof inspectSettingsGroup(scalarGroup({ type: 'string', writeOnly: true, default: 'unsafe' }, true))).toBe('string')
    expect(typeof inspectSettingsGroup(scalarGroup({ type: 'string', writeOnly: true }))).toBe('string')
  })
  it('never uses schema defaults to populate an absent value', () => {
    const g = scalarGroup({ type: 'string', default: 'annotation only', format: 'uri' })
    const values = { value: { present: false, editable: true, has_override: false } }
    expect(evaluateSettings(profile(g), values, {}).errors[0].message).toBe('A value is required.')
    render(<SettingsGroupForm group={g} values={values} draft={{}} onDraftChange={vi.fn()} />)
    expect((screen.getByLabelText('value (required)') as HTMLInputElement).value).toBe('')
  })
  it.each(['', '-', '01', '1x', 'NaN', 'Infinity', '1e999', '1.5'])('rejects incomplete, coerced or noninteger input %s', text => {
    const g = scalarGroup({ type: 'integer', minimum: 0, maximum: 10 })
    expect(evaluateSettings(profile(g), scalarState(0).values, { value: { kind: 'text', text } }).errors.length).toBeGreaterThan(0)
  })
  it('preserves zero and supports strict finite number text; typed strings are not coerced', () => {
    const p = profile(scalarGroup({ type: 'number' }))
    expect(evaluateSettings(p, scalarState(1).values, { value: { kind: 'text', text: '0' } }).changes.set).toEqual({ value: 0 })
    expect(evaluateSettings(p, scalarState(1).values, { value: { kind: 'text', text: '-1.5e2' } }).changes.set).toEqual({ value: -150 })
    expect(evaluateSettings(p, scalarState(1).values, { value: { kind: 'value', value: '2' } }).errors).toHaveLength(1)
  })
  it('validates enum membership, number bounds, Unicode length and patterns', () => {
    const p = profile(scalarGroup({ type: 'string', minLength: 1, maxLength: 1, pattern: '^😀$' }))
    expect(evaluateSettings(p, scalarState('😀').values, {}).errors).toEqual([])
    expect(evaluateSettings(p, scalarState('😀').values, { value: { kind: 'value', value: 'xx' } }).errors).toHaveLength(2)
    expect(evaluateSettings(profile(preferences), state(preferences).values, { tool_drawer_retention: { kind: 'value', value: 0 } }).errors).toHaveLength(1)
    expect(evaluateSettings(profile(scalarGroup({ type: 'number', maximum: 10 })), scalarState(0).values, { value: { kind: 'value', value: 11 } }).errors).toHaveLength(1)
  })
  it('allows secret keep, deliberate empty replacement if valid, and explicit removal without materializing secrets', () => {
    const p = profile(scalarGroup({ type: 'string', writeOnly: true }, true))
    const values = { value: { present: true, secret_present: true, editable: true, has_override: true } }
    expect(evaluateSettings(p, values, {}).changes).toEqual({ set: {}, unset: [] })
    expect(evaluateSettings(p, values, { value: { kind: 'value', value: '' } }).changes.set).toEqual({ value: '' })
    expect(evaluateSettings(p, values, { value: { kind: 'unset' } }).changes).toEqual({ set: {}, unset: ['value'] })
    expect(evaluateSettings(profile(secret), state(secret).values, { api_token: { kind: 'value', value: '' } }).errors).toHaveLength(1)
    expect(snapshotProblem(p, { value: { ...values.value, value: 'must never display' } })).toBeDefined()
  })
  it('requires reset permission and an override; removal leaves unknown fallback validation to the backend', () => {
    expect(evaluateSettings(profile(secret), state(secret).values, { api_token: { kind: 'unset' } }).errors).toHaveLength(1)
    expect(evaluateSettings(profile(connections), state(connections).values, { torque_url: { kind: 'unset' } }).errors).toHaveLength(1)
    const out = evaluateSettings(profile(connections), state(connections).values, { nanite_url: { kind: 'unset' } })
    expect(out.errors).toEqual([])
    expect(out.changes).toEqual({ set: {}, unset: ['nanite_url'] })
  })
})

describe('controlled settings surfaces', () => {
  it('emits drafts, never optimistically changes values or clears drafts on save', () => {
    const onDraftChange = vi.fn(), onSave = vi.fn()
    const { rerender } = render(<SettingsGroupForm group={connections} {...state(connections)} onDraftChange={onDraftChange} onSave={onSave} />)
    const input = screen.getByLabelText('Nanite API URL') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'http://new.example' } })
    expect(onDraftChange).toHaveBeenCalledWith({ nanite_url: { kind: 'value', value: 'http://new.example' } })
    expect(input.value).toBe('http://127.0.0.1:8091')
    const draft = onDraftChange.mock.calls[0][0]
    rerender(<SettingsGroupForm group={connections} {...state(connections)} draft={draft} onDraftChange={onDraftChange} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onSave).toHaveBeenCalledWith({ set: { nanite_url: 'http://new.example' }, unset: [] })
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
    expect(onDraftChange).toHaveBeenCalledTimes(1)
    rerender(<SettingsGroupForm group={connections} {...state(connections)} draft={draft} error="Backend rejected" onDraftChange={onDraftChange} onSave={onSave} />)
    expect(input.value).toBe('http://new.example')
    expect(screen.getByRole('alert').textContent).toContain('Backend rejected')
  })
  it('blocks input callbacks and submission for locked fields, including a forged controlled draft', () => {
    const onDraftChange = vi.fn(), onSave = vi.fn()
    render(<SettingsGroupForm group={locked} {...state(locked)} draft={{ listen_address: { kind: 'value', value: 'forged' } }} onDraftChange={onDraftChange} onSave={onSave} />)
    const input = screen.getByLabelText('Listen address (required)') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(screen.getByText(/Read only: Managed/)).toBeTruthy()
    fireEvent.change(input, { target: { value: 'attempt' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Deployment configuration' }))
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('honors revoked snapshot permissions and busy states at the callback boundary', () => {
    const onSave = vi.fn(), onDraftChange = vi.fn()
    const draft = { nanite_url: { kind: 'value' as const, value: 'changed' } }
    const values = { ...state(connections).values, nanite_url: { ...state(connections).values.nanite_url, editable: false, read_only_reason: 'Host revoked editing' } }
    const { rerender } = render(<SettingsGroupForm group={connections} values={values} draft={draft} onDraftChange={onDraftChange} onSave={onSave} />)
    fireEvent.submit(screen.getByRole('form'))
    expect(onSave).not.toHaveBeenCalled()
    rerender(<SettingsGroupForm group={connections} {...state(connections)} draft={draft} busy onDraftChange={onDraftChange} onSave={onSave} />)
    fireEvent.submit(screen.getByRole('form'))
    fireEvent.change(screen.getByLabelText('Nanite API URL'), { target: { value: 'attempt' } })
    expect(onSave).not.toHaveBeenCalled()
    expect(onDraftChange).not.toHaveBeenCalled()
  })
  it('presents sanitized server field errors with accessible associations and preserves the draft', () => {
    const draft = { nanite_url: { kind: 'value' as const, value: 'bad' } }
    render(<SettingsGroupForm group={connections} {...state(connections)} draft={draft} validation={{ valid: false, errors: [{ path: '/nanite_url', code: 'policy', message: 'Connection is unavailable' }, { path: '', code: 'conflict', message: 'Read the latest snapshot' }] }} onDraftChange={vi.fn()} />)
    const input = screen.getByLabelText('Nanite API URL') as HTMLInputElement
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')?.split(' ').map(id => document.getElementById(id)?.textContent).join(' ')).toContain('Connection is unavailable')
    expect(screen.getByRole('alert').textContent).toContain('Read the latest snapshot')
    expect(input.value).toBe('bad')
  })
  it('displays a blank secret replacement and safe presence; rejects a snapshot carrying a secret value', () => {
    const { rerender } = render(<SettingsGroupForm group={secret} {...state(secret)} onDraftChange={vi.fn()} />)
    expect((screen.getByLabelText('API token (required)') as HTMLInputElement).value).toBe('')
    expect(screen.getByText(/Secret is set/)).toBeTruthy()
    rerender(<SettingsGroupForm group={secret} {...state(secret)} values={{ api_token: { ...state(secret).values.api_token, value: 'leaked' } }} onDraftChange={vi.fn()} />)
    expect(screen.queryByLabelText('API token (required)')).toBeNull()
    expect(document.body.textContent).not.toContain('leaked')
  })
  it('stages explicit removal separately from discarding unsaved changes', () => {
    const onDraftChange = vi.fn()
    const { rerender } = render(<SettingsGroupForm group={connections} {...state(connections)} onDraftChange={onDraftChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove override for Nanite API URL' }))
    expect(onDraftChange).toHaveBeenLastCalledWith({ nanite_url: { kind: 'unset' } })
    rerender(<SettingsGroupForm group={connections} {...state(connections)} draft={{ nanite_url: { kind: 'unset' } }} onDraftChange={onDraftChange} />)
    expect((screen.getByLabelText('Nanite API URL') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(onDraftChange).toHaveBeenLastCalledWith({})
  })
  it('isolates unsupported groups and prevents unknown contract versions from rendering controls', () => {
    const unsupported = { ...scalarGroup({ type: 'array' }), id: 'unsupported' }
    const props = { groups: [unsupported, connections], states: { ...initialStates, unsupported: scalarState('') }, onDraftChange: vi.fn() }
    const { rerender } = render(<SettingsRenderer {...props} contractVersion={1} />)
    expect(screen.getByRole('alert').textContent).toContain('Unsupported')
    expect(screen.getByLabelText('Nanite API URL')).toBeTruthy()
    rerender(<SettingsRenderer {...props} contractVersion={2} />)
    expect(screen.queryByRole('form')).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('Unsupported admin contract')
  })
  it('supports reset-only capability without granting replacement edits or update submission', () => {
    const g = { ...connections, capabilities: { can_read: true, can_validate: true, can_update: false, can_reset: true } }
    const onReset = vi.fn(), onSave = vi.fn(), onDraftChange = vi.fn()
    const draft = { nanite_url: { kind: 'unset' as const } }
    render(<SettingsGroupForm group={g} {...state(g)} draft={draft} onDraftChange={onDraftChange} onSave={onSave} onReset={onReset} />)
    expect((screen.getByLabelText('Torque API URL') as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    fireEvent.submit(screen.getByRole('form'))
    fireEvent.click(screen.getByRole('button', { name: 'Remove staged overrides' }))
    expect(onReset).toHaveBeenCalledWith(['nanite_url'])
    expect(onSave).not.toHaveBeenCalled()
  })
  it('labels boolean and typed enum controls and emits typed choices', () => {
    const onDraftChange = vi.fn()
    render(<SettingsGroupForm group={preferences} {...state(preferences)} onDraftChange={onDraftChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Developer mode (required)' }))
    expect(onDraftChange).toHaveBeenLastCalledWith({ developer_mode: { kind: 'value', value: true } })
    const select = screen.getByRole('combobox', { name: 'Tool drawer retention (minutes; -1 keeps) (required)' })
    fireEvent.change(select, { target: { value: '1' } })
    expect(onDraftChange).toHaveBeenLastCalledWith({ tool_drawer_retention: { kind: 'value', value: 5 } })
    expect(within(screen.getByRole('combobox', { name: 'Embedding mode (required)' })).getByRole('option', { name: '(empty string)' })).toBeTruthy()
  })
})
