import type { ReactNode } from 'react'
import { Activity, LayoutDashboard, Settings, SquareTerminal } from 'lucide-react'
import { AppShell, Button, Callout } from '@hollis-labs/design-components'
import { NavRail, PageHeader } from '@hollis-labs/kit-dashboard/ui'
import { ListPageLayout } from '@hollis-labs/kit-dashboard/layout'
import { SettingsProvenanceRenderer, SettingsWizard, settingsMetadataProblem } from '@hollis-labs/kit-settings'
import { DiagnosticPanel, HealthSummary, ObservationStatus, StatCollection } from '@hollis-labs/kit-observe'
import type { ObservationState } from '@hollis-labs/kit-observe'
import { adminManifestProblem, adminPages } from './model'
import type { AdminContentProps, AdminDestination, AdminManifest, AdminPage, AdminSettingsRead } from './types'

const labels = { dashboard: 'Dashboard', settings: 'Settings', status: 'Status', diagnostics: 'Diagnostics' } as const
const icons = { dashboard: LayoutDashboard, settings: Settings, status: Activity, diagnostics: SquareTerminal }
function available(props: AdminContentProps): AdminManifest | undefined {
  const { discovery, contextKey } = props
  if (discovery.contextKey !== contextKey || adminManifestProblem(discovery.manifest)) return undefined
  return discovery.manifest
}
function Destination({ destination, children }: { destination: AdminDestination; children: ReactNode }) {
  return destination.href !== undefined
    ? <a className="break-words text-control text-primary underline underline-offset-2 focus-visible:outline-ring" href={destination.href}>{children}</a>
    : <Button type="button" size="sm" variant="outline" onClick={destination.onSelect}>{children}</Button>
}
function Notice({ children }: { children: ReactNode }) {
  return <p role="status" className="text-control text-fg-secondary">{children}</p>
}
function GroupLinks({ manifest, props }: { manifest: AdminManifest; props: AdminContentProps }) {
  return <nav aria-label="Settings groups" className="flex flex-wrap gap-3">{manifest.settings.map(group => <Destination key={group.id} destination={props.destination({ page: 'settings', groupId: group.id })}>{group.label}</Destination>)}</nav>
}

/** Navigation is only a projection of declared sections; the host owns routing/history. */
export function AdminNavigation(props: AdminContentProps) {
  const manifest = available(props)
  const pages: readonly AdminPage[] = manifest ? adminPages(manifest) : ['dashboard']
  return <NavRail logoLabel={manifest?.app.label ?? 'Admin'} items={pages.map(page => {
    const Icon = icons[page]
    return { key: page, label: labels[page], icon: <Icon className="size-4" aria-hidden />, active: props.selection.page === page, ...props.destination({ page }) }
  })} />
}

function SettingsPage({ props, manifest }: { props: AdminContentProps; manifest: AdminManifest }) {
  const { selection, settings = {}, settingsActions: actions, setup } = props
  const contextReady = props.discovery.phase === 'ready'
  const readReady = (read: AdminSettingsRead | undefined) => contextReady && read?.phase === 'ready' && !!read.state
  const selected = manifest.settings.find(group => group.id === selection.groupId)
  const states = Object.fromEntries(manifest.settings.map(group => [group.id, settings[group.id]?.state]))
  const change: NonNullable<AdminContentProps['settingsActions']>['onDraftChange'] = (id, draft) => { if (readReady(settings[id])) actions?.onDraftChange(id, draft) }
  const normal = selection.mode !== 'setup'
  let presentedGroup = selected, presentedStates = states
  const state = selected && states[selected.id]
  // Limit only this view; validate the host inputs before copying so malformed
  // permissions/provenance stay unavailable rather than being repaired here.
  if (normal && !actions && selected && state && !settingsMetadataProblem(selected, state)) {
    presentedGroup = { ...selected, capabilities: {
      ...(selected.capabilities as Record<string, unknown>), can_validate: false, can_update: false, can_reset: false,
    } }
    presentedStates = { ...states, [selected.id]: { ...state, draft: {}, values: Object.fromEntries(
      Object.entries(state.values).map(([key, value]) => [key, value.editable
        ? { ...value, editable: false, read_only_reason: 'This view has no editing actions.' } : value]),
    ) } }
  }
  if (!manifest.settings.length) return <Notice>Settings unsupported: no settings groups declared.</Notice>
  return <section aria-label="Admin Settings" className="flex min-w-0 flex-col gap-4">
    <GroupLinks manifest={manifest} props={props} />
    {normal && selected?.scope ? <Notice>Scope: {selected.scope.kind}{selected.scope.id ? ` / ${selected.scope.id}` : ''}</Notice> : null}
    {normal ? !selection.groupId ? <Notice>Choose a settings group.</Notice> : !selected ? <Callout tone="warning" title="Settings group unavailable">This declaration does not contain the selected group.</Callout> : <>
      {settings[selected.id]?.phase === 'error' ? <Callout tone="danger" title="Settings read failed">{settings[selected.id]?.error ?? 'The host could not read this group.'} {settings[selected.id]?.state ? 'Previous snapshot retained; writes suspended.' : 'No successful snapshot is available.'}</Callout> : null}
      {settings[selected.id]?.phase === 'loading' ? <Notice>{settings[selected.id]?.state ? 'Refreshing settings snapshot; writes suspended.' : 'Waiting for a settings snapshot.'}</Notice> : null}
      <fieldset disabled={!readReady(settings[selected.id]) || !actions} className="min-w-0 border-0 p-0">
        <SettingsProvenanceRenderer key={`${props.contextKey}:${manifest.app.id}:${manifest.revision}:${selected.id}`}
          contractVersion={manifest.contract_version} groups={[presentedGroup!]} states={presentedStates} onDraftChange={change} readOnlyContext={!actions}
          onSave={readReady(settings[selected.id]) && actions?.onSave ? actions.onSave : undefined}
          onReset={readReady(settings[selected.id]) && actions?.onReset ? actions.onReset : undefined}
          onValidate={readReady(settings[selected.id]) && actions?.onValidate ? actions.onValidate : undefined}
          onApply={readReady(settings[selected.id]) && actions?.onApply ? actions.onApply : undefined} />
      </fieldset>
    </> : !setup ? <Notice>Setup unavailable: the host has not supplied setup controls.</Notice> : <>
      <Notice>Setup edits the same Settings groups. Source, locks and pending application remain in canonical Settings.</Notice>
      {props.setupContext}
      {manifest.settings.some(group => !readReady(settings[group.id]) || (states[group.id] && settingsMetadataProblem(group, states[group.id]!))) ? <Callout tone="warning" title="Setup unavailable">Every setup group needs a current, supported settings snapshot and provenance. Normal Settings remains available per group.</Callout> : <fieldset disabled={!contextReady || !actions} className="min-w-0 border-0 p-0">
        <SettingsWizard key={`${props.contextKey}:${manifest.app.id}:${manifest.revision}:setup`} {...setup}
          contractVersion={manifest.contract_version} groups={manifest.settings} states={states} onDraftChange={change}
          busy={!contextReady || !actions || setup.busy}
          onComplete={plan => { if (contextReady && actions) setup.onComplete(plan) }}
          onCheck={setup.onCheck ? id => { if (contextReady && actions) setup.onCheck?.(id) } : undefined} />
      </fieldset>}
    </>}
  </section>
}

/** Inner region for an existing host shell; no viewport wrapper, effects or local data store. */
export function AdminContent(props: AdminContentProps) {
  const { discovery, selection, observations = {}, nowMs } = props
  if (discovery.contextKey !== props.contextKey) return <Callout tone="warning" title="Admin context unavailable">The host must supply discovery and snapshots for the current authorized context.</Callout>
  if (!discovery.manifest) return discovery.phase === 'loading' ? <Notice>Loading admin declarations.</Notice> : <Callout tone="danger" title="Admin unavailable">{discovery.error ?? 'No admin declaration is available.'}</Callout>
  const problem = adminManifestProblem(discovery.manifest)
  if (problem) return <Callout tone="danger" title="Admin declaration unavailable">{problem}</Callout>
  const manifest = discovery.manifest
  const observation = (staleAfterMs: number): ObservationState => ({ phase: 'idle', nowMs, staleAfterMs })
  const pages = adminPages(manifest)
  let content: ReactNode
  if (selection.page === 'dashboard') content = <section aria-label="Admin directory" className="flex min-w-0 flex-col gap-4">
    <h2 className="text-heading text-fg">{manifest.app.label}</h2>
    <Notice>Declaration revision: {manifest.revision}</Notice>
    {pages.length === 1 ? <Notice>No admin resources declared</Notice> : <nav aria-label="Admin directory links" className="flex flex-wrap gap-3">{pages.filter(page => page !== 'dashboard').map(page => <Destination key={page} destination={props.destination({ page })}>{labels[page]}</Destination>)}</nav>}
    {manifest.settings.length ? <GroupLinks manifest={manifest} props={props} /> : null}
  </section>
  else if (selection.page === 'settings') content = <SettingsPage props={props} manifest={manifest} />
  else if (selection.page === 'status') content = !manifest.health.length && !manifest.stats.length ? <Notice>Status unsupported: no health or stats resources declared.</Notice> : <section aria-label="Admin Status" className="flex min-w-0 flex-col gap-4">
    {manifest.health.map(resource => {
      const state = observations.health?.[resource.id]
      return state ? <HealthSummary key={resource.id} {...state} label={resource.label} /> : <ObservationStatus key={resource.id} label={resource.label} observation={observation(resource.stale_after_ms)} />
    })}
    {manifest.stats.length ? <StatCollection label="Stats" rows={manifest.stats.map(resource => {
      const state = observations.stats?.[resource.id]
      return { id: resource.id, label: resource.label, unit: resource.unit, kind: resource.kind, value: state?.value ?? null, observation: state?.observation ?? observation(resource.stale_after_ms) }
    })} /> : null}
  </section>
  else if (selection.page === 'diagnostics') content = !manifest.series.length && !manifest.diagnostics.length ? <Notice>Diagnostics unsupported: no series or diagnostic resources declared.</Notice> : <section aria-label="Admin Diagnostics" className="flex min-w-0 flex-col gap-4">
    {manifest.series.map(resource => {
      const state = observations.series?.[resource.id]
      return <section key={resource.id} className="min-w-0">{!props.renderSeries ? <Callout tone="warning" title="Series renderer unavailable">{resource.label}: the host has not supplied a series renderer.</Callout> : !state ? <ObservationStatus label={resource.label} observation={observation(resource.stale_after_ms)} /> : props.renderSeries({ ...state, label: resource.label, unit: resource.unit, kind: resource.kind, bounds: { maxPoints: resource.max_points, maxWindowSeconds: resource.max_window_seconds } })}</section>
    })}
    {manifest.diagnostics.map(resource => {
      const state = observations.diagnostics?.[resource.id]
      return state ? <DiagnosticPanel key={resource.id} {...state} label={resource.label} schema={resource.schema} /> : <ObservationStatus key={resource.id} label={resource.label} observation={observation(resource.stale_after_ms)} />
    })}
  </section>
  else content = <Callout tone="warning" title="Admin page unavailable">The host selected an unsupported page.</Callout>
  return <div key={`${props.contextKey}:${manifest.app.id}:${manifest.revision}`} className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-4 p-4 text-control text-fg">
    {discovery.phase !== 'ready' ? <Callout tone="warning" title="Previous declarations retained">{discovery.error ?? 'Refreshing admin declarations.'} Content uses the last declaration; writes are suspended until discovery succeeds.</Callout> : null}
    {content}
  </div>
}

/** Standalone viewport composition. Use AdminContent inside an existing AppShell instead. */
export function AdminShell(props: AdminContentProps) {
  const manifest = available(props)
  return <AppShell nav={<AdminNavigation {...props} />}>
    <ListPageLayout header={<PageHeader title={`${manifest?.app.label ?? 'Admin'} / ${labels[props.selection.page] ?? 'Unavailable'}`} />}>
      <AdminContent {...props} />
    </ListPageLayout>
  </AppShell>
}
