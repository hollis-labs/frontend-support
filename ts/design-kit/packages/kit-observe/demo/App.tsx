import { useState } from 'react'
import { Button, Pill } from '@hollis-labs/design-components'
import { DiagnosticPanel, HealthSummary, ObservationStatus, StatCollection, type ObservationState, type ObservationUnit, type ObservationKind, type DiagnosticValue } from '../src'
import { SampleSeriesView } from '../src/charts'
import nanite from '../../../docs/examples/nanite-admin-manifest.json'
import tachyon from '../../../docs/examples/tachyon-admin-manifest.json'

const nowMs = Date.parse('2026-10-02T00:00:30Z')
const observedAt = '2026-10-02T00:00:00Z'
const points = [
  { at: '2026-10-01T23:00:00Z', value: 12 },
  { at: '2026-10-01T23:15:00Z', value: null },
  { at: '2026-10-01T23:30:00Z', value: 0 },
  { at: '2026-10-01T23:45:00Z', value: 9 },
]
const modes = ['observed', 'loading', 'refreshing', 'stale', 'refresh-error', 'first-error', 'unsupported', 'paused'] as const
type Mode = typeof modes[number]

export function App() {
  const [app, setApp] = useState<'nanite' | 'tachyon'>('nanite')
  const [mode, setMode] = useState<Mode>('observed')
  const [retryCount, setRetryCount] = useState(0)
  const manifest = app === 'nanite' ? nanite : tachyon
  const observation = (staleAfterMs: number): ObservationState => ({
    phase: mode === 'loading' || mode === 'refreshing' ? 'loading' : mode === 'refresh-error' || mode === 'first-error' ? 'error' : 'ready',
    observedAt: mode === 'loading' || mode === 'first-error' ? undefined : mode === 'stale' ? '2026-10-01T23:50:00Z' : observedAt,
    nowMs, staleAfterMs, supported: mode !== 'unsupported', paused: mode === 'paused',
    error: mode === 'refresh-error' || mode === 'first-error' ? 'Fixture request timed out.' : undefined,
    onRetry: () => { setRetryCount(count => count + 1); setMode('observed') },
  })
  const stable: ObservationState = { phase: 'ready', observedAt, nowMs, staleAfterMs: 45000 }
  const diagnostic = manifest.diagnostics[0]
  return <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 text-fg">
    <header className="flex flex-col gap-3">
      <h1 className="text-control font-semibold">kit-observe manifest demo</h1>
      <p className="text-control text-fg-secondary">Illustrative declarations with controlled fixture responses. No live endpoint, polling or history promise.</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-control">App <select aria-label="App" value={app} onChange={event => setApp(event.target.value as typeof app)} className="rounded border border-border bg-surface p-2 text-control text-fg">
          <option value="nanite">Nanite</option><option value="tachyon">Tachyon</option>
        </select></label>
        <label className="text-control">Observation <select aria-label="Observation" value={mode} onChange={event => setMode(event.target.value as Mode)} className="rounded border border-border bg-surface p-2 text-control text-fg">
          {modes.map(value => <option key={value} value={value}>{value}</option>)}
        </select></label>
        <Pill>Private 0.0.0</Pill><span role="status" className="text-caption text-fg-secondary">Retries: {retryCount}</span>
      </div>
    </header>
    <section className="flex flex-col gap-3" aria-label="Manifest status">
      <h2 className="text-control font-semibold">{manifest.app.label} status</h2>
      {manifest.health.map(resource => <HealthSummary key={resource.id} label={resource.label} status="degraded"
        checks={[{ id: 'runtime', label: 'Runtime', status: 'unknown', message: 'Fixture has no confirmed runtime evidence.' }, { id: 'dependency', label: 'Dependency', status: 'unhealthy', message: 'A returned unhealthy result is distinct from a failed request.' }]}
        observation={observation(resource.stale_after_ms)} />)}
      <StatCollection label="Manifest stats" rows={manifest.stats.map(resource => ({ id: resource.id, label: resource.label, value: 0,
        unit: resource.unit as ObservationUnit, kind: resource.kind as ObservationKind, observation: observation(resource.stale_after_ms) }))} />
    </section>
    <section aria-label="Manifest diagnostics" className="flex min-w-0 flex-col gap-3">
      <h2 className="text-control font-semibold">Diagnostics</h2>
      {manifest.series.length ? manifest.series.map(resource => <SampleSeriesView key={resource.id} label={resource.label} points={points}
        unit={resource.unit as ObservationUnit} kind={resource.kind as ObservationKind}
        requested={{ from: '2026-10-01T23:00:00Z', to: '2026-10-02T00:00:00Z', limit: 4 }}
        bounds={{ maxPoints: resource.max_points, maxWindowSeconds: resource.max_window_seconds }} truncated observation={observation(resource.stale_after_ms)} />)
        : <ObservationStatus label="Historical series" observation={{ ...stable, supported: false }} />}
      <DiagnosticPanel label={diagnostic.label} schema={diagnostic.schema as DiagnosticValue}
        data={app === 'nanite' ? { embedding_status: '<b>idle</b> — plain text' } : { plugins: [{ id: 'observe-ops', state: 'unknown' }] }}
        validation={{ state: 'valid' }} observation={observation(diagnostic.stale_after_ms)} />
    </section>
    <section aria-label="State distinctions" className="flex min-w-0 flex-col gap-3">
      <h2 className="text-control font-semibold">Independent resource states</h2>
      <HealthSummary label="Unknown health control" status="unknown" checks={[{ id: 'pending', label: 'Workload', status: 'unknown' }]} observation={stable} />
      <StatCollection label="Missing, zero and pending" rows={[
        { id: 'zero', label: 'Real zero', value: 0, unit: 'count', kind: 'counter', observation: stable },
        { id: 'missing', label: 'Missing sample', value: null, unit: 'ratio', kind: 'gauge', observation: stable },
        { id: 'pending', label: 'Pending stat', value: 0, unit: 'percent', kind: 'gauge', observation: { ...stable, observedAt: undefined, phase: 'loading' } },
      ]} />
      <SampleSeriesView label="Empty successful series" points={[]} unit="count" kind="counter" truncated={false}
        requested={{ from: '2026-10-01T23:00:00Z', to: '2026-10-02T00:00:00Z', limit: 4 }}
        bounds={{ maxPoints: 240, maxWindowSeconds: 86400 }} observation={stable} />
      <DiagnosticPanel label="Unsupported schema control" schema={{ $ref: 'https://invalid.example/schema' }} data={{ ignored: true }}
        validation={{ state: 'unsupported', messages: ['Host does not support remote schema references.'] }} observation={stable} />
      <DiagnosticPanel label="Invalid diagnostic control" schema={diagnostic.schema as DiagnosticValue} data={null}
        validation={{ state: 'invalid', messages: ['Required property is missing.'] }} observation={stable} />
      <Button variant="outline" onClick={() => setMode('observed')}>Reset fixture</Button>
    </section>
  </main>
}
