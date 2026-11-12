import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { NavLink, NavNode } from './model'

/** Tabs shown before More when the app has more destinations than `MAX_ALL_TABS`. */
export const PRIMARY_TAB_COUNT = 3
/** With this many destinations or fewer, every one is a tab and there is no More. */
export const MAX_ALL_TABS = 4

export interface NarrowNavPlan {
  /** The destinations shown as tabs, in order. */
  tabs: NavLink[]
  /** Everything else, for the More sheet; null when there is no More. */
  more: { primary: NavLink[]; groups: { key: string; title: string; icon?: string; links: NavLink[] }[]; footer: NavLink[] } | null
}

/** The narrow nav's split of the model: the first three nav.primary items as tabs, the rest in More. */
export function planNarrowNav(nodes: readonly NavNode[], footer: readonly NavLink[]): NarrowNavPlan {
  const primary = nodes.flatMap(n => (n.type === 'item' ? [n.link] : []))
  const groups = nodes.flatMap(n => (n.type === 'group' && n.children.length ? [{ key: n.item.key, title: n.item.label || n.item.key, icon: n.item.icon, links: n.children }] : []))
  const total = primary.length + groups.reduce((n, g) => n + g.links.length, 0) + footer.length
  if (total <= MAX_ALL_TABS) return { tabs: [...primary, ...groups.flatMap(g => g.links), ...footer], more: null }
  return { tabs: primary.slice(0, PRIMARY_TAB_COUNT), more: { primary: primary.slice(PRIMARY_TAB_COUNT), groups, footer: [...footer] } }
}

const isTextField = (el: Element | null): boolean =>
  !!el && (el instanceof HTMLInputElement ? !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color'].includes(el.type)
    : el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable)

/** True while a text field has focus, so the tab bar can step aside for the virtual keyboard. */
function useTextFieldFocus(): boolean {
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    const on = () => setFocused(isTextField(document.activeElement))
    const out = () => setTimeout(on, 0)
    document.addEventListener('focusin', on)
    document.addEventListener('focusout', out)
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', out) }
  }, [])
  return focused
}

type Render = { link: (l: NavLink, tab: boolean) => ReactNode }

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function MoreSheet({ plan, render, tail, onClose }: { plan: NonNullable<NarrowNavPlan['more']>; render: Render; tail: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus() }, [])
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab') return
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    if (!items.length) return
    const first = items[0]!, last = items[items.length - 1]!
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
  const heading = 'px-3 pt-2 text-caption font-semibold text-fg-muted'
  return (
    <>
      <div data-nav-scrim aria-hidden onClick={onClose} className="fixed inset-0 z-40 bg-black/40" />
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label="More" data-nav-more onKeyDown={onKeyDown}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-lg border-t border-border-subtle bg-bg-elevated text-fg"
      >
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-subtle" />
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2 pb-[env(safe-area-inset-bottom)]">
          {plan.primary.map(l => render.link(l, false))}
          {plan.groups.map(g => (
            <section key={g.key} aria-label={g.title} data-region={`nav.group:${g.key}`} className="flex flex-col gap-1">
              <h2 className={heading}>{g.title}</h2>
              {g.links.map(l => render.link(l, false))}
            </section>
          ))}
          {plan.footer.length ? <section aria-label="Navigation" data-region="nav.footer" className="flex flex-col gap-1 border-t border-border-subtle pt-2">{plan.footer.map(l => render.link(l, false))}</section> : null}
          <div onClick={onClose} className="flex flex-col gap-1 border-t border-border-subtle pt-2">{tail}</div>
        </div>
      </div>
    </>
  )
}

/**
 * The narrow (<= 1023px) navigation: a bottom tab bar with the first three nav.primary items and a More tab
 * that opens a bottom sheet holding the rest. Rendered beside the shell, so crossing the breakpoint does not
 * remount the page. Hidden while a text field has focus. `routeKey` closes the sheet on navigation.
 */
export function NarrowNav({ plan, path, tail, renderLink, routeKey }: {
  plan: NarrowNavPlan; path: string; tail: ReactNode
  renderLink: (link: NavLink, opts: { tab: boolean; current: boolean }) => ReactNode; routeKey: string
}) {
  const [open, setOpen] = useState(false)
  const moreTab = useRef<HTMLButtonElement>(null)
  const keyboard = useTextFieldFocus()
  const wasOpen = useRef(false)
  useEffect(() => { setOpen(false) }, [routeKey])
  useEffect(() => {
    if (wasOpen.current && !open) moreTab.current?.focus()
    wasOpen.current = open
  }, [open])
  if (!plan.tabs.length && !plan.more) return null
  const isCurrent = (l: NavLink) => l.path !== null && l.path === path
  const moreLinks = plan.more ? [...plan.more.primary, ...plan.more.groups.flatMap(g => g.links), ...plan.more.footer] : []
  const activeInMore = moreLinks.some(isCurrent)
  const render: Render = { link: (l, tab) => renderLink(l, { tab, current: isCurrent(l) }) }
  return (
    <>
      <nav
        aria-label="Primary" data-nav-mode="tabs" hidden={keyboard}
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border-subtle bg-bg pb-[env(safe-area-inset-bottom)]"
      >
        {plan.tabs.map(l => <div key={l.item.key} className="flex min-w-0 flex-1">{render.link(l, true)}</div>)}
        {plan.more ? (
          <button
            ref={moreTab} type="button" aria-haspopup="dialog" aria-expanded={open} aria-current={activeInMore ? 'page' : undefined} data-nav-tab data-nav-more-tab
            onClick={() => setOpen(o => !o)}
            className={`flex h-14 min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-label ${activeInMore ? 'font-semibold text-fg' : 'text-fg-muted'}`}
          >More</button>
        ) : null}
      </nav>
      {open && plan.more ? <MoreSheet plan={plan.more} render={render} tail={tail} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
