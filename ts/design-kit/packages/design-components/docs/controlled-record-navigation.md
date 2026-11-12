# Controlled record navigation

`useControlledRecordNavigation` consumes a caller-admitted ordered list of unique
opaque string IDs. It does not fetch records, admit sources, remember selection,
change routes or resolve focus. Pass `orderedIds`, `selectedId`, `active`,
`accessible`, `sourceGeneration`, explicit `boundaryPolicy: 'wrap' | 'stop'`, and
`onSelect`. The host accepts the selected ID through its own controlled state.

The result exposes zero-based `position` (`-1` for an absent selection),
`availability.previous/next`, `navigate(-1 | 1)` and `popupHandlers`.
Navigation returns whether it requested selection. Empty, single-item, inactive,
inaccessible and out-of-order selections cannot navigate. Stop leaves boundary
keys unconsumed; wrap cycles the supplied order. Callers render discoverable
previous/next buttons, position and boundary hints using availability.

For popup arrows, spread `popupHandlers` on the actual dialog/alertdialog root.
Its React `onKeyDown` must remain in the bubble phase, after descendants have had
an opportunity to consume events. Compose caller handlers explicitly if needed.
Composition start/end capture tracks an active composition session; native
`isComposing` and legacy key code 229 also suppress record arrows. Closing or
changing sourceGeneration resets the composition session.

Native inputs (including range), textarea, select, button, links, editable
ancestors and ARIA composite widgets own their keys. Modifier combinations,
already-consumed events, nested dialog targets, visible competing dialogs/menus/
listboxes and the explicit `data-nested-dialog-open` root marker also suppress
popup navigation. This is conservative document-local overlay ownership; callers
own admission and any overlay policy spanning documents. No global listener is
installed. Inline consumers may use only buttons and omit popupHandlers entirely.

Every committed render retires earlier navigation and event callbacks, even when
a source later returns to the same identifiers. Unmount also retires callbacks.
The hook snapshots order per render. Callers must render changes to order,
selection, activity, accessibility or source generation; mutating input data
without rendering is outside the controlled contract. Navigation never silently
changes selection or focus. The host owns record body identity and focus policy.

## Compatibility choice

This is a new adapter, separate from legacy `useArrowNav`. That hook remains a
window-level previous/next callback API. Its window handler cannot substitute for
the verified popup React bubble path, because popup/composite handling can consume
arrows before they reach the window. Existing consumers keep their original API;
new popup consumers choose the controlled adapter explicitly.

## Consumer evidence

CW-20261010-0036 consumes exact locally packed bytes in Parallax's existing Torque
inspection (wrapping modal) and Administration directory profile (inline controls,
stop boundaries and independent directory snapshot). Run Explorer and Event Ledger
remain existing related examples, rather than duplicated extraction demonstrations.
Unit coverage uses arbitrary IDs and tests retained callbacks with fresh positive
controls. Browser evidence includes native editing/range/button behavior; synthetic
composition diagnostics are not native OS IME. Physical touchscreen remains untested.
The local candidate is not a registry publication or deployment.
