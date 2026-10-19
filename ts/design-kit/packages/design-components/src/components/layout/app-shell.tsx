import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { cn } from '../../lib/utils'
import { OverlaySidebar } from '../overlay-sidebar'
import { restoreAdmittedFocus } from '../../lib/focus-return'

export type AsideWidth = 'compact' | 'regular' | 'wide'

export interface AppShellAsideProps {
  /** Optional content rendered inside the right aside region. When omitted, aside geometry is absent. */
  aside?: ReactNode
  /** Accessible landmark label for the aside region. Defaults to 'Aside'. */
  asideLabel?: string
  /**
   * Width preset for the desktop aside:
   * - 'compact': w-80 (20rem / 320px)
   * - 'regular': w-96 (24rem / 384px) - default
   * - 'wide': w-112 (28rem / 448px)
   */
  asideWidth?: AsideWidth
  /** Controlled collapsed state. When true, desktop aside is collapsed and reserves no sliver. */
  asideCollapsed?: boolean
  /** Controlled change handler for collapsed state. */
  onAsideCollapsedChange?: (collapsed: boolean) => void
  /** Pinned header band at the top of the aside. */
  asideHeader?: ReactNode
  /** Pinned footer band at the bottom of the aside (e.g., composer). */
  asideFooter?: ReactNode
  /** Title for the narrow OverlaySidebar fallback. Defaults to asideLabel or 'Aside'. */
  asideTitle?: ReactNode
  /** Description for the narrow OverlaySidebar fallback. */
  asideDescription?: ReactNode
  /**
   * Custom trigger element for opening the narrow OverlaySidebar.
   * If omitted, a default accessible trigger button is rendered.
   */
  asideTrigger?: ReactElement
  /** Controlled open state for the narrow OverlaySidebar. */
  asideOverlayOpen?: boolean
  /** Controlled change handler for the narrow OverlaySidebar open state. */
  onAsideOverlayOpenChange?: (open: boolean) => void
  /**
   * Controlled narrow viewport override (e.g. for testing / Storybook).
   * If undefined, media query (max-width: 1023px) is evaluated in the browser.
   */
  isNarrow?: boolean
  /** Explicit desktop toggle target for collapse/resize focus return. */
  asideFocusReturnTarget?: HTMLElement | null | (() => HTMLElement | null)
  /** Admission predicate for the explicit fallback target. */
  isAsideFallbackAdmitted?: (target: HTMLElement) => boolean
  /** Explicit fallback when the opening target is ineligible. */
  asideFocusFallbackTarget?: HTMLElement | null | (() => HTMLElement | null)
  /** Admission predicate to check if the trigger is still eligible to receive focus. */
  isAsideTriggerAdmitted?: (trigger: HTMLElement) => boolean
  /** Host source/access/layer identity; a resize cannot return into a replacement source. */
  asideSourceGeneration?: unknown
}

export interface AppShellProps extends AppShellAsideProps {
  /** Left-hand rail, full height beside the content column. Optional. */
  nav?: ReactNode
  /** Pinned band across the top of the content column. Optional. */
  header?: ReactNode
  /** The routed view. Rendered inside a flex column, so a child's `flex-1` works. */
  children: ReactNode
  /** Extra classes on the outermost element. */
  className?: string
}

const ASIDE_WIDTH_CLASSES: Record<AsideWidth, string> = {
  compact: 'w-80',
  regular: 'w-96',
  wide: 'w-112',
}

function subscribeMediaQuery(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mql = window.matchMedia?.('(max-width: 1023px)')
  if (!mql) return () => {}
  mql.addEventListener?.('change', callback)
  return () => {
    mql.removeEventListener?.('change', callback)
  }
}

function getMediaNarrowSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(max-width: 1023px)').matches)
}

function getMediaNarrowServerSnapshot(): boolean {
  return false
}

/**
 * The application shell — nav rail, optional header, content region that fills the viewport and scrolls,
 * and an optional right aside (e.g. assistant, inspector) with width presets, collapse, and narrow OverlaySidebar fallback.
 *
 * THE CHAIN, and each link earns its place:
 *
 *   h-dvh + overflow-hidden   the shell is exactly the viewport and never scrolls
 *   flex                      so the rail, content column, and aside sit side by side
 *   min-h-0 on the column     WITHOUT THIS a flex child refuses to shrink below
 *                             its content, so the column grows past the viewport
 *                             and takes the scroll region with it.
 *   min-w-0 on the column     the horizontal twin: one unbreakable string in the
 *                             content otherwise widens the whole shell
 *   flex flex-col on <main>   so the routed view's own `flex-1` has a flex parent
 *                             to size against.
 *
 * ASIDE OWNERSHIP:
 *   - On desktop (at or above 1024px / lg), the aside renders as a persistent right column with its own
 *     independent scrolling body and pinned header/footer chrome.
 *   - When collapsed, no empty sliver is reserved.
 *   - Below the narrow breakpoint (390px, mobile, < 1024px), the aside falls back to a right OverlaySidebar
 *     so the main column retains full viewport width.
 *   - Exactly one mounted copy of `aside` is rendered at any time.
 *   - Resize between desktop and narrow preserves the desktop collapsed preference without mutating storage,
 *     closes temporary overlays, and restores focus safely.
 */
export function AppShell({
  nav,
  header,
  children,
  className,
  aside,
  asideLabel = 'Aside',
  asideWidth = 'regular',
  asideCollapsed = false,
  asideHeader,
  asideFooter,
  asideTitle,
  asideDescription,
  asideTrigger,
  asideOverlayOpen: controlledOverlayOpen,
  onAsideOverlayOpenChange,
  isNarrow: controlledNarrow,
  asideFocusReturnTarget,
  isAsideFallbackAdmitted,
  asideFocusFallbackTarget,
  isAsideTriggerAdmitted,
  asideSourceGeneration,
}: AppShellProps) {
  const hasAside = aside !== undefined

  // Media query detection below narrow breakpoint (1024px / lg) using useSyncExternalStore
  const mediaNarrow = useSyncExternalStore(subscribeMediaQuery, getMediaNarrowSnapshot, getMediaNarrowServerSnapshot)
  const isNarrow = controlledNarrow ?? mediaNarrow

  // Narrow overlay open state (controlled or uncontrolled)
  const [internalOverlayOpen, setInternalOverlayOpen] = useState(false)
  const isOverlayOpen = controlledOverlayOpen !== undefined ? controlledOverlayOpen : internalOverlayOpen

  // Adjust overlay state during render when viewport switches narrow/desktop
  const [prevNarrow, setPrevNarrow] = useState(isNarrow)
  if (prevNarrow !== isNarrow) {
    setPrevNarrow(isNarrow)
    if (internalOverlayOpen) {
      setInternalOverlayOpen(false)
    }
  }

  const setOverlayOpen = useCallback(
    (open: boolean) => {
      setInternalOverlayOpen(open)
      onAsideOverlayOpenChange?.(open)
    },
    [onAsideOverlayOpenChange],
  )

  const lastViewport = useRef(isNarrow)
  useLayoutEffect(() => {
    if (lastViewport.current !== isNarrow) {
      lastViewport.current = isNarrow
      if (isOverlayOpen) onAsideOverlayOpenChange?.(false)
    }
  }, [isNarrow, isOverlayOpen, onAsideOverlayOpenChange])

  const desktopAsideRef = useRef<HTMLElement | null>(null)
  const overlayAsideRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const returnPending = useRef<{ kind: 'desktop' | 'overlay'; generation: unknown; activation: number } | null>(null)
  const activation = useRef(0)
  const committedAside = useRef({ isNarrow, generation: asideSourceGeneration })
  const setDesktopAsideRef = useCallback((node: HTMLElement | null) => {
    if (!node && desktopAsideRef.current?.contains(document.activeElement)) {
      returnPending.current = { kind: 'desktop', generation: committedAside.current.generation, activation: activation.current }
    }
    desktopAsideRef.current = node
  }, [])
  const popupOwnsFocus = useRef(false)
  const popupFocusEpoch = useRef(0)
  const rememberPopupFocus = useCallback(() => { popupFocusEpoch.current++; popupOwnsFocus.current = true }, [])
  const releasePopupFocus = useCallback((event: FocusEvent) => {
    if (overlayAsideRef.current?.contains(event.relatedTarget as Node | null)) return
    if (event.relatedTarget) { popupFocusEpoch.current++; popupOwnsFocus.current = false; return }
    // Chromium emits focusout with no destination while a focused child is
    // being removed, before the popup ref detaches. Ordinary blur leaves the
    // child connected; resolve that distinction after this DOM mutation.
    const target = event.target as Node
    const popup = overlayAsideRef.current
    const focusEpoch = ++popupFocusEpoch.current
    const activationEpoch = activation.current
    const generation = committedAside.current.generation
    queueMicrotask(() => {
      if (popupFocusEpoch.current === focusEpoch && activation.current === activationEpoch && Object.is(committedAside.current.generation, generation) && overlayAsideRef.current === popup && target.isConnected && !popup?.contains(document.activeElement)) popupOwnsFocus.current = false
    })
  }, [])
  const setOverlayAsideRef = useCallback((node: HTMLDivElement | null) => {
    const previous = overlayAsideRef.current
    popupFocusEpoch.current++
    // Portals detach before this callback. Removal may emit destinationless
    // focus-out before detaching; preserve observed ownership through that
    // mutation. Focus to an outside node relinquishes ownership immediately.
    if (!node && popupOwnsFocus.current) {
      returnPending.current = { kind: 'overlay', generation: committedAside.current.generation, activation: activation.current }
    }
    previous?.removeEventListener('focusin', rememberPopupFocus)
    previous?.removeEventListener('focusout', releasePopupFocus)
    overlayAsideRef.current = node
    popupOwnsFocus.current = Boolean(node?.contains(document.activeElement))
    node?.addEventListener('focusin', rememberPopupFocus)
    node?.addEventListener('focusout', releasePopupFocus)
  }, [rememberPopupFocus, releasePopupFocus])


  const mounted = useRef(false)
  const returnFrame = {}
  const currentReturnFrame = useRef(returnFrame)
  useLayoutEffect(() => {
    mounted.current = true
    activation.current++
    return () => { mounted.current = false; activation.current++ }
  }, [])
  // Wait for host commit guards and current refs, then reject superseded returns.
  useLayoutEffect(() => {
    currentReturnFrame.current = returnFrame
    const previous = committedAside.current
    committedAside.current = { isNarrow, generation: asideSourceGeneration }
    const pending = returnPending.current
    returnPending.current = null
    if (!pending || !hasAside || !Object.is(pending.generation, asideSourceGeneration)) return
    // Popup removal only belongs to us when this same shell/source changes layout.
    // Ordinary close belongs to Sheet; arbitrary removal must never restore focus.
    if (pending.kind === 'overlay' && (!previous.isNarrow || isNarrow)) return
    queueMicrotask(() => {
      if (!mounted.current || activation.current !== pending.activation || currentReturnFrame.current !== returnFrame) return
      // A surviving or newly opened nested layer retains keyboard/focus custody.
      if (Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')).some((layer) =>
        layer.isConnected && !layer.hasAttribute('data-closed') && !layer.closest('[hidden], [inert], [aria-hidden="true"]') &&
        getComputedStyle(layer).display !== 'none' && getComputedStyle(layer).visibility !== 'hidden',
      )) return
      restoreAdmittedFocus({
        trigger: asideFocusReturnTarget ?? triggerRef.current,
        isAdmitted: isAsideTriggerAdmitted,
        fallbackTarget: asideFocusFallbackTarget,
        isFallbackAdmitted: isAsideFallbackAdmitted,
      })
    })
  })


  return (
    <div
      data-slot="app-shell"
      data-has-aside={hasAside ? true : undefined}
      data-aside-state={hasAside ? isNarrow ? isOverlayOpen ? 'overlay' : 'collapsed' : asideCollapsed ? 'collapsed' : 'persistent' : undefined}
      data-aside-width={hasAside ? asideWidth : undefined}
      className={cn('flex h-dvh w-dvw overflow-hidden bg-bg text-fg', className)}
    >
      {nav}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {header}
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
      {hasAside && !isNarrow && !asideCollapsed && (
        <aside
          ref={setDesktopAsideRef}
          data-slot="app-shell-aside"
          data-width={asideWidth}
          data-collapsed={false}
          aria-label={asideLabel}
          className={cn(
            'flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-border-subtle bg-bg',
            ASIDE_WIDTH_CLASSES[asideWidth],
          )}
        >
          {asideHeader ? (
            <div data-slot="app-shell-aside-header" className="shrink-0 border-b border-border-subtle">
              {asideHeader}
            </div>
          ) : null}
          <div data-slot="app-shell-aside-body" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {aside}
          </div>
          {asideFooter ? (
            <div data-slot="app-shell-aside-footer" className="shrink-0 border-t border-border-subtle">
              {asideFooter}
            </div>
          ) : null}
        </aside>
      )}
      {hasAside && isNarrow && (
        <div data-slot="app-shell-aside-control" className="fixed right-2 bottom-2 z-40">
        <OverlaySidebar
          contentRef={setOverlayAsideRef}
          side="right"
          open={isOverlayOpen}
          onOpenChange={setOverlayOpen}
          focusReturn={{
            isAdmitted: isAsideTriggerAdmitted,
            fallbackTarget: asideFocusFallbackTarget,
            isFallbackAdmitted: isAsideFallbackAdmitted,
          }}
          trigger={
            asideTrigger ?? (
              <button
                ref={triggerRef}
                type="button"
                data-slot="app-shell-aside-trigger"
                aria-label={asideLabel}
                aria-expanded={isOverlayOpen}
                className="shrink-0 self-start rounded border border-border-subtle p-2 text-control"
              >
                {asideLabel}
              </button>
            )
          }
          title={asideTitle ?? asideLabel}
          description={asideDescription}
          header={asideHeader}
          footer={asideFooter}
        >
          {aside}
        </OverlaySidebar>
        </div>
      )}
    </div>
  )
}
