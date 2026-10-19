import { useState } from 'react'
import { SettingsProvenanceRenderer } from '../src'
import type { SettingsChanges, SettingsProvenanceState } from '../src'
import { demoFallbacks, initialStates, nanite, tachyon } from './fixtures'
import { WizardDemo } from './wizard-demo'

export function Demo() {
  const [states, setStates] = useState(initialStates)
  const [reject, setReject] = useState(false)
  const [failApply, setFailApply] = useState(false)
  const [unknownSource, setUnknownSource] = useState(false)
  const [conservative, setConservative] = useState(false)
  const [applies, setApplies] = useState(0)
  const [saved, setSaved] = useState(0)
  const patch = (id: string, update: Partial<SettingsProvenanceState>) => setStates(previous => ({ ...previous, [id]: { ...previous[id], ...update } }))
  const save = (id: string, changes: SettingsChanges) => {
    if (reject) { patch(id, { error: 'Demo host rejected this update; draft retained.' }); return }
    const values = { ...states[id].values }
    for (const [key, v] of Object.entries(changes.set)) {
      // Secrets are only represented by presence, even in this in-memory host fixture.
      values[key] = values[key].secret_present !== undefined
        ? { present: true, secret_present: true, editable: true, has_override: true, source: { kind: 'override', label: 'plugin secret override' }, apply_state: 'unknown' }
        : { ...values[key], present: true, value: v, editable: true, has_override: true, source: { kind: 'override', label: 'app override' }, apply_state: id === 'plugin.observe-ops' ? 'pending_restart' : 'active' }
    }
    for (const key of changes.unset) values[key] = { ...values[key], present: true, value: demoFallbacks[key], editable: true, has_override: false, source: { kind: 'default', label: 'declared default' }, apply_state: 'pending_restart' }
    patch(id, { values, apply: id === 'plugin.observe-ops' ? { restartRequired: true, applyTargets: ['observe-ops'] } : states[id].apply, draft: {}, error: undefined, validation: undefined, notice: 'Demo host accepted the change.' })
    setSaved(previous => previous + 1)
  }
  const apply = (id: string) => {
    setApplies(previous => previous + 1)
    if (failApply) { patch(id, { applyError: 'Demo host apply failed; pending state retained.' }); return }
    const values = Object.fromEntries(Object.entries(states[id].values).map(([key, v]) => [key, { ...v, apply_state: v.apply_state === 'pending_restart' ? 'active' : v.apply_state }]))
    patch(id, { values, apply: { restartRequired: false, applyTargets: [] }, applyError: undefined })
  }
  const displayStates = { ...states }
  if (unknownSource) displayStates['plugin.observe-ops'] = { ...states['plugin.observe-ops'], values: { ...states['plugin.observe-ops'].values, nanite_url: { ...states['plugin.observe-ops'].values.nanite_url, source: { kind: 'unrecognized', label: 'invalid fixture' } } } }
  if (conservative) displayStates['app.preferences'] = { ...states['app.preferences'], apply: { restartRequired: true, applyTargets: [] }, values: { ...states['app.preferences'].values, developer_mode: { ...states['app.preferences'].values.developer_mode, apply_state: 'pending_restart' } } }
  return <main className="mx-auto flex min-w-0 max-w-screen-lg flex-col gap-6 p-4 text-control text-fg">
    <h1 className="text-control font-semibold">kit-settings — controlled forms</h1>
    <p className="text-control text-fg-muted">Illustrative local host, no network or persistence. Backend validation, revisions and ETags are required in a real host.</p>
    <label className="flex items-center gap-2"><input type="checkbox" checked={reject} onChange={e => setReject(e.target.checked)} className="size-4 accent-primary" />Reject saves in the demo host</label>
    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={failApply} onChange={e => setFailApply(e.target.checked)} />Fail applies in demo host</label>
    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={unknownSource} onChange={e => setUnknownSource(e.target.checked)} />Use unknown source in demo</label>
    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={conservative} onChange={e => setConservative(e.target.checked)} />Show conservative restart without targets</label>
    <p role="status">Host save count: {saved}</p>
    <p role="status">Host apply count: {applies}</p>
    <section aria-label="Settings forms" className="flex min-w-0 flex-col gap-6">
    {[nanite, tachyon].map(manifest => <section key={manifest.app.id} aria-labelledby={manifest.app.id} className="flex min-w-0 flex-col gap-4">
      <h2 id={manifest.app.id} className="text-control font-semibold">{manifest.app.label} example</h2>
      <SettingsProvenanceRenderer contractVersion={manifest.contract_version} groups={manifest.settings} states={displayStates} onApply={apply}
        onDraftChange={(id, draft) => patch(id, { draft, validation: undefined, error: undefined, notice: undefined })}
        onSave={save} onReset={(id, keys) => save(id, { set: {}, unset: keys })} onValidate={id => patch(id, { validation: { valid: true, errors: [] }, notice: 'Demo host validation accepted. Real updates must revalidate.' })} />
    </section>)}
    </section>
    <WizardDemo />
  </main>
}
