import naniteExample from '../../../docs/examples/nanite-admin-manifest.json'
import tachyonExample from '../../../docs/examples/tachyon-admin-manifest.json'
import { initialStates } from '../../kit-settings/demo/fixtures'
import type { AdminManifest, AdminObservations, AdminSettingsRead } from '../src'
import type { DiagnosticValue, ObservationState } from '@hollis-labs/kit-observe'

// Explicit presentation fixtures, not a wire adapter or live endpoint proof.
export const nanite = naniteExample as AdminManifest
export const tachyon = tachyonExample as AdminManifest
export const nowMs = Date.parse('2026-10-02T00:00:30Z')
const observedAt = '2026-10-02T00:00:00Z'
export const tether: AdminManifest = {
  contract_version: 1, app: { id: 'tether-fixture', label: 'Tether split fixture' }, revision: 'tether-fixture-1',
  settings: [{ id: 'daemon', label: 'Daemon desired configuration', section: 'settings', scope: { kind: 'app', id: 'tether-fixture' },
    schema: { type: 'object', additionalProperties: false, properties: { shutdown_timeout: { type: 'integer', title: 'Shutdown timeout', minimum: 0 }, socket_path: { type: 'string', title: 'Configured socket path', readOnly: true } } },
    fields: { shutdown_timeout: { editable: true, secret: false, restart_required: true, apply_target: 'tether' }, socket_path: { editable: false, secret: false, restart_required: false, read_only_reason: 'Managed by deployment configuration' } },
    capabilities: { can_read: true, can_validate: true, can_update: true, can_reset: true } }],
  health: [{ id: 'daemon', label: 'Daemon reachability', section: 'status', stale_after_ms: 45000 }],
  stats: [{ id: 'uptime', label: 'Daemon uptime', section: 'status', unit: 'seconds', kind: 'gauge', stale_after_ms: 45000 }],
  series: [], diagnostics: [{ id: 'socket', label: 'Observed socket state', section: 'diagnostics', stale_after_ms: 45000, schema: { type: 'object', properties: { exists: { type: 'boolean' }, pid: { type: 'integer' } } } }],
}
export function fixtureSettings(manifest: AdminManifest): Record<string, AdminSettingsRead> {
  if (manifest.app.id === 'tether-fixture') return { daemon: { phase: 'ready', state: { draft: {}, apply: { restartRequired: true, applyTargets: ['tether'] }, values: {
    shutdown_timeout: { present: true, value: 30, editable: true, has_override: true, source: { kind: 'override', label: 'app override' }, apply_state: 'pending_restart' },
    socket_path: { present: true, value: '/fixture/tether.sock', editable: false, has_override: false, read_only_reason: 'Managed by deployment configuration', source: { kind: 'env', label: 'deployment environment' }, apply_state: 'unknown' },
  } } } }
  return Object.fromEntries(manifest.settings.map(group => [group.id, { phase: 'ready', state: structuredClone(initialStates[group.id]) }]))
}
export function fixtureObservations(manifest: AdminManifest): AdminObservations {
  const diagnosticData = (): DiagnosticValue => {
    if (manifest.app.id === 'tether-fixture') return { exists: false, pid: 123 }
    if (manifest.app.id === 'nanite') return { embedding_status: 'idle' }
    return { plugins: [{ id: 'observe-ops', state: 'unknown' }] }
  }
  const observation = (staleAfterMs: number): ObservationState => ({ phase: 'ready', nowMs, staleAfterMs, observedAt })
  return {
    health: Object.fromEntries(manifest.health.map(resource => [resource.id, { status: 'unknown', checks: [{ id: 'runtime', label: 'Runtime', status: 'unknown', message: 'Fixture evidence only.' }], observation: observation(resource.stale_after_ms) }])),
    stats: Object.fromEntries(manifest.stats.map(resource => [resource.id, { value: 0, observation: observation(resource.stale_after_ms) }])),
    series: Object.fromEntries(manifest.series.map(resource => [resource.id, { points: [{ at: '2026-10-01T23:00:00Z', value: 0 }, { at: '2026-10-01T23:30:00Z', value: null }, { at: '2026-10-01T23:45:00Z', value: 9 }], requested: { from: '2026-10-01T23:00:00Z', to: '2026-10-02T00:00:00Z', limit: 4 }, truncated: true, observation: observation(resource.stale_after_ms) }])),
    diagnostics: Object.fromEntries(manifest.diagnostics.map(resource => [resource.id, { data: diagnosticData(), validation: { state: 'valid' }, observation: observation(resource.stale_after_ms) }])),
  }
}
