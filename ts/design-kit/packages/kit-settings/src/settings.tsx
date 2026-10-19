import { useId } from 'react'
import type { ReactNode } from 'react'
import { Button, Input } from '@hollis-labs/design-components'
import { evaluateSettings, inspectSettingsGroup, settingsPath, snapshotProblem } from './model'
import type { Field, SettingsChanges, SettingsDraft, SettingsEdit, SettingsGroup, SettingsState } from './model'

export interface SettingsGroupFormProps extends SettingsState {
  readonly group: SettingsGroup
  readonly unavailable?: string
  readonly requiredFirst?: boolean
  readonly readOnlyContext?: boolean
  readonly onDraftChange: (draft: SettingsDraft) => void
  /** Intent only: host must revalidate on the backend and submit its revision/ETag. */
  readonly onSave?: (changes: SettingsChanges) => void
  readonly onValidate?: (changes: SettingsChanges) => void
  readonly onReset?: (keys: readonly string[]) => void
  /** Seams for provenance/restart presentation; the kit assigns neither meaning. */
  readonly fieldExtra?: (key: string) => ReactNode
  readonly footer?: ReactNode
}
const controlClass = 'text-control md:text-(length:--text-control) text-fg rounded-(--radius-control)'

export function SettingsGroupForm({ group, values, draft, busy = false, validation, error, notice, onDraftChange, onSave, onValidate, onReset, fieldExtra, footer, unavailable: hostUnavailable, requiredFirst = false, readOnlyContext = false }: SettingsGroupFormProps) {
  const id = useId()
  const profile = inspectSettingsGroup(group)
  const unavailable = typeof profile === 'string' ? profile : !profile.canRead ? 'Reading this group is unavailable.' : snapshotProblem(profile, values) || hostUnavailable
  if (typeof profile === 'string' || unavailable) return <section aria-labelledby={`${id}-title`} className="flex min-w-0 flex-col gap-2 rounded-panel border border-border bg-bg-elevated p-4">
    <h2 id={`${id}-title`} className="text-control font-semibold text-fg">{group.label}</h2>
    <p role="alert" className="text-control text-danger">{unavailable}</p>
  </section>
  const fields = requiredFirst ? [...profile.fields.filter(f => f.required), ...profile.fields.filter(f => !f.required)] : profile.fields
  const evaluated = evaluateSettings(profile, values, draft)
  const hasChanges = Object.keys(evaluated.changes.set).length > 0 || evaluated.changes.unset.length > 0
  const canValidate = !busy && profile.canValidate && hasChanges && evaluated.errors.length === 0
  const canSubmit = canValidate && profile.canUpdate
  const canReset = canValidate && profile.canReset && evaluated.changes.unset.length > 0 && Object.keys(evaluated.changes.set).length === 0
  const write = (f: Field, edit?: SettingsEdit) => {
    if (busy || !profile.canValidate || !f.editable || !values[f.key].editable) return
    if (edit && edit.kind !== 'unset' && !profile.canUpdate) return
    if (edit?.kind === 'unset' && (!profile.canReset || !values[f.key].has_override)) return
    const next = { ...draft }
    if (edit) Object.defineProperty(next, f.key, { value: edit, enumerable: true, configurable: true, writable: true })
    else delete next[f.key]
    onDraftChange(next)
  }
  const errors = [...evaluated.errors, ...(validation?.errors ?? [])]
  return <form noValidate aria-labelledby={`${id}-title`} aria-busy={busy} className="flex min-w-0 flex-col gap-4 rounded-panel border border-border bg-bg-elevated p-4" onSubmit={event => {
    event.preventDefault()
    if (canSubmit && onSave) onSave(evaluated.changes)
  }}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={`${id}-title`} className="text-control font-semibold text-fg">{group.label}</h2>
      <span role="status" className="text-label text-fg-muted">{busy ? 'Working…' : evaluated.dirty ? 'Unsaved changes' : 'No changes'}</span>
    </div>
    {fields.map((f, index) => {
      const v = values[f.key], edit = Object.hasOwn(draft, f.key) ? draft[f.key] : undefined
      const fieldId = `${id}-${index}`, helpId = `${fieldId}-help`, errorsId = `${fieldId}-errors`
      const fieldErrors = errors.filter(e => e.path === settingsPath(f.key))
      const writable = f.editable && v.editable && profile.canUpdate && profile.canValidate
      const removable = f.editable && v.editable && profile.canReset && profile.canValidate && v.has_override
      const removed = removable && edit?.kind === 'unset'
      const disabled = busy || !writable || removed
      const value = writable && edit?.kind === 'value' ? edit.value : writable && edit?.kind === 'text' ? edit.text : f.secret ? '' : v.value
      const title = f.schema.title ?? f.key
      const a11y = { id: fieldId, disabled, 'aria-describedby': `${helpId}${fieldErrors.length ? ' ' + errorsId : ''}`, 'aria-invalid': fieldErrors.length > 0 || undefined, 'aria-required': f.required || undefined }
      return <div key={f.key} className="flex min-w-0 flex-col gap-1">
        <label id={`${fieldId}-label`} htmlFor={fieldId} className="text-label font-medium text-fg-secondary">{title}{f.required ? ' (required)' : ''}</label>
        {readOnlyContext && !writable ? <output id={fieldId} aria-labelledby={`${fieldId}-label`} aria-describedby={helpId} className="text-control text-fg">{f.secret ? v.secret_present ? 'Secret is set' : 'Secret is not set' : v.present ? String(v.value) : 'Not set'}</output> : f.schema.enum ? <select {...a11y} className="h-8 w-full min-w-0 rounded-control border border-input bg-bg px-2 text-control text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" value={removed || value === undefined ? '' : String(f.schema.enum.indexOf(value))} onChange={event => {
          const selected = f.schema.enum?.[Number(event.target.value)]
          if (event.target.value !== '' && selected !== undefined) write(f, { kind: 'value', value: selected })
        }}>
          <option value="" disabled>Not set</option>
          {f.schema.enum.map((choice, i) => <option key={i} value={String(i)}>{choice === '' ? '(empty string)' : String(choice)}</option>)}
        </select> : f.schema.type === 'boolean' ? <input {...a11y} type="checkbox" className="size-4 self-start accent-primary focus-visible:ring-2 focus-visible:ring-ring" checked={value === true && !removed} onChange={event => write(f, { kind: 'value', value: event.target.checked })} />
          : <Input {...a11y} className={controlClass} type={f.secret ? 'password' : 'text'} inputMode={f.schema.type === 'integer' || f.schema.type === 'number' ? 'decimal' : undefined} autoComplete={f.secret ? 'new-password' : 'off'} value={removed ? '' : value === undefined ? '' : String(value)} onChange={event => write(f, f.schema.type === 'integer' || f.schema.type === 'number' ? { kind: 'text', text: event.target.value } : { kind: 'value', value: event.target.value })} />}
        <div id={helpId} className="flex flex-col gap-1 text-control text-fg-muted">
          {f.schema.description ? <p>{f.schema.description}</p> : null}
          {f.secret ? <p>{v.secret_present ? 'Secret is set.' : 'Secret is not set.'} {edit?.kind === 'value' ? 'Replacement staged.' : 'Leave untouched to keep it.'}</p> : !v.present && !edit ? <p>Not set. Defaults are resolved by the host.</p> : null}
          {!writable ? <p>Read only: {v.read_only_reason ?? f.reason ?? 'Updates are unavailable.'}</p> : null}
          {removed ? <p>Override removal staged. The host will resolve and validate the fallback.</p> : null}
        </div>
        {fieldErrors.length ? <ul id={errorsId} className="text-control text-danger">{fieldErrors.map((e, i) => <li key={i}>{e.message}</li>)}</ul> : null}
        {removable ? <Button type="button" size="sm" variant="outline" className="self-start rounded-(--radius-control)" disabled={busy} onClick={() => write(f, removed ? undefined : { kind: 'unset' })} aria-label={`${removed ? 'Undo removal of' : 'Remove override for'} ${title}`}>{removed ? 'Undo removal' : 'Remove override'}</Button> : null}
        {fieldExtra?.(f.key)}
      </div>
    })}
    {error || validation?.valid === false || errors.length ? <div role="alert" className="text-control text-danger">{error ?? (validation?.valid === false ? 'The host reported validation errors.' : 'Review the field errors before saving.')}
      {errors.filter(e => !profile.fields.some(f => settingsPath(f.key) === e.path)).map((e, i) => <p key={i}>{e.message}</p>)}
    </div> : null}
    {notice ? <p role="status" className="text-control text-success">{notice}</p> : null}
    {(profile.canUpdate || profile.canReset) && profile.canValidate ? <div className="flex flex-wrap gap-2">
      {onSave && profile.canUpdate ? <Button type="submit" className="rounded-(--radius-control)" size="sm" disabled={!canSubmit}>Save changes</Button> : null}
      {onValidate ? <Button type="button" className="rounded-(--radius-control)" variant="outline" size="sm" disabled={!canValidate} onClick={() => { if (canValidate) onValidate(evaluated.changes) }}>Validate changes</Button> : null}
      {onReset && profile.canReset ? <Button type="button" className="rounded-(--radius-control)" variant="outline" size="sm" disabled={!canReset} onClick={() => { if (canReset) onReset(evaluated.changes.unset) }}>Remove staged overrides</Button> : null}
      <Button type="button" className="rounded-(--radius-control)" variant="outline" size="sm" disabled={busy || !Object.keys(draft).length} onClick={() => { if (!busy) onDraftChange({}) }}>Discard changes</Button>
    </div> : null}
    {footer}
  </form>
}

export interface SettingsRendererProps {
  /** Optional text presentation for nonwritable fields; omitted preserves existing controls. */
  readonly readOnlyContext?: boolean
  readonly groupUnavailable?: Readonly<Record<string, string | undefined>>
  readonly contractVersion: number
  readonly groups: readonly SettingsGroup[]
  readonly states: Readonly<Record<string, SettingsState | undefined>>
  readonly onDraftChange: (groupId: string, draft: SettingsDraft) => void
  readonly onSave?: (groupId: string, changes: SettingsChanges) => void
  readonly onValidate?: (groupId: string, changes: SettingsChanges) => void
  readonly onReset?: (groupId: string, keys: readonly string[]) => void
  readonly fieldExtra?: (groupId: string, key: string) => ReactNode
  readonly groupFooter?: (groupId: string) => ReactNode
}
/** Render only the manifest's settings array. Observations belong to kit-observe. */
export function SettingsRenderer({ contractVersion, groups, states, onDraftChange, onSave, onValidate, onReset, fieldExtra, groupFooter, groupUnavailable, readOnlyContext }: SettingsRendererProps) {
  if (contractVersion !== 1) return <p role="alert" className="text-control text-danger">Unsupported admin contract version. Settings cannot be displayed or changed.</p>
  if (new Set(groups.map(g => g.id)).size !== groups.length) return <p role="alert" className="text-control text-danger">Duplicate settings groups. Settings cannot be changed.</p>
  return <div className="flex min-w-0 flex-col gap-4">{groups.map(group => {
    const state = states[group.id]
    return state ? <SettingsGroupForm key={group.id} group={group} {...state} readOnlyContext={readOnlyContext} unavailable={groupUnavailable?.[group.id]} onDraftChange={draft => onDraftChange(group.id, draft)} onSave={onSave ? changes => onSave(group.id, changes) : undefined} onValidate={onValidate ? changes => onValidate(group.id, changes) : undefined} onReset={onReset ? keys => onReset(group.id, keys) : undefined} fieldExtra={fieldExtra ? key => fieldExtra(group.id, key) : undefined} footer={groupFooter?.(group.id)} />
      : <section key={group.id} className="rounded-panel border border-border bg-bg-elevated p-4"><h2 className="text-control font-semibold text-fg">{group.label}</h2><p role="status" className="text-control text-fg-muted">Waiting for a settings snapshot.</p></section>
  })}</div>
}
