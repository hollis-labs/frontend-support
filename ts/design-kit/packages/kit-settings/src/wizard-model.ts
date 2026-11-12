import { evaluateSettings, inspectSettingsGroup, snapshotProblem } from './model'
import type { SettingsChanges, SettingsGroup, SettingsState } from './model'

/** Local presentation intent, not an atomic multi-group wire request. */
export interface SettingsWizardIntent { readonly groupId: string; readonly changes: SettingsChanges }
export interface SettingsWizardCheck {
  readonly status: 'idle' | 'running' | 'ok' | 'failed'
  readonly message?: string
  readonly blocking: boolean
}
export interface SettingsWizardResult {
  readonly status: 'saving' | 'saved' | 'failed'
  readonly message?: string
}
/** Schema-only order: snapshots, drafts and completion never reshuffle it. */
export function settingsWizardGroups(groups: readonly SettingsGroup[]): readonly SettingsGroup[] {
  const required = (group: SettingsGroup) => {
    const profile = inspectSettingsGroup(group)
    return typeof profile !== 'string' && profile.fields.some(f => f.required)
  }
  return [...groups.filter(required), ...groups.filter(g => !required(g))]
}
export function wizardCheckBlocks(check: SettingsWizardCheck | undefined): boolean {
  if (!check) return false
  if (!['idle', 'running', 'ok', 'failed'].includes(check.status) || typeof check.blocking !== 'boolean') return true
  return check.blocking && check.status !== 'ok'
}
export function settingsWizardEvaluation(groups: readonly SettingsGroup[], states: Readonly<Record<string, SettingsState | undefined>>) {
  const evaluations = groups.map(group => {
    const profile = inspectSettingsGroup(group), state = states[group.id]
    const problem = typeof profile === 'string' ? profile : !profile.canRead ? 'Reading this group is unavailable.' : !state ? 'Waiting for a settings snapshot.' : snapshotProblem(profile, state.values)
    const evaluated = typeof profile !== 'string' && state && !problem ? evaluateSettings(profile, state.values, state.draft) : undefined
    return { group, profile, state, problem, evaluated }
  })
  const plan: SettingsWizardIntent[] = []
  for (const e of evaluations) if (e.evaluated && (Object.keys(e.evaluated.changes.set).length || e.evaluated.changes.unset.length)) plan.push({ groupId: e.group.id, changes: e.evaluated.changes })
  return { evaluations, plan, complete: evaluations.every(e => !e.problem && e.evaluated?.errors.length === 0) }
}
