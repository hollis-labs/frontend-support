/**
 * `WidgetCard` and the widgets.grid edit mode (SF-3 PR3), lifted (copy-from only) from Nanite's `Widget` and
 * the right rail's drag-reorder. Tokens and kit steps only; glyphs are text. Order and visibility persist through
 * plugin-host-ui's layout store over the injected `LayoutStorage`; a card's open state is one small key in the same storage.
 */
import { useCallback, useMemo, useState, useSyncExternalStore, type DragEvent, type ReactNode } from 'react'
import { createPluginLayoutStore, type HostDiagnostic, type LayoutStorage, type PluginLayoutStore } from '@hollis-labs/plugin-host-ui'
import { buildWidgetOrder, filterVisibleWidgets, moveWidget, reorderWidget } from './widget-order'

const OPEN = 'open', MINIMIZED = 'minimized'
const cardKey = (app: string, id: string) => `app-shell:widget-card:${app}:${id}`

/** A collapsible widget card. `storage` makes the open state survive a reload; without it the state lasts the mount. */
export interface WidgetCardProps {
  /** Stable widget id; with `app` it names the stored open state. */
  id: string
  app?: string
  title: string
  /** A text glyph or small element shown before the title. */
  icon?: ReactNode
  /** Small metadata right of the title. */
  meta?: ReactNode
  /** Used until the user chooses. Default true. */
  defaultOpen?: boolean
  storage?: LayoutStorage
  /** Read-only tone: `diagnostic` marks a card the grid could not resolve. */
  tone?: 'default' | 'diagnostic'
  children?: ReactNode
}

export function WidgetCard({ id, app = '', title, icon, meta, defaultOpen = true, storage, tone = 'default', children }: WidgetCardProps) {
  const [open, setOpen] = useState(() => {
    try {
      const stored = storage?.read(cardKey(app, id))
      if (stored === OPEN) return true
      if (stored === MINIMIZED) return false
    } catch { /* an unreadable store falls back to the default */ }
    return defaultOpen
  })
  const toggle = () => {
    const next = !open
    setOpen(next)
    try { storage?.write(cardKey(app, id), next ? OPEN : MINIMIZED) } catch { /* a full or blocked store only loses the memory */ }
  }
  const bodyId = `widget-card-${app}-${id}`.replace(/\s+/g, '-')
  return (
    <section data-widget-card={id} data-tone={tone} aria-label={title} className={`overflow-hidden rounded-lg border bg-bg-elevated ${tone === 'diagnostic' ? 'border-danger' : 'border-border-subtle'}`}>
      <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={toggle} className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface ${open ? 'border-b border-border-subtle' : ''}`}>
        {icon != null ? <span aria-hidden className="shrink-0 text-caption text-fg-muted">{icon}</span> : null}
        <h3 className="flex-1 font-mono text-caption font-semibold uppercase text-fg-muted">{title}</h3>
        {meta != null ? <span className="font-mono text-caption text-fg-faint">{meta}</span> : null}
        <span aria-hidden className="shrink-0 text-caption text-fg-faint">{open ? '▾' : '▸'}</span>
      </button>
      {open ? <div id={bodyId} className="px-3 py-3">{children}</div> : null}
    </section>
  )
}

/** One widget the grid can place. `node` is what renders in the card body. */
export interface GridWidget {
  id: string
  label: string
  node: ReactNode
  icon?: ReactNode
  meta?: ReactNode
  defaultOpen?: boolean
}

export interface WidgetGridProps {
  app: string
  widgets: readonly GridWidget[]
  /** Where order, visibility and card open state are remembered. Without it they last the session. */
  storage?: LayoutStorage
  /** Layout scope for the store key; defaults to a single-client browser scope. */
  scope?: { environmentId?: string; clientId?: string; projectId?: string }
  region?: string
  onDiagnostic?: (event: HostDiagnostic) => void
}

const memoryStorage = (): LayoutStorage => {
  const m = new Map<string, string>()
  return { read: k => m.get(k) ?? null, write: (k, v) => { m.set(k, v) }, remove: k => { m.delete(k) } }
}

/** The widgets.grid region with an edit mode: drag to reorder (or use the move buttons), hide and show. */
export function WidgetGrid({ app, widgets, storage, scope, region = 'widgets.grid', onDiagnostic }: WidgetGridProps) {
  const [fallback] = useState(memoryStorage)
  const backing = storage ?? fallback
  const store: PluginLayoutStore = useMemo(
    () => createPluginLayoutStore(backing, { appId: app, environmentId: scope?.environmentId ?? 'shell', projectId: scope?.projectId, clientId: scope?.clientId ?? 'browser' }, region, 1, onDiagnostic),
    [backing, app, scope?.environmentId, scope?.projectId, scope?.clientId, region],
  )
  const layout = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState<string>()

  const byId = useMemo(() => new Map(widgets.map(w => [w.id, w])), [widgets])
  const order = useMemo(() => buildWidgetOrder(layout.order, widgets.map(w => w.id)), [layout.order, widgets])
  const shown = editing ? order : filterVisibleWidgets(order, layout.visibility)
  const save = useCallback((nextOrder: readonly string[], visibility = layout.visibility) => store.save({ order: nextOrder, visibility, selected: layout.selected }), [store, layout.visibility, layout.selected])

  if (!order.length) return null
  const hidden = (id: string) => layout.visibility[id] === false
  const setHidden = (id: string, hide: boolean) => save(order, { ...layout.visibility, [id]: !hide })
  const drop = (e: DragEvent, to: string) => {
    e.preventDefault()
    if (dragging && dragging !== to) save(reorderWidget(order, dragging, order.indexOf(to)))
    setDragging(undefined)
  }
  const reset = () => { store.reset() }

  return (
    <div data-region={region} data-editing={editing || undefined}>
      <div className="mb-2 flex items-center justify-end gap-2">
        {editing ? <button type="button" onClick={reset} className="rounded-md px-2 py-1 text-caption text-fg-muted hover:text-fg">Reset layout</button> : null}
        <button type="button" aria-pressed={editing} onClick={() => setEditing(e => !e)} className="rounded-md px-2 py-1 text-caption text-fg-muted hover:text-fg">{editing ? 'Done' : 'Edit widgets'}</button>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shown.map((id, i) => {
          const w = byId.get(id)
          const card = w
            ? <WidgetCard id={id} app={app} title={w.label} icon={w.icon} meta={w.meta} defaultOpen={w.defaultOpen} storage={backing}>{w.node}</WidgetCard>
            : <WidgetCard id={id} app={app} title={id} tone="diagnostic" storage={backing}><p role="alert" className="text-caption text-danger">No widget is registered with the id “{id}”. It may have been removed or its plugin is not loaded.</p></WidgetCard>
          return (
            <li
              key={id} data-widget-id={id} data-hidden={hidden(id) || undefined} data-dragging={dragging === id || undefined}
              draggable={editing} onDragStart={editing ? e => { setDragging(id); e.dataTransfer?.setData('text/plain', id) } : undefined}
              onDragOver={editing ? e => e.preventDefault() : undefined} onDrop={editing ? e => drop(e, id) : undefined} onDragEnd={editing ? () => setDragging(undefined) : undefined}
              className={`flex flex-col gap-1 ${hidden(id) ? 'opacity-50' : ''} ${dragging === id ? 'opacity-50' : ''}`}
            >
              {editing ? (
                <div role="group" aria-label={`Arrange ${w?.label ?? id}`} className="flex items-center gap-1 text-caption text-fg-muted">
                  <span aria-hidden className="cursor-grab">⠿</span>
                  <button type="button" aria-label={`Move ${w?.label ?? id} up`} disabled={i === 0} onClick={() => save(moveWidget(order, id, -1))} className="rounded-md px-2 py-1 hover:text-fg disabled:opacity-50">↑</button>
                  <button type="button" aria-label={`Move ${w?.label ?? id} down`} disabled={i === shown.length - 1} onClick={() => save(moveWidget(order, id, 1))} className="rounded-md px-2 py-1 hover:text-fg disabled:opacity-50">↓</button>
                  <button type="button" aria-pressed={hidden(id)} onClick={() => setHidden(id, !hidden(id))} className="ml-auto rounded-md px-2 py-1 hover:text-fg">{hidden(id) ? 'Show' : 'Hide'}<span className="sr-only"> {w?.label ?? id}</span></button>
                </div>
              ) : null}
              {card}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
