import { useState } from 'react'
import { AdminContent, AdminShell } from '@hollis-labs/kit-admin'
import type { AdminContentProps, AdminPage, AdminSelection, AdminTarget } from '@hollis-labs/kit-admin'
import { renderAdminSeries } from '@hollis-labs/kit-admin/charts'
import { fixtureObservations, fixtureSettings, nanite, nowMs, tachyon, tether } from './fixtures'

// This fixture host owns selection, drafts and clocks. Nothing talks to an app.
export function App() {
  const query = new URLSearchParams(location.search)
  const app = query.get('app') === 'tachyon' ? tachyon : query.get('app') === 'tether' ? tether : nanite
  const page = (['dashboard', 'settings', 'status', 'diagnostics'].includes(query.get('page') ?? '') ? query.get('page') : 'dashboard') as AdminPage
  const [selection, setSelection] = useState<AdminSelection>({ page, groupId: query.get('group') ?? app.settings[0]?.id, mode: query.get('mode') === 'setup' ? 'setup' : 'edit' })
  const [settings, setSettings] = useState(() => fixtureSettings(app))
  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState('No command requested. This fixture never persists or restarts.')
  const target = (next: AdminTarget) => setSelection({ ...next, groupId: next.page === 'settings' ? next.groupId ?? app.settings[0]?.id : undefined, mode: 'edit' })
  const failure = query.get('failure')
  const discovery: AdminContentProps['discovery'] = { contextKey: app.app.id, phase: failure === 'refresh' || failure === 'first' ? 'error' : 'ready', manifest: failure === 'first' ? undefined : app, error: failure ? 'Explicit fixture discovery failure.' : undefined }
  const reads = failure === 'group' && app.settings[0] ? { ...settings, [app.settings[0].id]: { ...settings[app.settings[0].id], phase: 'error' as const, error: 'Explicit fixture group failure.' } } : settings
  const props: AdminContentProps = {
    contextKey: app.app.id, discovery, selection, destination: next => ({ onSelect: () => target(next) }), settings: reads, nowMs,
    settingsActions: { onDraftChange: (id, draft) => setSettings(current => ({ ...current, [id]: { ...current[id], state: { ...current[id].state!, draft } } })),
      onSave: id => setIntent(`Save intent for ${id}; no saved outcome is claimed.`), onValidate: id => setIntent(`Validation intent for ${id}; no backend result is claimed.`), onReset: id => setIntent(`Reset intent for ${id}; no backend result is claimed.`) },
    observations: fixtureObservations(app), renderSeries: renderAdminSeries,
    setup: { step, onStepChange: setStep, onComplete: plan => setIntent(`Setup intent for ${plan.length} groups; no write or restart occurs.`) },
    setupContext: <p className="text-control text-fg-secondary">Fixture source/locks/pending state are available through the canonical group links above. Secrets remain transient replacements.</p>,
  }
  return <div className="flex h-dvh min-w-0 flex-col bg-bg text-fg">
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-bg-elevated p-3 text-label">
      <strong>Local admin fixtures</strong>
      <nav aria-label="Fixture apps" className="flex flex-wrap gap-3">{['nanite', 'tachyon', 'tether'].map(id => <a key={id} className="text-primary underline" href={`?app=${id}&page=${selection.page}`}>{id}</a>)}</nav>
      <button type="button" className="rounded-control border border-border px-3 py-1" onClick={() => setSelection({ page: 'settings', mode: 'setup' })}>Open setup fixture</button>
      <p role="status" className="basis-full text-fg-muted">{intent}</p>
    </header>
    <div className="relative min-h-0 min-w-0 flex-1">{query.get('embedded') === 'yes' ? <div className="h-full overflow-auto"><AdminContent {...props} /></div> : <AdminShell {...props} />}</div>
  </div>
}
