import { useId } from 'react'
import { Button } from '@hollis-labs/design-components'
import { SettingsGroupForm } from './settings'
import { settingsWizardEvaluation, settingsWizardGroups, wizardCheckBlocks } from './wizard-model'
import type { SettingsWizardCheck, SettingsWizardIntent, SettingsWizardResult } from './wizard-model'
import type { SettingsDraft, SettingsGroup, SettingsState } from './model'

export interface SettingsWizardProps {
  readonly contractVersion: number
  readonly groups: readonly SettingsGroup[]
  readonly states: Readonly<Record<string, SettingsState | undefined>>
  /** Zero-based group step, or groups.length for review. Host persists/resumes if desired. */
  readonly step: number
  readonly onStepChange: (step: number) => void
  readonly onDraftChange: (groupId: string, draft: SettingsDraft) => void
  readonly onComplete: (plan: readonly SettingsWizardIntent[]) => void
  readonly checks?: Readonly<Record<string, SettingsWizardCheck | undefined>>
  readonly onCheck?: (groupId: string) => void
  readonly results?: Readonly<Record<string, SettingsWizardResult | undefined>>
  readonly busy?: boolean
}
function CheckResult({ check }: { check?: SettingsWizardCheck }) {
  const labels = { idle: 'Not checked', running: 'Running', ok: 'OK', failed: 'Failed' }
  const label = check ? Object.hasOwn(labels, check.status) ? labels[check.status] : 'Unsupported result' : 'Not reported'
  return <div className="flex flex-col gap-1 text-control text-fg-muted"><p role="status">Connectivity check: {label}</p>{check?.message ? <p>{check.message}</p> : null}{check?.blocking && check.status !== 'ok' ? <p>This host-required check must report OK before continuing.</p> : null}</div>
}
function SaveResult({ result }: { result?: SettingsWizardResult }) {
  const labels = { saving: 'Saving', saved: 'Saved', failed: 'Failed' }
  return <div className="text-control text-fg-muted"><p role={result?.status === 'failed' ? 'alert' : 'status'}>Save result: {result ? Object.hasOwn(labels, result.status) ? labels[result.status] : 'Unsupported result' : 'Not reported'}</p>{result?.message ? <p>{result.message}</p> : null}</div>
}
/** Controlled schema-driven setup. No storage, network, completion state or retry timers. */
export function SettingsWizard({ contractVersion, groups, states, step, onStepChange, onDraftChange, onComplete, checks = {}, onCheck, results = {}, busy = false }: SettingsWizardProps) {
  const id = useId()
  const ordered = settingsWizardGroups(groups)
  const { evaluations, plan, complete } = settingsWizardEvaluation(ordered, states)
  if (contractVersion !== 1) return <p role="alert" className="text-control text-danger">Unsupported admin contract version. Setup is unavailable.</p>
  if (new Set(groups.map(g => g.id)).size !== groups.length) return <p role="alert" className="text-control text-danger">Duplicate settings groups. Setup is unavailable.</p>
  const invalid = evaluations.find(e => e.problem)
  if (invalid) return <p role="alert" className="text-control text-danger">{invalid.group.label}: {invalid.problem} Setup is unavailable.</p>
  if (!Number.isInteger(step) || step < 0 || step > ordered.length) return <p role="alert" className="text-control text-danger">The host supplied an unavailable setup step.</p>
  const review = step === ordered.length, current = evaluations[step]
  const saving = Object.values(results).some(r => r?.status === 'saving')
  const locked = busy || saving || evaluations.some(e => e.state?.busy)
  const canNext = !locked && !review && current.evaluated?.errors.length === 0 && !wizardCheckBlocks(checks[current.group.id])
  const canFinish = !locked && complete && ordered.every(g => !wizardCheckBlocks(checks[g.id]))
  return <section aria-labelledby={`${id}-title`} className="flex min-w-0 flex-col gap-4 text-control text-fg">
    <h2 id={`${id}-title`} className="text-control font-semibold">Setup wizard</h2>
    <ol aria-label="Setup steps" className="flex flex-wrap gap-3 text-label text-fg-muted">{[...ordered.map(g => g.label), 'Review'].map((label, index) => <li key={index} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}{index < ordered.length ? evaluations[index].evaluated?.errors.length === 0 && !wizardCheckBlocks(checks[ordered[index].id]) ? ' — Complete' : ' — Needs attention' : ''}</li>)}</ol>
    <p role="status">Step {step + 1} of {ordered.length + 1}: {review ? 'Review' : current.group.label}</p>
    {review ? <div className="flex min-w-0 flex-col gap-4">
      <h3 className="text-control font-semibold">Review setup</h3>
      <p className="text-control text-fg-muted">Changes are saved per group. Groups may succeed or fail independently; this is not one atomic transaction.</p>
      {evaluations.map(e => {
        const fields = typeof e.profile === 'string' ? [] : e.profile.fields
        const changes = e.evaluated!.changes
        return <section key={e.group.id} aria-label={`Review ${e.group.label}`} className="flex min-w-0 flex-col gap-2 rounded-panel border border-border bg-bg-elevated p-4">
          <h4 className="text-control font-semibold">{e.group.label}</h4>
          {!Object.keys(changes.set).length && !changes.unset.length ? <p>No pending changes.</p> : <ul className="flex flex-col gap-1 text-control text-fg-secondary">{Object.entries(changes.set).map(([key, value]) => {
            const field = fields.find(f => f.key === key)!
            return <li key={key}>{field.schema.title ?? key}: {field.secret ? 'will be replaced' : value === '' ? '(empty string)' : String(value)}</li>
          })}{changes.unset.map(key => <li key={key}>{fields.find(f => f.key === key)?.schema.title ?? key}: override will be removed; host resolves fallback.</li>)}</ul>}
          {e.evaluated!.errors.length ? <p role="alert" className="text-danger">This group has invalid values. Go back and review the field errors.</p> : null}
          <CheckResult check={checks[e.group.id]} /><SaveResult result={results[e.group.id]} />
        </section>
      })}
    </div> : <>
      <SettingsGroupForm group={current.group} {...current.state!} busy={locked} requiredFirst readOnlyContext onDraftChange={draft => { if (!locked) onDraftChange(current.group.id, draft) }} />
      <CheckResult check={checks[current.group.id]} />
      {onCheck ? <Button type="button" size="sm" variant="outline" className="self-start rounded-(--radius-control)" disabled={locked || checks[current.group.id]?.status === 'running'} onClick={() => { if (!locked && checks[current.group.id]?.status !== 'running') onCheck(current.group.id) }}>Request connectivity check</Button> : null}
    </>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" className="rounded-(--radius-control)" disabled={locked || step === 0} onClick={() => { if (!locked && step > 0) onStepChange(step - 1) }}>Back</Button>
      {review ? <Button type="button" size="sm" className="rounded-(--radius-control)" disabled={!canFinish} onClick={() => { if (canFinish) onComplete(plan) }}>Submit setup</Button>
        : <Button type="button" size="sm" className="rounded-(--radius-control)" disabled={!canNext} onClick={() => { if (canNext) onStepChange(step + 1) }}>Next</Button>}
    </div>
  </section>
}
