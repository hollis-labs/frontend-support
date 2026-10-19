import type { PluginSettingsCapabilities } from '../src/settings-model.js'
export function capabilities(keys: readonly string[]): PluginSettingsCapabilities {
  return { id: 'plugin.config', label: 'Plugin configuration', can_read: true, can_validate: true, can_update: true, can_reset: true,
    permissions: Object.fromEntries(keys.map(key => [key, { editable: true, restart_required: false }])) }
}
import { vi } from 'vitest'
import type { PluginSettingsAdapter, PluginSettingsSnapshot, SettingsTarget } from '../src/settings-contract.js'
export const target: SettingsTarget = { kind: 'plugin', owner: 'notes', generation: '1', scope: { kind: 'project', id: 'project-one' } }
export function snapshot(revision = 'one'): PluginSettingsSnapshot {
  return { revision, values: {
    name: { present: true, value: 'Original', editable: true, has_override: true },
    ratio: { present: true, value: 1, editable: true, has_override: true },
    token: { present: true, secret_present: true, editable: true, has_override: true },
  } }
}
export function transport(initial = snapshot()) {
  const adapter: PluginSettingsAdapter = {
    read: vi.fn(async () => initial), validate: vi.fn(async () => ({ valid: true, errors: [] })),
    save: vi.fn(async () => ({ status: 'saved' as const, snapshot: snapshot('saved') })), reset: vi.fn(async () => ({ status: 'saved' as const, snapshot: snapshot('reset') })),
  }
  return adapter
}
