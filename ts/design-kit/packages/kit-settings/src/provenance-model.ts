import type { SettingsRendererProps } from './settings'
import { inspectSettingsGroup, snapshotProblem } from './model'
import type { SettingsGroup, SettingsState, SettingsValue } from './model'

/** Presentation only: the host validates/reconciles the approved read metadata. */
export interface SettingsMetadataValue extends SettingsValue {
  readonly source?: unknown
  readonly apply_state?: unknown
}
/** Host-owned reconciled status, including initial loads and conservative backend restarts. */
export interface SettingsApplyProjection {
  readonly restartRequired: boolean
  readonly applyTargets: readonly string[]
}
export interface SettingsProvenanceState extends SettingsState {
  readonly values: Readonly<Record<string, SettingsMetadataValue>>
  readonly apply?: SettingsApplyProjection
  readonly applying?: boolean
  readonly applyError?: string
}
export interface SettingsProvenanceRendererProps extends Omit<SettingsRendererProps, 'states'> {
  readonly states: Readonly<Record<string, SettingsProvenanceState | undefined>>
  /** Explicit intent, no endpoint or restart operation inside the kit. */
  readonly onApply?: (groupId: string, targets: readonly string[]) => void
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const kinds = ['default', 'env', 'file', 'override']
const applyStates = ['active', 'pending_restart', 'unknown']

/** Invalid field metadata prevents that group's settings writes, without defaulting anything. */
export function settingsMetadataProblem(group: SettingsGroup, state: SettingsProvenanceState): string | undefined {
  const profile = inspectSettingsGroup(group)
  if (typeof profile === 'string') return profile
  const problem = snapshotProblem(profile, state.values)
  if (problem) return problem
  for (const field of profile.fields) {
    const value = state.values[field.key]
    if (value.present ? !record(value.source) || typeof value.source.kind !== 'string' || !kinds.includes(value.source.kind) || !nonempty(value.source.label) : value.source !== undefined) return 'Settings provenance is missing or unsupported. This group cannot be changed.'
    if (typeof value.apply_state !== 'string' || !applyStates.includes(value.apply_state)) return 'Settings apply state is missing or unsupported. This group cannot be changed.'
    const declaration = (group.fields as Record<string, Record<string, unknown>>)[field.key]
    if (!declaration.restart_required && declaration.apply_target !== undefined) return 'Settings restart declaration is inconsistent. This group cannot be changed.'
  }
}
export function projectionProblem(apply: SettingsApplyProjection | undefined): string | undefined {
  if (!apply) return 'The app has not supplied reconciled restart status.'
  if (typeof apply.restartRequired !== 'boolean') return 'The app supplied unsupported restart status.'
  if (!Array.isArray(apply.applyTargets)) return apply.restartRequired ? 'A restart is needed but the app did not say what to restart.' : 'The app supplied inconsistent restart targets. No apply action is available.'
  if (apply.restartRequired && apply.applyTargets.length === 0) return 'A restart is needed but the app did not say what to restart.'
  if (apply.applyTargets.some(t => !nonempty(t)) || new Set(apply.applyTargets).size !== apply.applyTargets.length || (!apply.restartRequired && apply.applyTargets.length > 0)) return 'The app supplied inconsistent restart targets. No apply action is available.'
}
