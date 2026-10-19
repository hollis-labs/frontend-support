/**
 * THE ROW-ACTIVATION PROTOCOL, MOVED DOWN A LAYER — this is the one cross-package
 * coupling in the CW-0116 split, and it had to be fixed during the move.
 *
 * The pattern: a container makes a whole row (or card, or list item) clickable,
 * and some descendants own their own clicks — a copy button, an overflow menu, a
 * checkbox. Those must not also trigger the container. The container's handler
 * checks `closest()` against a marker attribute and bails.
 *
 * WHAT WAS WRONG. `data-table-row.tsx` in kit-dashboard defined the attribute and
 * the selector, and two BASE-classified components — `copyable-id.tsx` and
 * `row-action-menu.tsx` — hard-coded the attribute string. Shipped as-is,
 * `design-components` would emit markup whose only meaning lived in
 * `kit-dashboard`: a silent dependency from a lower layer on a higher one, which
 * no test catches and which becomes permanent the first time it ships.
 *
 * THE FIX IS DIRECTION, NOT DELETION. The protocol is not dashboard idiom — any
 * kit with an activatable row wants it, and kit-chat with clickable messages will
 * want exactly this. So it moves DOWN to base and is defined once, here. Kit
 * imports the selector instead of retyping the string, which is what stops the two
 * sides drifting apart later.
 *
 * Components that own their clicks mark themselves BY DEFAULT. Making it opt-in
 * would have silently regressed every existing call site — `CopyableId` is placed
 * by apps inside column cell renderers, not by `DataTable`, so nothing central
 * could have added the flag back.
 */

/** The marker attribute. A descendant carrying it owns its own clicks. */
export const ROW_INTERACTIVE_ATTR = 'data-row-interactive'

/**
 * The selector a container's activation handler matches with `closest()`.
 * Exported so a kit consumes this protocol rather than restating it.
 */
export const ROW_INTERACTIVE_SELECTOR = `[${ROW_INTERACTIVE_ATTR}="true"]`

/** Spread onto an element to mark it — or not, when `on` is false. */
export function rowInteractiveProps(on: boolean): Record<string, string> {
  return on ? { [ROW_INTERACTIVE_ATTR]: 'true' } : {}
}
