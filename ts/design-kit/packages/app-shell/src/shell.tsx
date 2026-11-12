import {
  createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
  type ComponentType, type ReactNode,
} from 'react'
import { AppShell as KitAppShell, EmptyState, type IconComponent } from '@hollis-labs/design-components'
import { createVersionedStore, useVersionedStore } from '@hollis-labs/design-app-runtime'
import { WidgetGrid } from './widget-ui'
import type { HostDiagnostic, LayoutStorage } from '@hollis-labs/plugin-host-ui'
import {
  PluginDockTabBody, PluginHostProvider, PluginPanelBody, PluginRenderBoundary, WidgetRenderer, usePluginDockTabs, usePluginPanels, usePluginSlots,
} from '@hollis-labs/plugin-host-ui/react'
import { bindingDiagnostics, createRendererSelector, type BindingStore, type RendererSelector } from './bindings'
import { parseFrontendManifest, type FrontendManifest, type ManifestItem, type ShellDiagnostic } from './manifest'
import { buildShellModel, effectiveRegion, type AdminManifestInput, type NavLink, type NavNode, type ShellModel, type SurfaceRoute } from './model'
import { useOverlayStack, restoreFocus, type OverlayStack } from './overlays'
import { createActionGateway, type ActionGateway, type ActionGatewayOptions, type CatalogHandlers } from './actions'
import { ActionConfirmDialog, ActionNotice } from './actions-ui'
import { DockResizeHandle, DockTabStrip, type DockTab } from './dock-ui'
import { dismissMatches, useDockState, type DockAttributes, type DockSize } from './docks'
import { createShellPluginHost, refusalDiagnostics, type ShellPluginHost } from './plugin-host'

/** What a host supplies for a panel, dock.tab or widget: the component its `view` names. */
export type ViewComponent = ComponentType<{ item: ManifestItem; apiBase: string }>
/** What a host supplies for a surface: the page body. Pages are contributions, not shell forks. */
export interface PageProps { surface: SurfaceRoute; apiBase: string; resolveRenderer: RendererSelector }
export type PageComponent = ComponentType<PageProps>

export interface ManifestShellProps {
  /** The generated frontend.manifest.json, already loaded. Validated here. */
  manifest: unknown
  /** The runtime admin manifest (GET /admin/manifest), once loaded. */
  admin?: AdminManifestInput
  apiBase: string
  /** Current frontend path and the host router's navigate; the shell owns no router. */
  path: string
  onNavigate: (path: string) => void
  /** Components for panel / dock.tab / widget, by the manifest's `view` name. */
  views?: Readonly<Record<string, ViewComponent>>
  /** Page bodies, by surface key. */
  pages?: Readonly<Record<string, PageComponent>>
  /** Icons by the manifest's kit icon name. */
  icons?: Readonly<Record<string, IconComponent>>
  /** The generated binding table's store (`createBindingStore` + `applyBindingTable`); a new table swaps in live. */
  bindings?: BindingStore
  /** Force the narrow (bottom sheet) presentation; otherwise a (max-width: 1023px) query decides. */
  isNarrow?: boolean
  /** SF-2 attributes (openState, exclusive, sizes, dismissKey, mobile) by docked region name. */
  dockAttributes?: Readonly<Record<string, DockAttributes>>
  /** Where a user's chosen dock size is remembered. Without it the choice lasts the session. */
  dockStorage?: LayoutStorage
  /** Where the widget grid's order, hidden widgets and card open state are remembered. Without it they last the session. */
  widgetStorage?: LayoutStorage
  /**
   * The action gateway (S0.3). Without it the shell has no action policy point and pages cannot call
   * `useActionGateway`. `catalog` overrides or supplies handlers; the shell provides navigate,
   * closeOverlay, openRegion, closeRegion, toast and focus itself, and openOverlay / setData come from the host.
   */
  actions?: ShellActions
  /** Everything plugin-host-ui reports while reconciling the registered contributions. */
  onHostDiagnostic?: (event: HostDiagnostic) => void
}

export type ShellActions = Omit<ActionGatewayOptions, 'confirmationHost' | 'onTerminal'> & {
  /** The host's re-review step for a stale outcome (the review-changes step). */
  onReview?: (review: { id: string; current: { revision: string } }) => void
}

interface Ctx { gateway: ActionGateway | null; overlays: OverlayStack; narrow: boolean; apiBase: string; views: Readonly<Record<string, ViewComponent>>; icons: Readonly<Record<string, IconComponent>> }
const ShellContext = createContext<Ctx | null>(null)
/** The action gateway, for pages that submit actions. Throws when the host passed no `actions`. */
export function useActionGateway(): ActionGateway {
  const g = useShell().gateway
  if (!g) throw new Error('No action gateway: pass `actions` to ManifestShell')
  return g
}
const useShell = (): Ctx => { const c = useContext(ShellContext); if (!c) throw new Error('Shell context missing'); return c }

const NARROW_QUERY = '(max-width: 1023px)'
function useNarrow(force?: boolean): boolean {
  const subscribe = (cb: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}
    const mq = window.matchMedia(NARROW_QUERY); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb)
  }
  const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(NARROW_QUERY).matches
  const media = useSyncExternalStore(subscribe, get, () => false)
  return force ?? media
}

/** One failing view never takes the shell down; plugin-host-ui's boundary owns the fallback notice. */
function ViewBoundary({ children, label }: { children: ReactNode; label: string }) {
  return <PluginRenderBoundary resetKey={label}>{children}</PluginRenderBoundary>
}

function Icon({ name }: { name?: string }) {
  const { icons } = useShell()
  const C = name ? icons[name] : undefined
  return C ? <C aria-hidden className="size-4" /> : null
}

function NavEntry({ link, path, onNavigate }: { link: NavLink; path: string; onNavigate: (p: string) => void }) {
  const label = link.item.label || link.item.key
  const current = link.path !== null && link.path === path
  if (link.path === null) return <span className="flex items-center gap-2 px-3 py-1.5 text-control text-fg-muted"><Icon name={link.item.icon} />{label}</span>
  return (
    <a
      href={link.path}
      aria-current={current ? 'page' : undefined}
      onClick={e => { e.preventDefault(); onNavigate(link.path!) }}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-control ${current ? 'bg-bg-elevated font-semibold text-fg' : 'text-fg-muted hover:bg-bg-elevated hover:text-fg'}`}
    >
      <Icon name={link.item.icon} />{label}
    </a>
  )
}

function NavTree({ nodes, footer, path, onNavigate, tail }: { nodes: NavNode[]; footer: NavLink[]; path: string; onNavigate: (p: string) => void; tail: ReactNode }) {
  return (
    <nav aria-label="Primary" className="flex h-full w-60 flex-col gap-1 border-r border-border-subtle bg-bg p-2">
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto" data-region="nav.primary">
        {nodes.map(n => n.type === 'item'
          ? <NavEntry key={n.link.item.key} link={n.link} path={path} onNavigate={onNavigate} />
          : (
            <details key={n.item.key} open={n.item.default_open || n.item.collapsible === false || undefined} data-region={`nav.group:${n.item.key}`}>
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-caption font-semibold text-fg-muted"><Icon name={n.item.icon} />{n.item.label || n.item.key}</summary>
              <div className="flex flex-col gap-1 pl-2">{n.children.map(c => <NavEntry key={c.item.key} link={c} path={path} onNavigate={onNavigate} />)}</div>
            </details>
          ))}
      </div>
      <div className="flex flex-col gap-1 border-t border-border-subtle pt-2" data-region="nav.footer">
        {footer.map(l => <NavEntry key={l.item.key} link={l} path={path} onNavigate={onNavigate} />)}
        {tail}
      </div>
    </nav>
  )
}

const DOCK_WIDTH: Record<DockSize, string> = { sm: 'w-80', md: 'w-96', lg: 'w-screen max-w-xl' }

/** A docked region's open tab: a side panel on desktop, a bottom sheet on narrow screens. */
function DockSheet({ id, title, children, onClose, size, sizes, onSize, presentation, bottom }: {
  id: string; title: string; children: ReactNode; onClose: () => void
  size?: DockSize; sizes?: readonly DockSize[]; onSize?: (s: DockSize) => void; presentation?: 'bottom-sheet' | 'side'
  /** A bottom-anchored dock on a wide screen: resizable by its top edge, with its region's tab strip. */
  bottom?: { height: number; min: number; max: number; onResize: (px: number) => void; tabs: readonly DockTab[]; onSelect: (tab: string) => void }
}) {
  const { narrow } = useShell()
  const sheet = presentation ? presentation === 'bottom-sheet' : narrow
  const resizable = !sheet && bottom
  return (
    <section
      role="dialog" aria-label={title} data-dock={id} data-presentation={sheet ? 'bottom-sheet' : resizable ? 'bottom' : 'side'} data-size={sheet || resizable ? undefined : size}
      style={resizable ? { height: bottom.height } : undefined}
      className={`fixed z-40 flex flex-col border-border-subtle bg-bg-elevated text-fg ${sheet ? 'inset-x-0 bottom-0 max-h-[70%] rounded-t-lg border-t' : resizable ? 'inset-x-0 bottom-0' : `inset-y-0 right-0 border-l ${DOCK_WIDTH[size ?? 'md']}`}`}
    >
      {resizable ? <DockResizeHandle height={bottom.height} min={bottom.min} max={bottom.max} onResize={bottom.onResize} onCollapse={onClose} onToggle={onClose} /> : null}
      <header className="flex items-center justify-between gap-2 border-b border-border-subtle p-3">
        <h2 className="text-control font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          {!sheet && sizes && sizes.length > 1 && onSize ? sizes.map(s => (
            <button key={s} type="button" aria-pressed={s === size} aria-label={`Size ${s}`} onClick={() => onSize(s)}
              className={`rounded-md px-2 py-1 text-caption ${s === size ? 'bg-bg font-semibold text-fg' : 'text-fg-muted hover:text-fg'}`}>{s}</button>
          )) : null}
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-caption text-fg-muted hover:text-fg">Close</button>
        </div>
      </header>
      {resizable && bottom.tabs.length > 1 ? <DockTabStrip tabs={bottom.tabs} onSelect={bottom.onSelect} /> : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </section>
  )
}

export function DiagnosticsList({ diagnostics }: { diagnostics: readonly ShellDiagnostic[] }) {
  if (!diagnostics.length) return <p className="text-caption text-fg-muted">No diagnostics.</p>
  return (
    <ul className="flex flex-col gap-2" data-testid="diagnostics">
      {diagnostics.map((d, i) => (
        <li key={i} className="text-caption text-fg"><code className="text-fg-muted">{d.code}</code> {d.message}</li>
      ))}
    </ul>
  )
}

function PageFrame({ surface, children }: { surface: SurfaceRoute; children: ReactNode }) {
  return (
    <main data-region="surface.page" data-layout={surface.layout} className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold text-fg">{surface.title}</h1>
      {children}
    </main>
  )
}

function SettingsSections({ model }: { model: ShellModel }) {
  return (
    <div data-region="settings.sections" className="flex flex-col gap-4">
      {model.settingsSections.map(s => (
        <section key={s.item.key} aria-label={s.item.label || s.item.key} data-section={s.item.section_id} className="flex flex-col gap-2 rounded-lg border border-border-subtle p-3">
          <h2 className="text-control font-semibold text-fg">{s.item.label}</h2>
          {s.pending ? <p className="text-caption text-fg-muted">Settings are loading.</p> : (
            <ul className="flex flex-col gap-1">
              {s.groups.map(g => <li key={g.id} className="text-control text-fg">{g.label}{g.description ? <span className="text-caption text-fg-muted"> {g.description}</span> : null}</li>)}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

function Widgets({ app, storage, onDiagnostic }: { app: string; storage?: LayoutStorage; onDiagnostic?: (event: HostDiagnostic) => void }) {
  const slots = usePluginSlots('widgets.grid').filter(v => v.widget)
  const widgets = slots.map(w => ({ id: w.id, label: w.label, node: <WidgetRenderer widget={w} /> }))
  return <WidgetGrid app={app} widgets={widgets} storage={storage} onDiagnostic={onDiagnostic} />
}

function Panels() {
  const panels = usePluginPanels()
  return (
    <div data-region="aside.panels" className="flex flex-col gap-3 p-3">
      {panels.map(p => <section key={p.id} aria-label={p.label}><PluginPanelBody panel={p} /></section>)}
    </div>
  )
}

/** The open tab of a docked region, read back from the host. */
function DockTab({ region, tab }: { region: string; tab: string }) {
  const view = usePluginDockTabs(region).find(v => v.ref.key === tab)
  return view ? <PluginDockTabBody tab={view} /> : <div role="status" className="p-3 text-caption text-fg-muted">View unavailable.</div>
}

const NO_BINDINGS: BindingStore = createVersionedStore(undefined)
const NO_VIEWS: Readonly<Record<string, ViewComponent>> = {}
const NO_PAGES: Readonly<Record<string, PageComponent>> = {}
const NO_ICONS: Readonly<Record<string, IconComponent>> = {}

export function ManifestShell(props: ManifestShellProps) {
  const parsed = useMemo(() => parseFrontendManifest(props.manifest), [props.manifest])
  if (!parsed.ok) {
    return (
      <div role="alert" className="flex flex-col gap-2 p-6 text-fg">
        <h1 className="text-lg font-semibold">The app cannot start</h1>
        <DiagnosticsList diagnostics={parsed.diagnostics} />
      </div>
    )
  }
  return <LoadedShell {...props} manifest={parsed.manifest} />
}

type LoadedProps = Omit<ManifestShellProps, 'manifest'> & { manifest: FrontendManifest }

function LoadedShell(props: LoadedProps) {
  const { manifest, admin, apiBase, views = NO_VIEWS, dockAttributes, onHostDiagnostic } = props
  const viewNames = useMemo(() => new Set(Object.keys(views)), [views])
  const model = useMemo(() => buildShellModel(manifest, { admin, viewNames, dockAttributes }), [manifest, admin, viewNames, dockAttributes])
  // The runtime is not disposed on unmount: it holds no resources of its own (retain/release
  // in PluginHostProvider owns the subscriptions), and a StrictMode remount would find it dead.
  const host = useMemo(() => createShellPluginHost(manifest.app, model, { views, apiBase, onDiagnostic: onHostDiagnostic }), [manifest.app, model, views, apiBase, onHostDiagnostic])
  return (
    <PluginHostProvider runtime={host.runtime}>
      <ShellFrame {...props} views={views} model={model} host={host} />
    </PluginHostProvider>
  )
}

function ShellFrame({ model, host, apiBase, path, onNavigate, views = NO_VIEWS, pages = NO_PAGES, icons = NO_ICONS, bindings = NO_BINDINGS, isNarrow, dockStorage, widgetStorage, manifest, actions, onHostDiagnostic }: LoadedProps & { model: ShellModel; host: ShellPluginHost }) {
  const [overflow, setOverflow] = useState<ShellDiagnostic[]>([])
  const overlays = useOverlayStack(id => setOverflow(d => [...d, { code: 'overlay-depth', message: `Overlay "${id}" was not opened: the stack is at its depth limit.` }]))
  const narrow = useNarrow(isNarrow)
  const loadedBindings = useVersionedStore(bindings)
  const resolveRenderer = useMemo(() => createRendererSelector(loadedBindings), [loadedBindings])
  const snapshot = useSyncExternalStore(host.runtime.subscribe, host.runtime.getSnapshot, host.runtime.getServerSnapshot)
  const diagnostics = useMemo(() => [...model.diagnostics, ...bindingDiagnostics(loadedBindings), ...refusalDiagnostics(snapshot.refusals), ...overflow], [model.diagnostics, loadedBindings, snapshot.refusals, overflow])
  const dockRegions = useMemo(() => model.docks.map(d => ({ region: d.region.name, attributes: d.attributes, tabs: d.tabs.map(t => t.key) })), [model.docks])
  const docks = useDockState(manifest.app, dockRegions, dockStorage)

  // The gateway outlives renders; it reaches the shell's current capabilities through this ref.
  const self = useRef<ActionGateway | null>(null)
  const toastSeq = useRef(0)
  const [toasts, setToasts] = useState<readonly { id: number; text: string; tone?: string }[]>([])
  const live = useRef({ overlays, docks, model, onNavigate })
  useEffect(() => { live.current = { overlays, docks, model, onNavigate } })
  const gateway = useMemo(() => {
    if (!actions) return null
    const { onReview: _onReview, catalog, ...rest } = actions
    void _onReview
    const shellCatalog: CatalogHandlers = {
      navigate: args => {
        const route = args.route
        const hit = typeof route === 'string' ? live.current.model.surfaces.find(s => s.item.key === route) : undefined
        if (!hit) throw new Error('unregistered route')
        live.current.onNavigate(hit.path)
      },
      closeOverlay: () => {
        const top = [...live.current.overlays.entries].reverse().find(o => o.kind !== 'toast')
        if (top?.id.startsWith('confirm:')) self.current?.cancel(top.id.slice('confirm:'.length), 'dismissed')
        else live.current.overlays.closeTop()
      },
      openRegion: args => {
        const { model: m, docks: d } = live.current
        const dock = m.docks.find(x => x.region.name === args.region)
        const tab = dock?.tabs.find(t => t.key === (args.tab ?? dock.tabs[0]?.key))
        if (!dock || !tab) throw new Error('unresolved region')
        if (!d.isOpen(tab.key)) d.toggle(dock.region.name, tab.key, null)
      },
      closeRegion: args => {
        const { model: m, docks: d } = live.current
        const dock = m.docks.find(x => x.region.name === args.region)
        if (!dock) throw new Error('unresolved region')
        dock.tabs.forEach(t => d.close(t.key))
      },
      toast: args => {
        if (typeof args.message !== 'string') throw new Error('invalid message')
        const text = args.message
        setToasts(t => [...t, { id: ++toastSeq.current, text, tone: typeof args.tone === 'string' ? args.tone : undefined }])
      },
      focus: args => {
        const el = typeof args.target === 'string' ? document.querySelector<HTMLElement>(`[data-focus-target="${CSS.escape(args.target)}"]`) : null
        if (!el) throw new Error('unresolved target')
        el.focus()
      },
    }
    const created = createActionGateway({
      ...rest,
      catalog: { ...shellCatalog, ...catalog },
      confirmationHost: {
        open: id => live.current.overlays.open({ id: `confirm:${id}`, kind: 'modal', title: 'Confirm action' }),
        close: id => live.current.overlays.close(`confirm:${id}`),
      },
      onTerminal: ({ trigger }) => restoreFocus(trigger instanceof HTMLElement ? trigger : null),
    })
    self.current = created
    return created
  }, [actions])
  const ctx = useMemo<Ctx>(() => ({ gateway, overlays, narrow, apiBase, views, icons }), [gateway, overlays, narrow, apiBase, views, icons])

  // Esc (or a region's own dismissKey) closes whichever overlay or docked region opened last.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const overlay = e.key === 'Escape' ? [...overlays.entries].reverse().find(o => o.kind !== 'toast') : undefined
      const dock = docks.open.filter(o => dismissMatches(model.docks.find(d => d.region.name === o.region)?.attributes.dismissKey ?? 'Esc', e.key)).at(-1)
      if (!overlay && !dock) return
      e.preventDefault()
      if (dock && (!overlay || dock.seq > overlay.seq)) docks.close(dock.tab)
      else if (overlay?.id.startsWith('confirm:')) gateway?.cancel(overlay.id.slice('confirm:'.length), 'dismissed')
      else if (overlay) overlays.close(overlay.id)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [overlays, docks, model.docks, gateway])

  const surface = model.surfaces.find(s => s.path === (path.length > 1 ? path.replace(/\/$/, '') : path))
  const Page = surface ? pages[surface.item.key] : undefined
  const regionTabs = (region: string) => model.docks.find(d => d.region.name === region)?.tabs ?? []
  const tabItem = (tabKey: string) => model.docks.flatMap(d => d.tabs).find(t => t.key === tabKey)

  const diagButton = (
    <button type="button" onClick={e => overlays.open({ id: 'shell:diagnostics', kind: 'drawer', title: 'Diagnostics', trigger: e.currentTarget })} className="rounded-md px-3 py-1.5 text-left text-caption text-fg-muted hover:text-fg">
      Diagnostics{diagnostics.length ? ` (${diagnostics.length})` : ''}
    </button>
  )
  const diag = overlays.entries.find(e => e.id === 'shell:diagnostics')

  return (
    <ShellContext.Provider value={ctx}>
      <KitAppShell
        isNarrow={narrow}
        nav={<NavTree nodes={model.navPrimary} footer={model.navFooter} path={path} onNavigate={onNavigate} tail={diagButton} />}
        header={model.slots.length ? (
          <div data-region="slots" className="flex items-center gap-2 border-b border-border-subtle p-2">
            {model.slots.map(s => {
              const target = s.opens ? tabItem(s.opens) : undefined
              return (
                <button
                  key={s.key} type="button" aria-label={s.label || s.key} aria-expanded={s.opens ? docks.isOpen(s.opens) : undefined}
                  onClick={e => { if (s.opens && target) docks.toggle(effectiveRegion(target), s.opens, e.currentTarget) }}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-control text-fg-muted hover:text-fg"
                ><Icon name={s.icon} />{s.label || s.key}</button>
              )
            })}
          </div>
        ) : undefined}
        aside={model.panels.length ? <Panels /> : undefined}
        asideLabel="Panels"
      >
        {surface ? (
          <PageFrame surface={surface}>
            {surface.layout === 'dashboard' ? <Widgets app={manifest.app} storage={widgetStorage} onDiagnostic={onHostDiagnostic} /> : null}
            {surface.layout === 'settings' ? <SettingsSections model={model} /> : null}
            {Page ? <ViewBoundary label={surface.title}><Page surface={surface} apiBase={apiBase} resolveRenderer={resolveRenderer} /></ViewBoundary> : null}
          </PageFrame>
        ) : <EmptyState variant="error" title="Page not found" description={path} />}
      </KitAppShell>
      {docks.open.map(o => {
        const item = tabItem(o.tab)
        const attrs = model.docks.find(d => d.region.name === o.region)!.attributes
        return (
          <DockSheet
            key={`dock:${o.tab}`} id={`dock:${o.tab}`} title={item?.label || o.tab} onClose={() => docks.close(o.tab)}
            size={docks.size(o.region)} sizes={attrs.sizes.options} onSize={s => docks.setSize(o.region, s)}
            presentation={narrow && attrs.mobile === 'bottom-sheet' ? 'bottom-sheet' : 'side'}
            bottom={attrs.anchor === 'bottom' ? {
              height: docks.height(o.region), min: attrs.heightPx.min, max: attrs.heightPx.max, onResize: px => docks.setHeight(o.region, px),
              tabs: regionTabs(o.region).map(t => ({ id: t.key, label: t.label || t.key, active: t.key === o.tab })),
              onSelect: key => { if (key !== o.tab) { docks.toggle(o.region, key, o.trigger) } },
            } : undefined}
          ><DockTab region={o.region} tab={o.tab} /></DockSheet>
        )
      })}
      {toasts.length ? (
        <div role="status" data-region="toasts" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <p key={t.id} data-tone={t.tone} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-3 text-control text-fg">
              {t.text}<button type="button" aria-label="Dismiss toast" onClick={() => setToasts(all => all.filter(x => x.id !== t.id))} className="text-caption text-fg-muted">×</button>
            </p>
          ))}
        </div>
      ) : null}
      {gateway ? <><ActionConfirmDialog gateway={gateway} /><ActionNotice gateway={gateway} onReview={actions?.onReview} /></> : null}
      {diag ? <DockSheet id={diag.id} title={diag.title} onClose={() => overlays.close(diag.id)}><DiagnosticsList diagnostics={diagnostics} /></DockSheet> : null}
    </ShellContext.Provider>
  )
}
