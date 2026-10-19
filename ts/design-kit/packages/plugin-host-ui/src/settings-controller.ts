import { evaluateSettings, snapshotProblem, settingsMetadataProblem, settingsPath, type SettingsDraft, type SettingsValidation, type SettingsValues, type SettingsProvenanceState } from '@hollis-labs/kit-settings'
import type { Observable } from './host.js'
import type { PluginSettingsAdapter, PluginSettingsSnapshot, SettingsTarget } from './settings-contract.js'
import type { PluginSettingsProjection } from './settings-model.js'
export interface PluginSettingsState extends SettingsProvenanceState {
  phase: 'loading' | 'ready' | 'unavailable' | 'disposed'
  revision?: string
  conflict?: { baseRevision: string; currentRevision: string }
}
export interface PluginSettingsController extends Observable<PluginSettingsState> {
  projection: PluginSettingsProjection
  target: SettingsTarget
  retain(): () => void
  refresh(): Promise<void>
  setDraft(draft: SettingsDraft): void
  validate(): Promise<void>
  save(): Promise<void>
  reset(): Promise<void>
  cancel(): void
  dispose(): void
}
const emptyDraft: SettingsDraft = Object.freeze({})
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
/** Controller state is transient. The host must dispose it at owner revoke/scope change. */
export function createPluginSettingsController(projection: PluginSettingsProjection, adapter: PluginSettingsAdapter | undefined, targetInput: SettingsTarget): PluginSettingsController {
  const target = Object.freeze({ ...targetInput, scope: Object.freeze({ ...targetInput.scope }) })
  const profile = projection.status === 'supported' ? projection.profile : undefined
  const wrongTarget = !['plugin', 'app'].includes(target.kind) || !target.scope.id?.trim() || !['client', 'environment', 'project'].includes(target.scope.kind) ||
    (target.kind === 'plugin' ? !target.owner?.trim() || !target.generation?.trim() : !target.appId?.trim()) ||
    projection.status === 'supported' && (projection.origin === 'app-isolation') !== (target.kind === 'app')
  const unavailable = projection.status !== 'supported' ? projection.reason : wrongTarget ? 'Invalid settings scope or ownership.' : !adapter ? 'Settings transport unavailable.' : !profile?.canRead ? 'Reading settings is unavailable.' : undefined
  const initial: PluginSettingsState = Object.freeze({ phase: unavailable ? 'unavailable' : 'loading', values: Object.freeze({}), draft: emptyDraft, ...(unavailable ? { error: unavailable } : {}) })
  let state = initial, disposed = false, sequence = 0, references = 0
  let active: AbortController | undefined, pending: PluginSettingsSnapshot | undefined
  const listeners = new Set<() => void>()
  function update(next: PluginSettingsState) {
    state = Object.freeze(next)
    for (const listener of [...listeners]) { try { listener() } catch { /* UI observers do not own the transaction */ } }
  }
  function start() { active?.abort(); active = new AbortController(); return { signal: active.signal, seq: ++sequence } }
  function current(op: { signal: AbortSignal; seq: number }) { return !disposed && !op.signal.aborted && op.seq === sequence }
  function checked(raw: PluginSettingsSnapshot): PluginSettingsSnapshot | undefined {
    if (!profile || projection.status !== 'supported' || !record(raw) || typeof raw.revision !== 'string' || !raw.revision.trim() || !record(raw.values) ||
      Object.keys(raw.values).some(key => !profile.fields.some(field => field.key === key)) || snapshotProblem(profile, raw.values)) return
    const values: Record<string, PluginSettingsSnapshot['values'][string]> = Object.create(null)
    for (const field of profile.fields) {
      const value = raw.values[field.key]!
      // Presence only for secrets; snapshotProblem rejects even an undefined own value.
      values[field.key] = Object.freeze({ present: value.present, editable: value.editable, has_override: value.has_override,
        ...(field.secret ? { secret_present: value.secret_present } : value.present ? { value: value.value } : {}),
        ...(value.read_only_reason ? { read_only_reason: value.read_only_reason } : {}),
        ...(value.source ? { source: Object.freeze({ kind: value.source.kind, label: value.source.label }) } : {}),
        ...(value.apply_state ? { apply_state: value.apply_state } : {}) })
      if (projection.origin === 'app-isolation' && value.present && !field.schema.enum?.includes(value.value!)) return
    }
    const snapshot = Object.freeze({ revision: raw.revision, values: Object.freeze(values),
      ...(raw.apply ? { apply: Object.freeze({ restartRequired: raw.apply.restartRequired, applyTargets: Object.freeze([...raw.apply.applyTargets]) }) } : {}) })
    if (projection.origin === 'app-isolation' && settingsMetadataProblem(projection.group, { ...snapshot, draft: emptyDraft })) return
    return snapshot
  }
  function accept(snapshot: PluginSettingsSnapshot) {
    pending = undefined
    update({ phase: 'ready', values: snapshot.values, revision: snapshot.revision, apply: snapshot.apply, draft: emptyDraft, busy: false })
  }
  function evaluated() {
    if (!profile || state.phase !== 'ready') return
    return evaluateSettings(profile, state.values, state.draft)
  }
  function clearSecrets() {
    if (!profile || disposed) return
    const draft = Object.fromEntries(Object.entries(state.draft).filter(([key]) => !profile.fields.find(field => field.key === key)?.secret))
    if (Object.keys(draft).length !== Object.keys(state.draft).length) update({ ...state, draft: Object.freeze(draft) })
  }
  function cleanValidation(raw: SettingsValidation): SettingsValidation {
    if (typeof raw.valid !== 'boolean' || !Array.isArray(raw.errors) || raw.valid && raw.errors.length) throw new Error('Invalid validation')
    return Object.freeze({ valid: raw.valid, errors: Object.freeze(raw.errors.map(error => {
      if (typeof error.path !== 'string' || typeof error.code !== 'string') throw new Error('Invalid validation')
      // Do not echo backend messages, which might contain submitted secrets.
      return Object.freeze({ path: profile?.fields.some(field => settingsPath(field.key) === error.path) ? error.path : '', code: 'host', message: 'Host validation rejected this setting.' })
    })) })
  }
  async function run(kind: 'validate' | 'save' | 'reset') {
    if (disposed || unavailable || !adapter || !profile || state.busy || state.conflict || !state.revision) return
    const evaluation = evaluated()
    if (!evaluation || evaluation.errors.length || !evaluation.dirty || !profile.canValidate || kind === 'save' && !profile.canUpdate || kind === 'reset' && !profile.canReset) return
    if (kind === 'reset' && (Object.keys(evaluation.changes.set).length || !evaluation.changes.unset.length)) return
    const revision = state.revision, changes = Object.freeze({ set: Object.freeze({ ...evaluation.changes.set }), unset: Object.freeze([...evaluation.changes.unset]) }), op = start()
    update({ ...state, busy: true, error: undefined, validation: undefined })
    try {
      const validation = cleanValidation(await adapter.validate(target, { revision, changes }, op.signal))
      if (!current(op)) return
      if (!validation.valid || kind === 'validate') { update({ ...state, validation, busy: false }); return }
      const result = kind === 'reset' ? await adapter.reset(target, { revision, keys: changes.unset }, op.signal) : await adapter.save(target, { revision, changes }, op.signal)
      if (!current(op)) return
      if (result.status === 'conflict') {
        if (!result.revision?.trim()) throw new Error('Missing conflict revision')
        update({ ...state, busy: false, conflict: { baseRevision: revision, currentRevision: result.revision }, error: 'Settings revision conflict. Discard changes and read the latest snapshot.' })
      } else if (result.status === 'saved') {
        const snapshot = checked(result.snapshot)
        if (!snapshot) { update({ phase: 'unavailable', values: {}, draft: emptyDraft, error: 'Invalid settings snapshot.' }); return }
        accept(snapshot)
      } else throw new Error('Unsupported mutation result')
    } catch {
      if (current(op)) update({ ...state, busy: false, error: 'Settings operation failed.' })
    } finally {
      if (current(op) && kind !== 'validate') clearSecrets()
    }
  }
  const controller: PluginSettingsController = {
    projection, target, getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    retain() {
      if (disposed) throw new Error('Settings controller disposed')
      if (references++ === 0) void controller.refresh()
      let released = false
      return () => { if (!released) { released = true; if (!disposed && --references === 0) controller.cancel() } }
    },
    async refresh() {
      if (disposed || unavailable || !adapter || state.busy) return
      const op = start(); update({ ...state, busy: true, error: undefined })
      try {
        const raw = await adapter.read(target, op.signal)
        if (!current(op)) return
        const next = checked(raw)
        if (!next) { update({ phase: 'unavailable', values: {}, draft: emptyDraft, error: 'Invalid settings snapshot.' }); return }
        if (Object.keys(state.draft).length && state.revision) {
          pending = next
          const conflict = next.revision !== state.revision ? { baseRevision: state.revision, currentRevision: next.revision } : undefined
          update({ ...state, busy: false, conflict, error: conflict ? 'Settings revision conflict. Background read preserved your draft.' : undefined })
        } else accept(next)
      } catch { if (current(op)) update({ ...state, phase: state.revision ? 'ready' : 'unavailable', busy: false, error: 'Settings read failed.' }) }
    },
    setDraft(draft) {
      if (disposed || state.busy || state.phase !== 'ready') return
      // Copy controlled edits; mutations outside the form must not alter custody.
      const copy = Object.fromEntries(Object.entries(draft).map(([key, edit]) => [key, Object.freeze({ ...edit })]))
      update({ ...state, draft: Object.freeze(copy), validation: undefined, error: state.conflict ? state.error : undefined })
    },
    validate: () => run('validate'), save: () => run('save'), reset: () => run('reset'),
    cancel() {
      if (disposed) return
      active?.abort(); sequence++
      if (pending) accept(pending)
      else update({ ...state, draft: emptyDraft, busy: false, validation: undefined, conflict: undefined, error: state.phase === 'unavailable' ? state.error : undefined })
    },
    dispose() {
      if (disposed) return
      disposed = true; references = 0; active?.abort(); sequence++; pending = undefined
      update({ phase: 'disposed', values: Object.freeze({}), draft: emptyDraft }); listeners.clear()
    },
  }
  return controller
}
// Kept explicit for hosts that build presence-only snapshots without React.
export type { SettingsValues, SettingsDraft }
