/** Host transport projections only; these do not define a backend wire protocol. */
export type PluginSettingScalar = string | number | boolean
export interface SettingsScope { kind: 'client' | 'environment' | 'project'; id: string }
export type SettingsTarget = { kind: 'plugin'; owner: string; generation: string; scope: SettingsScope }
  | { kind: 'app'; appId: string; scope: SettingsScope }
export interface PluginSettingValue {
  present: boolean
  value?: PluginSettingScalar
  secret_present?: boolean
  editable: boolean
  has_override: boolean
  read_only_reason?: string
  source?: { kind: 'default' | 'env' | 'file' | 'override'; label: string }
  apply_state?: 'active' | 'pending_restart' | 'unknown'
}
export interface PluginSettingsSnapshot {
  revision: string
  values: Readonly<Record<string, PluginSettingValue>>
  apply?: { restartRequired: boolean; applyTargets: readonly string[] }
}
export interface PluginSettingsChanges { set: Readonly<Record<string, PluginSettingScalar>>; unset: readonly string[] }
export interface PluginSettingsValidation { valid: boolean; errors: readonly { path: string; code: string; message: string }[] }
export type PluginSettingsMutationResult = { status: 'saved'; snapshot: PluginSettingsSnapshot } | { status: 'conflict'; revision: string }
export interface PluginSettingsAdapter {
  read(target: SettingsTarget, signal: AbortSignal): Promise<PluginSettingsSnapshot>
  validate(target: SettingsTarget, request: { revision: string; changes: PluginSettingsChanges }, signal: AbortSignal): Promise<PluginSettingsValidation>
  save(target: SettingsTarget, request: { revision: string; changes: PluginSettingsChanges }, signal: AbortSignal): Promise<PluginSettingsMutationResult>
  reset(target: SettingsTarget, request: { revision: string; keys: readonly string[] }, signal: AbortSignal): Promise<PluginSettingsMutationResult>
}
