import { useEffect, useState } from 'react'
import { Button, Input } from '@hollis-labs/design-components'
import {
  BulkActionBar, ListRow, OutlineNav, ReviewBar, ReviewChanges, SelectModeToggle, SplitPane, outlineAnchorId, useActionGateway, useSelection,
  type FieldChange, type FrontendManifest, type ManifestItem, type PageComponent, type ShellActions, type ViewComponent,
} from '../src'

const it = (i: Partial<ManifestItem> & Pick<ManifestItem, 'kind' | 'key'>): ManifestItem => ({ module: 'console', ...i })

/** One contribution of each of the 8 kinds, in the shape `substrate frontend` writes. */
export const manifest: FrontendManifest = {
  manifest_version: 0,
  app: 'hadron',
  regions: [
    { name: 'shell.header', docked: false },
    { name: 'shell.right', docked: true, anchor: 'shell.header' },
  ],
  items: [
    it({ kind: 'nav.group', key: 'ops', label: 'Operations', default_open: true }),
    it({ kind: 'nav.item', key: 'items', label: 'Items', route: '/items', region: 'nav.group:ops' }),
    it({ kind: 'nav.item', key: 'home', label: 'Home', route: '/' }),
    it({ kind: 'nav.item', key: 'help', label: 'Help', route: '/help', region: 'nav.footer' }),
    it({ kind: 'surface', key: 'home', route: '/', layout: 'dashboard', title: 'Dashboard' }),
    it({ kind: 'surface', key: 'items', route: '/items', layout: 'list', title: 'Items' }),
    it({ kind: 'surface', key: 'item', route: '/items/detail', layout: 'detail', title: 'Item detail' }),
    it({ kind: 'surface', key: 'settings', route: '/settings', layout: 'settings', title: 'Settings' }),
    it({ kind: 'settings.region', key: 'general', label: 'General', section_id: 'general', groups: [{ id: 'app.general', scope_kind: 'app' }] }),
    it({ kind: 'panel', key: 'activity', label: 'Activity', view: 'activity' }),
    it({ kind: 'widget', key: 'health', label: 'Health', view: 'health' }),
    it({ kind: 'dock.tab', key: 'inspector', label: 'Inspector', view: 'inspector', region: 'shell.right' }),
    it({ kind: 'slot', key: 'inspector-toggle', label: 'Inspector', region: 'shell.header', opens: 'inspector' }),
  ],
}

export const admin = { settings: [{ id: 'app.general', label: 'General settings', scope: { kind: 'app' } }] }

const view = (text: string): ViewComponent => function View() { return <p>{text}</p> }
export const views = { activity: view('activity body'), health: view('health body'), inspector: view('inspector body') }

// Page fixtures: list + detail following the SF-6 goldens (golden-list-detail.html, d-list / d-edit / d-review / d-select).
export interface Plugin { id: string; owner: string; version: string; note: string; status: 'Running' | 'Degraded' | 'Failed' | 'Stopped' }
export const plugins: readonly Plugin[] = [
  { id: 'billing', owner: 'core', version: '1.4.2', note: 'billing and invoices', status: 'Running' },
  { id: 'notes', owner: 'hollis', version: '0.9.0', note: 'per-thread notes', status: 'Running' },
  { id: 'terminal', owner: 'core', version: '2.0.1', note: 'slow to respond 2m ago', status: 'Degraded' },
  { id: 'exporter', owner: 'acme', version: '0.3.7', note: 'exited with code 2', status: 'Failed' },
  { id: 'search', owner: 'hollis', version: '1.1.0', note: 'stopped by you yesterday', status: 'Stopped' },
  { id: 'mailer', owner: 'acme', version: '3.2.0', note: 'sent 41 today', status: 'Running' },
]
export const OUTLINE = [{ id: 'identity', label: 'Identity' }, { id: 'runtime', label: 'Runtime' }, { id: 'settings', label: 'Settings' }, { id: 'used-by', label: 'Used by' }, { id: 'history', label: 'History' }]
export const subject = { kind: 'item', id: 'notes' }
export const ORIGINAL = 'Per-thread notes and scratchpad.'
export const EDITED = 'Per-thread notes and scratchpad, shared with agents on request.'

/** The test's handle on the page state the host owns: the revision the backend is at, and the re-review step. */
export const host = { revision: '7', rebase: null as ((revision: string) => void) | null }

/** Shell actions for the page fixtures; `onReview` is the host's re-review step for a stale save. */
export const pluginActions = (over: Partial<ShellActions> = {}): ShellActions => ({
  backend: { execute: async () => ({ status: 'ok' }) },
  agentFunctions: ['items.save', 'items.remove', 'items.stop', 'items.restart'],
  audit: () => {},
  issueGrant: async () => 'grant-xyz',
  currentBasis: () => ({ revision: host.revision }),
  onReview: r => host.rebase?.(r.current.revision),
  ...over,
})

const PluginDetail = ({ plugin }: { plugin: Plugin }) => {
  const gateway = useActionGateway()
  const [description, setDescription] = useState(ORIGINAL)
  const [basis, setBasis] = useState(host.revision)
  const [attempt, setAttempt] = useState(1)
  const [reviewing, setReviewing] = useState(false)
  useEffect(() => {
    host.rebase = revision => { setBasis(revision); setAttempt(n => n + 1); setReviewing(true) }
    return () => { host.rebase = null }
  }, [])
  const changes: FieldChange[] = description === ORIGINAL ? [] : [{ field: 'Description', before: ORIGINAL, after: description }]
  const save = (e: { currentTarget: HTMLElement }) => gateway.handleCall({
    surfaceId: 'item', functionCallId: `sv${attempt}`,
    callFunction: { '@call': 'items.save', hollis_action: { id: `save-detail-${attempt}`, subject, risk: 'medium', basis: { revision: basis } }, input: { description } },
  }, { trigger: e.currentTarget })
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3">
        <h2 className="text-control font-semibold">{plugin.id}</h2><span className="text-caption">{plugin.status}</span>
        <span className="flex-1" /><Button type="button" variant="outline" size="sm">Stop</Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <OutlineNav items={OUTLINE} scope="detail" />
        <div className="flex-1 overflow-auto">
          {reviewing && changes.length > 0 ? (
            <ReviewChanges changes={changes} effect="Applies to new sessions. Running sessions keep the current description." onBack={() => setReviewing(false)} onSave={save} />
          ) : (
            <section id={outlineAnchorId('detail', 'identity')} aria-label="Identity" className="flex flex-col gap-2.5 p-4">
              <label htmlFor="plugin-name" className="text-caption">Name</label>
              <Input id="plugin-name" value={plugin.id} readOnly />
              <label htmlFor="plugin-description" className="text-caption">Description</label>
              <Input id="plugin-description" value={description} onChange={e => setDescription(e.target.value)} />
              <p className="text-control">owner {plugin.owner} · version {plugin.version}</p>
            </section>
          )}
        </div>
      </div>
      {reviewing ? null : <ReviewBar changes={changes.length} onDiscard={() => setDescription(ORIGINAL)} onReview={() => setReviewing(true)} />}
    </div>
  )
}

const statusOf = (p: Plugin) => <span className="text-caption">{p.status}</span>

const ListPage: PageComponent = () => {
  const gateway = useActionGateway()
  const selection = useSelection()
  const [open, setOpen] = useState<string>('notes')
  const [detailOpen, setDetailOpen] = useState(false)
  const bulk = (fn: string, risk: 'medium' | 'high', id: string) => (e: { currentTarget: HTMLElement }) => gateway.handleCall({
    surfaceId: 'items', functionCallId: `${id}-fc`,
    callFunction: { '@call': fn, hollis_action: { id, subject: { kind: 'item', id: 'selection' }, risk }, input: { ids: [...selection.selected] } },
  }, { trigger: e.currentTarget })
  const list = (
    <>
      <header className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3">
        <h1 className="text-control font-semibold">Plugins</h1><span className="text-caption">{plugins.length} installed</span>
        <span className="flex-1" /><SelectModeToggle selection={selection} /><Button type="button" size="sm">Add plugin</Button>
      </header>
      {plugins.map(p => (
        <ListRow key={p.id} id={p.id} title={p.id} subtitle={`${p.owner} · ${p.version} · ${p.note}`} trailing={statusOf(p)} current={p.id === open}
          selection={selection} onOpen={id => { setOpen(id); setDetailOpen(true) }} selectLabel={`Select ${p.id}`} />
      ))}
      <BulkActionBar count={selection.count}
        actions={[{ id: 'stop', label: 'Stop', onAction: bulk('items.stop', 'medium', 'stop-bulk-1') }, { id: 'restart', label: 'Restart', onAction: bulk('items.restart', 'medium', 'restart-bulk-1') }]}
        danger={{ id: 'remove', label: 'Remove', onAction: bulk('items.remove', 'high', 'remove-bulk-1') }} />
    </>
  )
  return <SplitPane list={list} detail={<PluginDetail plugin={plugins.find(p => p.id === open)!} />} detailOpen={detailOpen} onBack={() => setDetailOpen(false)} />
}
const DetailPage: PageComponent = () => <PluginDetail plugin={plugins[1]!} />
export const pages = { items: ListPage, item: DetailPage }
