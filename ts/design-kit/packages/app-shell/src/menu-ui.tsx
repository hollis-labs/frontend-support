/**
 * Renders `menu.item` and `command` contributions: the command palette, row actions, subject context
 * menus and the primary toolbar. Every entry runs through the action gateway; the shell decides nothing
 * about risk or confirmation. Built on the kit's SearchPalette and OverflowMenu.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Button, OverflowMenu, SearchPalette, type OverflowAction } from '@hollis-labs/design-components'
import { CATALOG_FUNCTIONS, type Subject } from './actions'
import type { MenuEntry, MenuModel } from './model'

export const EMPTY_MENUS: MenuModel = { palette: [], rowActions: [], toolbar: [], context: {} }

export interface MenuRuntime {
  menus: MenuModel
  /** Runs an entry through the gateway. `subject` is the row or record a context menu was opened on. */
  run(entry: MenuEntry, subject?: Subject, trigger?: unknown): Promise<void>
  /** Renders a kit icon by the manifest's icon name. */
  icon(name: string | undefined): ReactNode
}
export const MenuContext = createContext<MenuRuntime | null>(null)

/** The shell's menus, or an empty set outside a ManifestShell (or when it has no action gateway). */
export function useMenus(): MenuRuntime {
  return useContext(MenuContext) ?? { menus: EMPTY_MENUS, run: async () => {}, icon: () => null }
}

let counter = 0
/** A unique action id (the gateway refuses a reused one). */
const actionId = (): string => `menu-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${++counter}`}`

/**
 * The gateway call for an entry. navigate and openRegion are catalog functions; `call` names an agent
 * function (or a catalog one, whose `input` becomes its arguments). `navigate` resolves a path to the surface key
 * the catalog handler takes, so a path no surface owns is refused by the gateway rather than followed.
 */
export function entryCall(entry: MenuEntry, subject: Subject | undefined, routeKeyOf: (path: string) => string | undefined): Record<string, unknown> {
  const a = entry.action
  if (a.navigate !== undefined) return { '@call': 'navigate', route: routeKeyOf(a.navigate) ?? '' }
  if (a.openRegion !== undefined) return { '@call': 'openRegion', region: a.openRegion, ...(a.tab !== undefined ? { tab: a.tab } : {}) }
  const fn = a.call!
  if ((CATALOG_FUNCTIONS as readonly string[]).includes(fn)) return { '@call': fn, ...(a.input ?? {}) }
  return { '@call': fn, hollis_action: { id: actionId(), risk: entry.risk, ...(subject ? { subject } : {}) }, ...(a.input !== undefined ? { input: a.input } : {}) }
}

const norm = (s: string) => s.toLowerCase()
const matches = (e: MenuEntry, q: string) => !q || [e.label, e.group ?? '', ...e.keywords].some(t => norm(t).includes(norm(q.trim())))

/** The command palette over `command.palette`. Controlled by the shell (Ctrl/Cmd+K). */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { menus, run, icon } = useMenus()
  const [query, setQuery] = useState('')
  const shown = useMemo(() => menus.palette.filter(e => matches(e, query)), [menus.palette, query])
  const firstDanger = shown.findIndex(e => e.danger)
  const options = shown.map((e, i) => ({
    id: e.item.key + '|' + e.item.module,
    label: (
      <span className="flex flex-col gap-1" data-risk={e.risk}>
        {i === firstDanger && i > 0 ? <span role="presentation" aria-hidden className="-mx-3 -mt-2 mb-1 block border-t border-border-subtle" /> : null}
        <span className="flex items-center gap-2">
          {icon(e.item.icon)}<span>{e.label}</span>
          {e.group ? <span className="text-caption text-fg-muted">{e.group}</span> : null}
          {e.danger ? <span className="text-caption text-fg-muted">High risk</span> : null}
          {e.item.shortcut ? <kbd className="ml-auto text-caption text-fg-muted">{e.item.shortcut}</kbd> : null}
        </span>
      </span>
    ),
  }))
  const close = (next: boolean) => { if (!next) setQuery(''); onOpenChange(next) }
  return (
    <SearchPalette
      open={open} onOpenChange={close} title="Command palette" query={query} onQueryChange={setQuery}
      options={options} sourceGeneration={menus.palette} emptyLabel="No matching commands"
      onSelect={id => {
        const entry = shown.find(e => e.item.key + '|' + e.item.module === id)
        close(false)
        if (entry) void run(entry)
      }}
    />
  )
}

const toAction = (e: MenuEntry, rt: MenuRuntime, subject: Subject | undefined): OverflowAction => ({
  label: e.label, icon: rt.icon(e.item.icon), destructive: e.danger, onSelect: () => { void rt.run(e, subject) },
})

/** The entries for a subject: its `menu:<kind>` items, ordered, high-risk last. */
export function useSubjectEntries(subject: Subject, includeRowActions: boolean): MenuEntry[] {
  const { menus } = useMenus()
  return useMemo(() => {
    const all = [...(includeRowActions ? menus.rowActions : []), ...(menus.context[subject.kind] ?? [])]
    return [...all.filter(e => !e.danger), ...all.filter(e => e.danger)]
  }, [menus, subject.kind, includeRowActions])
}

/** A row's overflow menu: the `row.actions` region plus the row subject's `menu:<kind>` items. Renders nothing when empty. */
export function RowActions({ subject, ariaLabel = 'Row actions' }: { subject: Subject; ariaLabel?: string }) {
  const rt = useMenus()
  const entries = useSubjectEntries(subject, true)
  if (!entries.length) return null
  return <OverflowMenu ariaLabel={ariaLabel} actions={entries.map(e => toAction(e, rt, subject))} />
}

/** A context menu for a subject (a message, a session): only its `menu:<kind>` items. Renders nothing when empty. */
export function ContextActions({ subject, ariaLabel = 'More actions' }: { subject: Subject; ariaLabel?: string }) {
  const rt = useMenus()
  const entries = useSubjectEntries(subject, false)
  if (!entries.length) return null
  return <OverflowMenu ariaLabel={ariaLabel} actions={entries.map(e => toAction(e, rt, subject))} />
}

/** The `toolbar.primary` region: low and medium entries as buttons, high-risk ones after a divider. */
export function PrimaryToolbar() {
  const rt = useMenus()
  const entries = rt.menus.toolbar
  if (!entries.length) return null
  const normal = entries.filter(e => !e.danger)
  const danger = entries.filter(e => e.danger)
  const button = (e: MenuEntry) => (
    <Button key={e.item.module + e.item.key} type="button" variant="ghost" size="sm" data-risk={e.risk} onClick={ev => { void rt.run(e, undefined, ev.currentTarget) }}>
      {rt.icon(e.item.icon)}{e.label}
    </Button>
  )
  return (
    <div role="toolbar" aria-label="Primary actions" data-region="toolbar.primary" className="flex items-center gap-1">
      {normal.map(button)}
      {danger.length && normal.length ? <span role="separator" aria-orientation="vertical" className="mx-1 h-4 w-px bg-border-subtle" /> : null}
      {danger.map(button)}
    </div>
  )
}
