import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { InspectionDialog, useControlledRecordNavigation } from '@hollis-labs/design-components'
import { FilterChipGroup, FilterCycleToggle, FilterEntityCombobox } from '../filter-bar'
import { OperationsTablePage, type OperationsTablePageProps } from './operations-table-page'

export type OperationsFacet =
  | {
      id: string
      kind: 'chips'
      label: string
      options: readonly { value: string; label: string; count?: number }[]
      value: readonly string[]
      onChange(next: readonly string[]): void
    }
  | {
      id: string
      kind: 'cycle'
      label: string
      options: readonly [{ value: string; label: string }, ...{ value: string; label: string }[]]
      value: string
      onChange(next: string): void
    }
  | {
      id: string
      kind: 'entity'
      label: string
      allLabel: string
      options: readonly { id: string; name: string; count?: number }[]
      value: string | null
      onChange(next: string | null): void
    }

/** Retained action callbacks must invoke this guard at execution time. */
export interface OperationsActionScope {
  run(action: () => void): boolean
}
export interface OperationsInspector<T> {
  mode: 'modal' | 'inline'
  selectedId: string | null
  onSelect(id: string | null): void
  title(item: T): ReactNode
  renderBody(item: T, scope: OperationsActionScope): ReactNode
  meta?(item: T): ReactNode
  footer?(item: T, scope: OperationsActionScope): ReactNode
  boundaryPolicy?: 'stop' | 'wrap'
  /** Current host-owned fallback, checked again when returning focus. */
  fallbackFocus?: RefObject<HTMLElement | null>
}
export interface OperationsListPageProps<T> extends Omit<
  OperationsTablePageProps<T>,
  | 'items'
  | 'filterControls'
  | 'onRowOpen'
  | 'onSelectionChange'
  | 'selectedIds'
  | 'selectionResetKey'
  | 'guardedRows'
  | 'revealControls'
  | 'searchControl'
  | 'slashToFocus'
  | 'interactionAllowed'
> {
  admittedItems: T[]
  matchedItems: T[]
  sourceGeneration: unknown
  accessible: boolean
  /** Host top-layer admission; false retires actions and pane shortcuts. */
  active?: boolean
  facets?: readonly OperationsFacet[]
  selectedIds: readonly string[]
  onSelectionChange(ids: string[]): void
  inspector: OperationsInspector<T>
}
const owners =
  'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="menu"], [role="listbox"], [role="tablist"], [role="slider"]'
const layers = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
const visible = (node: HTMLElement | null) =>
  Boolean(
    node?.isConnected &&
    node.getClientRects().length &&
    !node.closest('[inert], [hidden], [aria-hidden="true"]') &&
    !node.matches(':disabled, [aria-disabled="true"]'),
  )

/** Host projections in; bounded presentation and lifetime-fenced interactions out. */
export function OperationsListPage<T>({
  admittedItems,
  matchedItems,
  sourceGeneration,
  accessible,
  active = true,
  facets = [],
  selectedIds,
  onSelectionChange,
  inspector,
  ...page
}: OperationsListPageProps<T>) {
  const facetOwner = useId()
  const inspectionTitle = useRef<HTMLHeadingElement>(null)
  const modalRoot = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null)
  const trigger = useRef<{
    node: HTMLElement
    id: string
    generation: unknown
  } | null>(null)
  const pendingReturn = useRef<{ generation: unknown; epoch: number } | null>(null)
  const focusFrame = useRef<number | null>(null)
  const currentFocus = useRef<{
    generation: unknown
    accessible: boolean
    active: boolean
    open: string | null
    revealed: string[]
  }>({
    generation: sourceGeneration,
    accessible,
    active,
    open: inspector.selectedId,
    revealed: [],
  })
  const composing = useRef(false)
  const lifetime = useRef({ mounted: false, epoch: 0, frame: {} })
  const [epoch, setEpoch] = useState(0)
  const frame = {}
  useLayoutEffect(() => {
    lifetime.current.frame = frame
  })
  // React's ref attachment lifetime includes StrictMode detach/re-attach.
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current)
    root.current = node
    lifetime.current.mounted = node !== null
    lifetime.current.epoch++
    composing.current = false
    if (node) setEpoch(lifetime.current.epoch)
  }, [])
  const live = () =>
    lifetime.current.mounted && lifetime.current.epoch === epoch && lifetime.current.frame === frame
  const admitted = new Map<string, T>(),
    matched = new Map<string, T>()
  let invalid =
    page.pageSize !== undefined && (!Number.isSafeInteger(page.pageSize) || page.pageSize <= 0)
  for (const item of admittedItems) {
    const id = page.getRowId(item)
    if (typeof id !== 'string' || !id.length || admitted.has(id)) invalid = true
    admitted.set(id, item)
  }
  for (const item of matchedItems) {
    const id = page.getRowId(item)
    if (!admitted.has(id) || matched.has(id)) invalid = true
    matched.set(id, item)
  }
  for (const f of facets) {
    if (
      f.options.some(
        (o) =>
          'count' in o &&
          o.count !== undefined &&
          (!Number.isSafeInteger(o.count) || (o.count as number) < 0),
      )
    )
      invalid = true
    const keys = f.options.map((o) =>
      f.kind === 'entity' ? (o as { id: string }).id : (o as { value: string }).value,
    )
    if (
      new Set(keys).size !== keys.length ||
      (f.kind === 'chips'
        ? f.value.some((v) => !keys.includes(v))
        : f.kind === 'entity'
          ? f.value !== null && !keys.includes(f.value)
          : !keys.includes(f.value))
    )
      invalid = true
  }
  if (
    new Set(facets.map((f) => f.id)).size !== facets.length ||
    facets.some((f) => !f.id || (f.kind === 'cycle' && !f.options.length))
  )
    invalid = true
  const ready = accessible && !page.loading && !page.errorState && !invalid
  const allowed = () => live() && ready && active
  const paneAllowed = (editableInput = false) =>
    allowed() &&
    (inspector.mode === 'inline' || inspector.selectedId === null) &&
    (editableInput || !composing.current) &&
    !Array.from(document.querySelectorAll<HTMLElement>(layers)).some((n) => visible(n))
  const facetAllowed = (id: string) =>
    allowed() &&
    (inspector.mode === 'inline' || inspector.selectedId === null) &&
    !composing.current &&
    !Array.from(document.querySelectorAll<HTMLElement>(layers)).some(
      (n) =>
        visible(n) &&
        n.closest('[data-filter-owner]')?.getAttribute('data-filter-owner') !==
          `${facetOwner}/${id}`,
    )
  const inspectorAllowed = () =>
    allowed() &&
    !composing.current &&
    !Array.from(document.querySelectorAll<HTMLElement>(layers)).some(
      (n) => visible(n) && n !== modalRoot.current && !n.contains(modalRoot.current),
    )
  const projection = JSON.stringify([page.searchQuery, facets.map((f) => [f.id, f.value])])
  const [snapshot, setSnapshot] = useState({
    sourceGeneration,
    projection,
    matchedItems,
    selectedIds,
    open: inspector.selectedId,
  })
  const sourceChanged = !Object.is(snapshot.sourceGeneration, sourceGeneration)
  const changed =
    sourceChanged || snapshot.projection !== projection || snapshot.matchedItems !== matchedItems
  const [resetToken, setResetToken] = useState({})
  if (changed) {
    setSnapshot({
      sourceGeneration,
      projection,
      matchedItems,
      selectedIds,
      open: inspector.selectedId,
    })
    setResetToken({})
  }
  const [retired, setRetired] = useState<{
    selection: readonly string[]
    open: string | null
  } | null>(null)
  if (changed)
    setRetired({
      selection: selectedIds,
      open: sourceChanged ? inspector.selectedId : null,
    })
  const checked =
    ready && !changed && retired?.selection !== selectedIds
      ? [...new Set(selectedIds.filter((id) => matched.has(id)))]
      : []
  if (retired && selectedIds.length === 0 && inspector.selectedId === null) setRetired(null)
  const [order, setOrder] = useState<string[]>([])
  const [orderToken, setOrderToken] = useState(resetToken)
  const revealed =
    !changed && orderToken === resetToken && ready ? order.filter((id) => matched.has(id)) : []
  const openId =
    ready &&
    !changed &&
    retired?.open !== inspector.selectedId &&
    inspector.selectedId !== null &&
    revealed.includes(inspector.selectedId)
      ? inspector.selectedId
      : null
  const item = openId === null ? undefined : matched.get(openId)
  useLayoutEffect(() => {
    if (
      changed ||
      (retired?.selection === selectedIds && selectedIds.length) ||
      selectedIds.some((id) => !matched.has(id)) ||
      (!ready && selectedIds.length)
    )
      onSelectionChange([])
    if (
      inspector.selectedId !== null &&
      openId === null &&
      (!ready ||
        sourceChanged ||
        retired?.open === inspector.selectedId ||
        orderToken === resetToken)
    )
      inspector.onSelect(null)
  })
  function select(id: string | null) {
    if (!inspectorAllowed() || (id !== null && !revealed.includes(id))) return
    inspector.onSelect(id)
  }
  const navigation = useControlledRecordNavigation({
    orderedIds: revealed,
    selectedId: openId,
    active: active && item !== undefined,
    accessible: ready,
    sourceGeneration,
    boundaryPolicy: inspector.boundaryPolicy ?? 'stop',
    onSelect: (id) => select(id),
  })
  const scope: OperationsActionScope = {
    run(action) {
      if (!inspectorAllowed() || openId === null || !revealed.includes(openId)) return false
      action()
      return true
    },
  }
  function close() {
    if (!inspectorAllowed()) return
    inspector.onSelect(null)
    pendingReturn.current = { generation: sourceGeneration, epoch }
  }
  useLayoutEffect(() => {
    currentFocus.current = {
      generation: sourceGeneration,
      accessible: ready,
      active,
      open: inspector.selectedId,
      revealed,
    }
    const pending = pendingReturn.current
    if (!pending || inspector.selectedId !== null) return
    pendingReturn.current = null
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null
      const current = currentFocus.current,
        origin = trigger.current
      if (
        !lifetime.current.mounted ||
        lifetime.current.epoch !== pending.epoch ||
        !Object.is(current.generation, pending.generation) ||
        !current.accessible ||
        !current.active ||
        current.open !== null ||
        Array.from(document.querySelectorAll<HTMLElement>(layers)).some((n) => visible(n))
      )
        return
      const destination =
        origin &&
        Object.is(origin.generation, current.generation) &&
        current.revealed.includes(origin.id) &&
        visible(origin.node)
          ? origin.node
          : (inspector.fallbackFocus?.current ?? search.current)
      if (visible(destination)) destination?.focus()
    })
  })

  useLayoutEffect(() => {
    if (inspector.mode !== 'inline' || openId === null) return
    const focused = document.activeElement
    if (!(focused instanceof HTMLElement) || !focused.closest('[data-ops-pane="inspector"]'))
      inspectionTitle.current?.focus()
  }, [inspector.mode, openId])
  const nav = (
    <>
      <button
        type="button"
        data-ops-action="previous"
        disabled={!navigation.availability.previous}
        onClick={() => navigation.navigate(-1)}
      >
        Previous
      </button>
      <span>
        {navigation.position + 1} / {revealed.length}
      </span>
      <button
        type="button"
        data-ops-action="next"
        disabled={!navigation.availability.next}
        onClick={() => navigation.navigate(1)}
      >
        Next
      </button>
    </>
  )
  const searchControl = (
    <input
      ref={search}
      type="search"
      aria-label={page.searchAriaLabel ?? 'Search'}
      placeholder={page.searchPlaceholder ?? 'Search…'}
      value={page.searchQuery}
      disabled={!accessible || !active}
      className="w-full min-w-0 rounded border border-border bg-bg px-3 py-2 text-label text-text"
      onChange={(e) => {
        if (paneAllowed(true)) page.onSearchChange(e.target.value)
      }}
      onKeyDown={(e) => {
        if (
          !paneAllowed() ||
          composing.current ||
          e.nativeEvent.isComposing ||
          e.nativeEvent.keyCode === 229 ||
          e.defaultPrevented ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          e.shiftKey ||
          e.key !== 'Escape'
        )
          return
        e.preventDefault()
        e.stopPropagation()
        if (page.searchQuery) page.onSearchChange('')
        else if (visible(inspector.fallbackFocus?.current ?? null))
          inspector.fallbackFocus?.current?.focus()
      }}
    />
  )
  const controls = facets.map((facet) => (
    <div
      key={facet.id}
      role="group"
      data-ops-facet={facet.id}
      data-ops-facet-kind={facet.kind}
      aria-label={facet.label}
    >
      {facet.kind === 'chips' ? (
        <FilterChipGroup
          label={facet.label}
          chips={facet.options.map((o) => ({
            value: o.value,
            label: o.count === undefined ? o.label : `${o.label} (${o.count})`,
            disabled: o.count === 0 && !facet.value.includes(o.value),
          }))}
          selected={facet.value}
          onToggle={(value) => {
            if (facetAllowed(facet.id))
              facet.onChange(
                facet.value.includes(value)
                  ? facet.value.filter((v) => v !== value)
                  : [...facet.value, value],
              )
          }}
        />
      ) : facet.kind === 'cycle' ? (
        <FilterCycleToggle
          ariaLabel={facet.label}
          options={facet.options}
          value={facet.value}
          onChange={(value) => {
            if (facetAllowed(facet.id)) facet.onChange(value)
          }}
        />
      ) : (
        <FilterEntityCombobox
          icon={null}
          overlayOwner={`${facetOwner}/${facet.id}`}
          ariaLabel={facet.label}
          allLabel={facet.allLabel}
          items={facet.options.map((o) => ({
            ...o,
            disabled: o.count === 0 && facet.value !== o.id,
          }))}
          value={facet.value}
          onChange={(value) => {
            if (facetAllowed(facet.id)) facet.onChange(value)
          }}
        />
      )}
    </div>
  ))
  const counts = (
    <div
      role="status"
      className="flex flex-wrap gap-3 border-t border-border px-4 py-2 text-caption text-text-subtle"
      data-ops-count-state={ready ? 'known' : 'withheld'}
    >
      {ready
        ? (['admitted', 'matched', 'revealed', 'selected'] as const).map((name, i) => (
            <span key={name} data-ops-count={name}>
              {[admitted.size, matched.size, revealed.length, checked.length][i]} {name}
            </span>
          ))
        : 'Counts unavailable'}
    </div>
  )
  return (
    <div
      ref={attach}
      className="flex h-full min-h-0 min-w-0 flex-col"
      data-ops-pane="main"
      data-ops-inspector-mode={inspector.mode}
      data-ops-resource={
        page.loading
          ? 'loading'
          : page.errorState
            ? 'error'
            : !accessible
              ? 'denied'
              : invalid
                ? 'unavailable'
                : matched.size
                  ? 'ready'
                  : 'empty'
      }
      onCompositionStartCapture={() => {
        composing.current = true
      }}
      onCompositionEndCapture={() => {
        composing.current = false
      }}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement
        if (
          !allowed() ||
          item ||
          composing.current ||
          e.defaultPrevented ||
          e.nativeEvent.isComposing ||
          e.nativeEvent.keyCode === 229 ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          e.shiftKey ||
          target.closest(owners) ||
          !root.current?.contains(target) ||
          Array.from(document.querySelectorAll<HTMLElement>(layers)).some((n) => visible(n))
        )
          return
        if (e.key === '/') {
          e.preventDefault()
          search.current?.focus()
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const rows = Array.from(root.current.querySelectorAll<HTMLElement>('[data-ops-row-id]'))
          const index = rows.indexOf(target)
          const next =
            index < 0
              ? 0
              : Math.max(0, Math.min(rows.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)))
          if (rows[next]) {
            e.preventDefault()
            rows[next].focus()
          }
        }
      }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
        <div
          data-ops-pane="list"
          className={`min-h-0 min-w-0 flex-1 ${inspector.mode === 'inline' && item ? 'hidden md:block' : ''}`}
        >
          <OperationsTablePage
            {...page}
            items={ready ? matchedItems : []}
            selectedIds={checked}
            selectionResetKey={resetToken}
            guardedRows
            interactionAllowed={paneAllowed}
            revealControls
            slashToFocus={false}
            searchControl={searchControl}
            filterControls={controls}
            onClear={
              page.onClear
                ? () => {
                    if (paneAllowed()) page.onClear?.()
                  }
                : undefined
            }
            footer={
              <>
                {counts}
                {page.footer}
              </>
            }
            errorState={
              invalid ? (
                <p role="alert">
                  Records unavailable: identifiers, facet registry or reveal size are invalid.
                </p>
              ) : !accessible ? (
                <p role="alert">Records unavailable</p>
              ) : (
                page.errorState
              )
            }
            onVisibleOrderChange={(ids) => {
              if (!live()) return false
              setOrder(ids)
              setOrderToken(resetToken)
              page.onVisibleOrderChange?.(ids)
            }}
            onSelectionChange={(ids) => {
              if (paneAllowed()) onSelectionChange(ids.filter((id) => revealed.includes(id)))
            }}
            onRowOpen={(id) => {
              if (!paneAllowed() || !revealed.includes(id)) return
              const node = document.activeElement
              if (node instanceof HTMLElement)
                trigger.current = { node, id, generation: sourceGeneration }
              inspector.onSelect(id)
            }}
          />
        </div>
        {inspector.mode === 'inline' && item !== undefined && (
          <section
            aria-label="Record inspector"
            {...navigation.popupHandlers}
            onKeyDown={(event) => {
              if (inspectorAllowed()) navigation.popupHandlers.onKeyDown?.(event)
            }}
            data-ops-pane="inspector"
            className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border"
          >
            <header className="shrink-0 p-3">
              <button type="button" data-ops-action="back" onClick={close}>
                Back to list
              </button>
              <h2 ref={inspectionTitle} tabIndex={-1}>
                {inspector.title(item)}
              </h2>
              {inspector.meta?.(item)}
            </header>
            <nav
              aria-label="Record navigation"
              className="flex shrink-0 flex-wrap justify-between gap-2 border-y border-border p-3"
            >
              {nav}
            </nav>
            <div data-ops-scroll="detail" className="min-h-0 min-w-0 flex-1 overflow-auto">
              {<InspectorContent item={item} scope={scope} render={inspector.renderBody} />}
            </div>
            {inspector.footer && (
              <footer className="shrink-0 border-t border-border p-3">
                {<InspectorContent item={item} scope={scope} render={inspector.footer} />}
              </footer>
            )}
          </section>
        )}
      </div>
      {inspector.mode === 'modal' && item !== undefined && (
        <InspectionDialog
          ref={modalRoot}
          initialFocus={inspectionTitle}
          titleProps={{ ref: inspectionTitle, tabIndex: -1 }}
          open
          onOpenChange={(open) => {
            if (!open) close()
          }}
          title={inspector.title(item)}
          meta={inspector.meta?.(item)}
          navigation={nav}
          navigationLabel="Record navigation"
          footer={
            inspector.footer ? (
              <InspectorContent item={item} scope={scope} render={inspector.footer} />
            ) : undefined
          }
          {...navigation.popupHandlers}
          onKeyDown={(event) => {
            if (inspectorAllowed()) navigation.popupHandlers.onKeyDown?.(event)
          }}
          finalFocus={() => false}
        >
          {<InspectorContent item={item} scope={scope} render={inspector.renderBody} />}
        </InspectionDialog>
      )}
    </div>
  )
}

function InspectorContent<T>({
  item,
  scope,
  render,
}: {
  item: T
  scope: OperationsActionScope
  render(item: T, scope: OperationsActionScope): ReactNode
}) {
  return <>{render(item, scope)}</>
}
