import { Button } from '@hollis-labs/design-components'
import { SettingsRenderer } from './settings'
import type { SettingsGroup } from './model'
import { settingsMetadataProblem, projectionProblem } from './provenance-model'
import type { SettingsMetadataValue, SettingsProvenanceState, SettingsProvenanceRendererProps } from './provenance-model'

function FieldMetadata({ group, value, fieldKey }: { group: SettingsGroup; value: SettingsMetadataValue; fieldKey: string }) {
  const declaration = (group.fields as Record<string, Record<string, unknown>>)[fieldKey]
  const source = value.source as { kind: string; label: string } | undefined
  const canRemove = (group.capabilities as Record<string, unknown>).can_reset === true && declaration.editable && value.editable && value.has_override
  return <div className="flex flex-col gap-1 text-control text-fg-muted">
    <p>{source ? `Source: ${source.kind} — ${source.label}` : 'Source: not present'}</p>
    {source?.kind === 'override' ? <p>{canRemove ? 'Remove override stages a reset; the host resolves the fallback.' : 'Override removal is unavailable in this context.'}</p> : null}
    {declaration.restart_required ? <p>Restart required when changed: {String(declaration.apply_target)}</p> : null}
    <p>Apply state: {value.apply_state === 'pending_restart' ? 'Pending restart' : value.apply_state === 'active' ? 'Active' : 'Unknown'}</p>
  </div>
}
function ApplySurface({ groupId, state, onApply }: { groupId: string; state: SettingsProvenanceState; onApply?: SettingsProvenanceRendererProps['onApply'] }) {
  const problem = projectionProblem(state.apply)
  const pending = Object.values(state.values).some(v => v.apply_state === 'pending_restart')
  const required = state.apply?.restartRequired
  const mismatch = required === true && !pending ? 'The app requires a restart; no field reports pending restart.'
    : required === false && pending ? 'Fields report pending restart; the app projection reports no restart required.' : undefined
  const canApply = !problem && required === true && !!onApply && !state.busy && !state.applying
  return <section aria-label="Apply and restart" className="flex flex-col gap-2 border-t border-border pt-3 text-control text-fg-muted" aria-busy={state.applying || undefined}>
    <p role="status">{required === true ? 'The app reports restart required.' : required === false ? 'The app reports no restart required.' : 'Restart status is unknown.'}</p>
    {mismatch ? <p>{mismatch}</p> : null}
    {problem ? <p role="alert">{problem}</p> : null}
    {!problem && required ? <><p>Restart targets: {state.apply!.applyTargets.join(', ')}</p>
      {onApply ? <Button type="button" size="sm" className="self-start rounded-(--radius-control)" disabled={!canApply} onClick={() => { if (canApply) onApply(groupId, [...state.apply!.applyTargets]) }}>{state.applying ? 'Applying…' : 'Apply / restart'}</Button> : <p>The app has not provided an apply action.</p>}
    </> : null}
    {state.applyError ? <p role="alert" className="text-danger">{state.applyError}</p> : null}
  </section>
}

/** Composes the existing field/footer seams. Metadata and pending status are never stored here. */
export function SettingsProvenanceRenderer({ states, onApply, fieldExtra, groupFooter, groupUnavailable, ...props }: SettingsProvenanceRendererProps) {
  const unavailable: Record<string, string | undefined> = { ...groupUnavailable }
  for (const group of props.groups) {
    const state = states[group.id]
    if (state) unavailable[group.id] = settingsMetadataProblem(group, state) ?? groupUnavailable?.[group.id]
  }
  return <SettingsRenderer {...props} states={states} groupUnavailable={unavailable}
    fieldExtra={(groupId, key) => <><FieldMetadata group={props.groups.find(g => g.id === groupId)!} value={states[groupId]!.values[key]} fieldKey={key} />{fieldExtra?.(groupId, key)}</>}
    groupFooter={groupId => <><ApplySurface groupId={groupId} state={states[groupId]!} onApply={onApply} />{groupFooter?.(groupId)}</>} />
}
