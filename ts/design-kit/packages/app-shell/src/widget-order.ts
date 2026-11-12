/**
 * Pure widget-order helpers lifted (copy-from only) from Nanite's `buildWidgetOrder` / `filterVisibleWidgets`.
 * They work on ids and take the registry as an argument; the saved order itself lives in
 * plugin-host-ui's `createPluginLayoutStore`, so there is no second persistence scheme here.
 */

/**
 * Merge a saved order with the widgets the registry offers. Saved ids come first, in the user's order, and are
 * kept even when the registry no longer has them (the grid shows a diagnostic card for those); registry
 * widgets missing from the saved order are appended, so a new widget always shows for a returning user.
 */
export function buildWidgetOrder(saved: readonly string[] | undefined, available: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of [...(saved ?? []), ...available]) {
    if (id && !seen.has(id)) { seen.add(id); result.push(id) }
  }
  return result
}

/** Drop ids the user hid. Visibility is opt-out: an id with no entry is visible. */
export function filterVisibleWidgets(ids: readonly string[], visibility?: Readonly<Record<string, boolean>>): string[] {
  return ids.filter(id => !visibility || visibility[id] !== false)
}

/** Move `id` one step (`-1` up, `1` down) in `order`; unchanged at an edge or for an unknown id. */
export function moveWidget(order: readonly string[], id: string, step: -1 | 1): string[] {
  const from = order.indexOf(id), to = from + step
  if (from < 0 || to < 0 || to >= order.length) return [...order]
  return reorderWidget(order, id, to)
}

/** Move `id` to index `to` (drag and drop). Unchanged for an unknown id; `to` is clamped. */
export function reorderWidget(order: readonly string[], id: string, to: number): string[] {
  const next = [...order], from = next.indexOf(id)
  if (from < 0) return next
  next.splice(from, 1)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, id)
  return next
}
