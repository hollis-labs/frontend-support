/** Renders the action gateway's state: the confirmation overlay and the outcome notice. */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { ActionGateway, GatewaySnapshot } from './actions'

export const useGatewaySnapshot = (g: ActionGateway): GatewaySnapshot => useSyncExternalStore(g.subscribe, g.getSnapshot, g.getSnapshot)

/** The decision surface. It renders the frozen action and nothing editable; edits elsewhere cancel it. */
export function ActionConfirmDialog({ gateway }: { gateway: ActionGateway }) {
  const { confirmation: c } = useGatewaySnapshot(gateway)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const id = c?.id
  useEffect(() => { if (id) cancelRef.current?.focus() }, [id])
  if (!c) return null
  return (
    <section role="alertdialog" aria-modal="true" aria-label="Confirm action" data-confirm={c.id} className="fixed inset-0 z-50 m-auto flex h-fit max-w-md flex-col gap-3 rounded-lg border border-border-subtle bg-bg-elevated p-4 text-fg">
      <h2 className="text-control font-semibold">{c.confirm.what}</h2>
      {c.confirm.who ? <p className="text-caption text-fg-muted">{c.confirm.who}</p> : null}
      <ul className="flex flex-col gap-1 text-caption" aria-label="Affects">{c.confirm.scope.map(s => <li key={s}>{s}</li>)}</ul>
      <div className="flex justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={() => gateway.resolveConfirmation(c.id, 'cancel')} className="rounded-md px-3 py-1.5 text-control text-fg-muted hover:text-fg">Cancel</button>
        <button type="button" disabled={c.granting} onClick={() => gateway.resolveConfirmation(c.id, 'confirm')} className="rounded-md bg-bg px-3 py-1.5 text-control font-semibold">Confirm</button>
      </div>
    </section>
  )
}

/** The latest terminal outcome. Errors are an alert; everything else a status. `onReview` is the host's re-review step for stale. */
export function ActionNotice({ gateway, onReview }: { gateway: ActionGateway; onReview?: (review: NonNullable<NonNullable<GatewaySnapshot['notice']>['review']>) => void }) {
  const { notice: n } = useGatewaySnapshot(gateway)
  if (!n) return null
  const error = n.message.kind === 'error'
  return (
    <div role={error ? 'alert' : 'status'} data-notice={n.outcome.status} data-kind={n.message.kind} className="fixed bottom-4 left-4 z-50 flex max-w-sm flex-col gap-1 rounded-lg border border-border-subtle bg-bg-elevated p-3 text-fg">
      <strong className="text-control">{n.message.title}</strong>
      {n.message.detail ? <span className="text-caption text-fg-muted">{n.message.detail}</span> : null}
      <div className="flex gap-2">
        {n.review && onReview ? <button type="button" onClick={() => { onReview(n.review!); gateway.dismissNotice() }} className="text-caption underline">Review changes</button> : null}
        {n.undo ? <button type="button" onClick={() => { void n.undo!().finally(() => gateway.dismissNotice()) }} className="text-caption underline">Undo</button> : null}
        <button type="button" onClick={() => gateway.dismissNotice()} className="text-caption text-fg-muted">Dismiss</button>
      </div>
    </div>
  )
}
