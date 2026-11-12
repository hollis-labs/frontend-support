import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AdminContent, AdminNavigation, AdminShell, adminManifestProblem, adminPages } from '../index'
import type { AdminContentProps, AdminManifest } from '../index'
import { fixtureObservations, fixtureSettings, nanite, nowMs, tachyon, tether } from '../../demo/fixtures'

afterEach(cleanup)
function props(manifest: AdminManifest = tachyon): AdminContentProps {
  return { contextKey: 'operator:app', discovery: { phase: 'ready', contextKey: 'operator:app', manifest }, selection: { page: 'settings', groupId: manifest.settings[0]?.id },
    destination: target => ({ onSelect: vi.fn(() => target) }), settings: fixtureSettings(manifest), settingsActions: { onDraftChange: vi.fn(), onSave: vi.fn(), onValidate: vi.fn(), onReset: vi.fn() }, observations: fixtureObservations(manifest), nowMs }
}
function empty(): AdminManifest { return { ...tachyon, settings: [], health: [], stats: [], series: [], diagnostics: [] } }

describe('fail-closed admin presentation', () => {
  it.each(['settings', 'health', 'stats', 'series', 'diagnostics'] as const)('rejects a missing %s array', kind => {
    const malformed = { ...tachyon }; Reflect.deleteProperty(malformed, kind)
    render(<AdminContent {...props()} discovery={{ ...props().discovery, manifest: malformed }} />)
    expect(screen.getByRole('alert').textContent).toContain(`missing ${kind} array`)
    expect(screen.queryByRole('textbox')).toBeNull()
  })
  it.each(['settings', 'health', 'stats', 'series', 'diagnostics'] as const)('rejects a contradictory %s section without relocating it', kind => {
    const malformed = { ...nanite, [kind]: nanite[kind].map(resource => ({ ...resource, section: 'wrong' })) }
    expect(adminManifestProblem(malformed)).toContain(`Contradictory ${kind} section`)
    render(<AdminContent {...props(malformed)} />)
    expect(screen.getByRole('alert').textContent).toContain('Contradictory')
  })
  it('blocks unknown versions globally, including observations', () => {
    render(<AdminContent {...props({ ...tachyon, contract_version: 2 })} selection={{ page: 'status' }} />)
    expect(screen.getByRole('alert').textContent).toContain('Unsupported admin contract version')
    expect(screen.queryByText('Reported health')).toBeNull()
  })
  it('rejects duplicate resource identities within a kind', () => {
    expect(adminManifestProblem({ ...tachyon, health: [tachyon.health[0], tachyon.health[0]] })).toContain('identity')
    expect(adminManifestProblem(tether)).toBeUndefined() // Same ID across separate kinds is valid.
  })
  it.each(['settings', 'status', 'diagnostics'] as const)('explains unsupported %s deep links and omits empty nav destinations', page => {
    const p = props(empty())
    render(<><AdminNavigation {...p} selection={{ page }} /><AdminContent {...p} selection={{ page }} /></>)
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Status' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Diagnostics' })).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('unsupported')
  })
  it('all-empty dashboard is a directory with no health or values', () => {
    render(<AdminContent {...props(empty())} selection={{ page: 'dashboard' }} />)
    expect(screen.getByText('No admin resources declared')).toBeTruthy()
    expect(screen.queryByText(/healthy/i)).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(adminPages(empty())).toEqual(['dashboard'])
  })
  it('a failed selected-group read leaves supported siblings navigable', () => {
    const p = props(nanite), select = vi.fn()
    render(<AdminContent {...p} destination={target => ({ onSelect: () => select(target) })} settings={{ ...p.settings, 'app.preferences': { phase: 'error', error: 'Fixture unavailable' } }} />)
    expect(screen.getByText('Settings read failed')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Deployment configuration' }))
    expect(select).toHaveBeenCalledWith({ page: 'settings', groupId: 'app.deployment' })
  })
  it('renders a callback-free read-only preference as labelled text with provenance', () => {
    const source = props(tether), group = tether.settings[0]
    const manifest = { ...tether, settings: [{ ...group,
      schema: { type: 'object', additionalProperties: false, properties: { retention: { type: 'integer', title: 'Drawer retention', enum: [5, 15], readOnly: true } } },
      fields: { retention: { editable: false, secret: false, restart_required: false, read_only_reason: 'Read-only preference' } },
      capabilities: { can_read: true, can_validate: false, can_update: false, can_reset: false } }] }
    const { container } = render(<AdminContent {...source} discovery={{ ...source.discovery, manifest }} settingsActions={undefined}
      settings={{ [group.id]: { phase: 'ready', state: { draft: {}, values: { retention: {
        present: true, value: 15, editable: false, has_override: true, read_only_reason: 'Read-only preference',
        source: { kind: 'override', label: 'Persisted application preference' }, apply_state: 'unknown',
      } } } } }} />)
    const output = screen.getByLabelText('Drawer retention')
    expect(output.tagName).toBe('OUTPUT')
    expect(output.textContent).toBe('15')
    expect(container.querySelector('input, select, textarea')).toBeNull()
    expect(screen.queryByRole('button', { name: /Save|Reset|Validate|Discard/ })).toBeNull()
    expect(screen.getByText('Source: override — Persisted application preference')).toBeTruthy()
    expect(screen.getByText('Apply state: Unknown')).toBeTruthy()
  })
  it('presents writable declarations as text without actions and restores editors with actions', () => {
    const source = props(tether), group = tether.settings[0]
    const manifest: AdminManifest = { ...tether, settings: [{ ...group,
      schema: { type: 'object', additionalProperties: false, properties: {
        shutdown_timeout: { type: 'integer', title: 'Shutdown timeout', enum: [15, 30] },
        socket_path: { type: 'string', title: 'Configured socket path', readOnly: true },
      } },
    }] }
    const settings = source.settings!
    const state = settings[group.id]!.state!
    const withDraft = { ...settings, [group.id]: { ...settings[group.id]!, state: {
      ...state, draft: { shutdown_timeout: { kind: 'value' as const, value: 15 } },
    } } }
    const original = structuredClone({ manifest, settings: withDraft })
    const { container, rerender } = render(<AdminContent {...source} discovery={{ ...source.discovery, manifest }}
      settings={withDraft} settingsActions={undefined} />)
    expect(screen.getByLabelText('Shutdown timeout').tagName).toBe('OUTPUT')
    expect(screen.getByLabelText('Shutdown timeout').textContent).toBe('30')
    expect(screen.getByText('Read only: This view has no editing actions.')).toBeTruthy()
    expect(screen.getByLabelText('Configured socket path').tagName).toBe('OUTPUT')
    expect(container.querySelector('select, input, textarea')).toBeNull()
    expect(screen.queryByRole('button', { name: /Save|Reset|Validate|Discard|Remove override/ })).toBeNull()
    expect(screen.getByText('Source: override — app override')).toBeTruthy()
    expect(screen.getByText('Source: env — deployment environment')).toBeTruthy()
    expect(screen.getByText('Read only: Managed by deployment configuration')).toBeTruthy()
    expect(screen.getByText('Apply state: Pending restart')).toBeTruthy()
    expect(screen.getByText('Apply state: Unknown')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect({ manifest, settings: withDraft }).toEqual(original)

    rerender(<AdminContent {...source} discovery={{ ...source.discovery, manifest }} settings={withDraft} />)
    const select = screen.getByLabelText('Shutdown timeout') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(select.matches(':disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(source.settingsActions!.onSave).toHaveBeenCalledWith(group.id, { set: { shutdown_timeout: 15 }, unset: [] })
    expect({ manifest, settings: withDraft }).toEqual(original)
  })
  it('does not repair malformed capabilities for callback-free Settings', () => {
    const source = props(tether), group = tether.settings[0]
    const manifest = { ...tether, settings: [{ ...group,
      capabilities: { can_read: true, can_validate: false, can_update: true, can_reset: true },
    }] }
    render(<AdminContent {...source} discovery={{ ...source.discovery, manifest }} settingsActions={undefined} />)
    expect(screen.getByRole('alert').textContent).toContain('Writable groups require read and validation capabilities.')
    expect(screen.queryByLabelText('Shutdown timeout')).toBeNull()
  })
  it('first discovery failure is globally unavailable', () => {
    const p = props()
    render(<AdminContent {...p} discovery={{ phase: 'error', contextKey: p.contextKey, error: 'Discovery failed' }} />)
    expect(screen.getByText('Admin unavailable')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByText('Reported health')).toBeNull()
  })
  it.each(['error', 'loading'] as const)('retained declarations during %s suspend editing and every command', phase => {
    const p = props()
    render(<AdminContent {...p} discovery={{ ...p.discovery, phase }} settingsActions={{ ...p.settingsActions!, onApply: vi.fn() }} />)
    expect(screen.getByText('Previous declarations retained')).toBeTruthy()
    const input = screen.getByLabelText('Nanite API URL') as HTMLInputElement
    expect(input.matches(':disabled')).toBe(true)
    fireEvent.change(input, { target: { value: 'changed' } })
    expect(p.settingsActions!.onDraftChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apply / restart' })).toBeNull()
  })
  it('retains a failed group snapshot without accepting draft or command intents', () => {
    const p = props(), id = tachyon.settings[0].id
    render(<AdminContent {...p} settings={{ ...p.settings, [id]: { phase: 'error', state: p.settings![id]!.state, error: 'Read failed' } }} />)
    const input = screen.getByLabelText('Nanite API URL') as HTMLInputElement
    expect(input.matches(':disabled')).toBe(true)
    fireEvent.change(input, { target: { value: 'changed' } })
    expect(p.settingsActions!.onDraftChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    expect(screen.getByText(/Previous snapshot retained/)).toBeTruthy()
  })
  it('keeps field identity and focus when the host updates a controlled draft', () => {
    const p = props(), id = tachyon.settings[0].id
    const { rerender } = render(<AdminContent {...p} />)
    const input = screen.getByLabelText('Nanite API URL') as HTMLInputElement
    input.focus()
    const state = p.settings![id]!.state!
    rerender(<AdminContent {...p} settings={{ ...p.settings, [id]: { phase: 'ready', state: { ...state, draft: { nanite_url: { kind: 'value', value: 'http://fixture/new' } } } } }} />)
    expect(screen.getByLabelText('Nanite API URL')).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('http://fixture/new')
  })
  it('never displays declarations from another authorized context', () => {
    render(<AdminContent {...props()} contextKey="another-principal" />)
    expect(screen.getByText('Admin context unavailable')).toBeTruthy()
    expect(screen.queryByText('Observation connections')).toBeNull()
  })
  it('isolates unsupported group schemas from supported siblings', () => {
    const manifest = { ...nanite, settings: nanite.settings.map((group, index) => index === 0 ? { ...group, schema: { type: 'array' } } : group) }
    const p = props(manifest)
    const { rerender } = render(<AdminContent {...p} />)
    expect(screen.getByRole('alert').textContent).toContain('Unsupported settings group')
    rerender(<AdminContent {...p} selection={{ page: 'settings', groupId: 'app.deployment' }} />)
    expect(screen.getByText('Source: env — deployment environment')).toBeTruthy()
  })
})

describe('canonical controlled pages and setup', () => {
  it('dashboard has only declaration identity and host-owned destinations', () => {
    const p = props(), select = vi.fn()
    render(<AdminContent {...p} selection={{ page: 'dashboard' }} destination={target => ({ onSelect: () => select(target) })} />)
    expect(screen.getByText(tachyon.app.label)).toBeTruthy()
    expect(screen.queryByText('Reported health')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(select).toHaveBeenCalledWith({ page: 'settings' })
    expect(p.settingsActions!.onSave).not.toHaveBeenCalled()
  })
  it('navigation passes through host hrefs and controlled selection', () => {
    render(<AdminNavigation {...props()} selection={{ page: 'status' }} destination={target => ({ href: `/host/admin/${target.page}` })} />)
    const link = screen.getByRole('link', { name: 'Status' })
    expect(link.getAttribute('href')).toBe('/host/admin/status')
    expect(link.getAttribute('aria-current')).toBe('page')
  })
  it('preserves pending state and omits apply by default; never saves on mount', () => {
    const p = props()
    render(<AdminContent {...p} />)
    expect(screen.getByText('Apply state: Pending restart')).toBeTruthy()
    expect(screen.getByText('The app has not provided an apply action.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Apply / restart' })).toBeNull()
    expect(p.settingsActions!.onSave).not.toHaveBeenCalled()
    expect(p.settingsActions!.onValidate).not.toHaveBeenCalled()
  })
  it('forwards a user save intent without ETags, resolution or implicit apply', () => {
    const p = props()
    const state = p.settings!['plugin.observe-ops']!.state!
    render(<AdminContent {...p} settings={{ 'plugin.observe-ops': { phase: 'ready', state: { ...state, draft: { nanite_url: { kind: 'value', value: 'http://fixture/new' } } } } }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(p.settingsActions!.onSave).toHaveBeenCalledWith('plugin.observe-ops', { set: { nanite_url: 'http://fixture/new' }, unset: [] })
  })
  it('setup is an alternate mode and forwards the existing ordered per-group plan', () => {
    const p = props(), complete = vi.fn(), state = p.settings!['plugin.observe-ops']!.state!
    render(<AdminContent {...p} selection={{ page: 'settings', mode: 'setup' }} settings={{ 'plugin.observe-ops': { phase: 'ready', state: { ...state, draft: { nanite_url: { kind: 'value', value: 'http://fixture/new' } } } } }} setup={{ step: 1, onStepChange: vi.fn(), onComplete: complete }} />)
    expect(screen.getByText('Setup wizard')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Submit setup' }))
    expect(complete).toHaveBeenCalledWith([{ groupId: 'plugin.observe-ops', changes: { set: { nanite_url: 'http://fixture/new' }, unset: [] } }])
  })
  it('setup does not infer first-run readiness from failed group reads', () => {
    const p = props(), complete = vi.fn()
    render(<AdminContent {...p} selection={{ page: 'settings', mode: 'setup' }} settings={{}} setup={{ step: 0, onStepChange: vi.fn(), onComplete: complete }} />)
    expect(screen.getByText('Setup unavailable')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Submit setup' })).toBeNull()
    expect(complete).not.toHaveBeenCalled()
  })
  it('Tether-style configuration, locks and pending state stay only in Settings', () => {
    const p = props(tether), { rerender } = render(<AdminShell {...p} />)
    expect(screen.getByLabelText('Shutdown timeout')).toBeTruthy()
    expect((screen.getByLabelText('Configured socket path') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText('Apply state: Pending restart')).toBeTruthy()
    expect(screen.queryByText('Daemon uptime')).toBeNull()
    expect(screen.queryByText('Observed socket state')).toBeNull()
    rerender(<AdminShell {...p} selection={{ page: 'status' }} />)
    expect(screen.getAllByText('Daemon uptime').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Shutdown timeout')).toBeNull()
    rerender(<AdminShell {...p} selection={{ page: 'diagnostics' }} />)
    expect(screen.getByText('Observed socket state')).toBeTruthy()
    expect(screen.queryByLabelText('Configured socket path')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
  })
  it('missing observation snapshots never turn into healthy or zero success', () => {
    render(<AdminContent {...props()} selection={{ page: 'status' }} observations={{}} />)
    expect(screen.getAllByText('Observation unavailable').length).toBeGreaterThan(0)
    expect(screen.queryByText('Reported health')).toBeNull()
    expect(screen.queryByText('0')).toBeNull()
  })
  it('series rendering is explicit and preserves bounds and exact host samples', () => {
    const p = props(nanite), renderSeries = vi.fn(() => <p>Supplied series renderer</p>)
    const { rerender } = render(<AdminContent {...p} selection={{ page: 'diagnostics' }} />)
    expect(screen.getByText('Series renderer unavailable')).toBeTruthy()
    rerender(<AdminContent {...p} selection={{ page: 'diagnostics' }} renderSeries={renderSeries} />)
    expect(renderSeries).toHaveBeenCalledWith(expect.objectContaining({ points: p.observations!.series![nanite.series[0].id]!.points, bounds: { maxPoints: nanite.series[0].max_points, maxWindowSeconds: nanite.series[0].max_window_seconds } }))
  })
})
