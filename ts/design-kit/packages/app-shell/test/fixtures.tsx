import type { FrontendManifest, ManifestItem } from '../src'
import type { PageComponent, ViewComponent } from '../src'

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

// Page fixtures: list + detail. The SF-6 goldens were not readable from this repository
// (CW-20261102-0054 comment), so these stand in with the same page types.
const ListPage: PageComponent = () => (
  <table><caption>Items</caption><tbody><tr><td>alpha</td></tr><tr><td>beta</td></tr></tbody></table>
)
const DetailPage: PageComponent = () => <dl><dt>Name</dt><dd>alpha</dd></dl>
export const pages = { items: ListPage, item: DetailPage }
