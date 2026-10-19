import nanite from '../../../docs/examples/nanite-admin-manifest.json'
import tachyon from '../../../docs/examples/tachyon-admin-manifest.json'
import type { SettingsProvenanceState, SettingsMetadataValue } from '../src'
export { nanite, tachyon }
const value = (v: string | number | boolean, override = true): SettingsMetadataValue => ({ present: true, value: v, editable: true, has_override: override, source: { kind: override ? 'override' : 'default', label: override ? 'app override' : 'declared default' }, apply_state: 'active' })
/** Illustrative host snapshots, explicitly authored; schema defaults never initialize controls. */
export const initialStates: Record<string, SettingsProvenanceState> = {
  'app.preferences': { apply: { restartRequired: false, applyTargets: [] }, draft: {}, values: {
    developer_mode: value(false), tool_stream_behavior: value('streaming'), tool_drawer_retention: value(-1), embedding_mode: value(''),
  } },
  'app.deployment': { apply: { restartRequired: false, applyTargets: [] }, draft: {}, values: {
    listen_address: { present: true, value: '127.0.0.1:8090', editable: false, has_override: false, read_only_reason: 'Managed by deployment configuration', source: { kind: 'env', label: 'deployment environment' }, apply_state: 'unknown' },
  } },
  'plugin.example-notifier': { apply: { restartRequired: false, applyTargets: [] }, draft: {}, values: {
    api_token: { present: true, secret_present: true, editable: true, has_override: true, source: { kind: 'override', label: 'plugin secret override' }, apply_state: 'unknown' },
  } },
  'plugin.observe-ops': { apply: { restartRequired: true, applyTargets: ['observe-ops'] }, draft: {}, values: {
    nanite_url: { ...value('http://127.0.0.1:8091'), apply_state: 'pending_restart' }, torque_url: value('http://127.0.0.1:8990', false), tether_url: { ...value('http://127.0.0.1:8947', false), source: { kind: 'file', label: 'deployment config' } },
  } },
}
export const demoFallbacks: Record<string, string> = { nanite_url: 'http://127.0.0.1:8090', torque_url: 'http://127.0.0.1:8990', tether_url: 'http://127.0.0.1:8947' }
