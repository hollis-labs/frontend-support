import { useState } from 'react'
import { Button } from '@hollis-labs/design-components'
import { SettingsWizard } from '../src'
import type { SettingsState, SettingsWizardCheck, SettingsWizardIntent, SettingsWizardResult } from '../src'
import { initialStates, nanite, tachyon, demoFallbacks } from './fixtures'

/** Local host fixture only; checks and save outcomes below are explicitly simulated, never fetched. */
export function WizardDemo() {
  const [states, setStates] = useState<Record<string, SettingsState>>(() => ({ ...initialStates,
    'plugin.example-notifier': { ...initialStates['plugin.example-notifier'], values: { api_token: { present: false, secret_present: false, editable: true, has_override: false } } },
  }))
  const [steps, setSteps] = useState({ nanite: 0, tachyon: 0 })
  const [checks, setChecks] = useState<Record<string, SettingsWizardCheck>>({})
  const [results, setResults] = useState<Record<string, SettingsWizardResult>>({})
  const [failCheck, setFailCheck] = useState(false)
  const [failSave, setFailSave] = useState(false)
  const [submits, setSubmits] = useState(0)
  const complete = (plan: readonly SettingsWizardIntent[]) => {
    setSubmits(previous => previous + 1)
    for (const { groupId, changes } of plan) {
      if (failSave && groupId === 'plugin.example-notifier') { setResults(previous => ({ ...previous, [groupId]: { status: 'failed', message: 'Demo secret save rejected; draft retained.' } })); continue }
      setStates(previous => {
        const values = { ...previous[groupId].values }
        for (const [key, value] of Object.entries(changes.set)) values[key] = values[key].secret_present !== undefined
          ? { present: true, secret_present: true, editable: true, has_override: true }
          : { ...values[key], present: true, value, has_override: true }
        for (const key of changes.unset) values[key] = { ...values[key], present: true, value: demoFallbacks[key], has_override: false }
        // Fallbacks here are explicit fixture data; real hosts resolve and validate them.
        return { ...previous, [groupId]: { ...previous[groupId], values, draft: {} } }
      })
      setResults(previous => ({ ...previous, [groupId]: { status: 'saved', message: 'Demo host accepted this group.' } }))
    }
  }
  return <section aria-label="Wizard demos" className="flex min-w-0 flex-col gap-6">
    <h2 className="text-control font-semibold">Schema-driven setup demos</h2>
    <p className="text-control text-fg-muted">Simulated host results only. No network, storage or app onboarding.</p>
    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={failCheck} onChange={e => setFailCheck(e.target.checked)} />Fail wizard checks in demo host</label>
    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={failSave} onChange={e => setFailSave(e.target.checked)} />Fail wizard secret saves in demo host</label>
    <p role="status">Wizard submit count: {submits}</p>
    <Button type="button" variant="outline" size="sm" className="self-start rounded-(--radius-control)" onClick={() => setSteps(previous => ({ ...previous, nanite: 2 }))}>Resume Nanite secret step</Button>
    {[nanite, tachyon].map(manifest => <section key={manifest.app.id} aria-label={`${manifest.app.label} wizard`} className="flex min-w-0 flex-col gap-4">
      <h3 className="text-control font-semibold">{manifest.app.label} setup</h3>
      <SettingsWizard contractVersion={manifest.contract_version} groups={manifest.settings} states={states} step={steps[manifest.app.id as keyof typeof steps]}
        onStepChange={step => setSteps(previous => ({ ...previous, [manifest.app.id]: step }))}
        onDraftChange={(groupId, draft) => {
          setStates(previous => ({ ...previous, [groupId]: { ...previous[groupId], draft } }))
          // A changed draft invalidates this host's previous simulated check/save reports.
          setChecks(previous => ({ ...previous, [groupId]: { status: 'idle', blocking: true } }))
          setResults(previous => { const next = { ...previous }; delete next[groupId]; return next })
        }} checks={checks} onCheck={groupId => setChecks(previous => ({ ...previous, [groupId]: { status: failCheck ? 'failed' : 'ok', blocking: true, message: failCheck ? 'Demo host check failed.' : 'Demo host check passed.' } }))}
        results={results} onComplete={complete} />
    </section>)}
  </section>
}
