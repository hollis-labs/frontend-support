# OperationsListPage — local source candidate

`OperationsListPage` is an additive export from `@hollis-labs/kit-dashboard/layout`.
It composes OperationsTablePage; existing consumers retain their default behavior.
The current source candidate is distinct from the published core release.

The caller supplies `admittedItems`, immutable `matchedItems`, `getRowId`, columns,
`sourceGeneration`, `accessible`, controlled query, checked IDs, facet values and
open inspector ID. IDs are nonempty opaque strings, unique within admission.
Matched and open IDs must belong to admission; duplicate/unadmitted IDs or an
invalid registry produce an explicit unavailable presentation with counts withheld.

The host performs admission and search/facet projection. Chips combine OR within
a group and AND across groups. Registry order is display order. Option counts are
**self-excluding**: apply the query and all other facets, omit this facet. Omit
counts when unknown. A selected zero-match chip/entity remains clearable;
unselected zero-count choices are disabled. Cycle options are a nonempty tuple.
Unknown values are unavailable, never silently treated as All. The entity null
value means All. No transport, authentication, domain fields or storage effects
are embedded in this composition.

Admitted counts precede matching; matched counts precede sort/windowing; revealed
counts describe the actual sorted rendered prefix; selected counts describe checked
IDs in the matched set, separately from the open inspector record. Loading/error/
denied/invalid counts are withheld. Successful empty counts are zero. The table
select-all control checks **revealed rows only**. Show more is the keyboard fallback
to the observer rooted in the existing page body; it does not fetch records.

Query/facet/source projection changes clear checked IDs and reset reveal. Sort and
density preserve checked IDs; sorting resets reveal and closes an unrevealed open
record. Source generation changes retire all source callbacks even when IDs repeat.
Keep projections immutable and stable across unrelated host renders; constructing
new matched arrays on every render intentionally constitutes a new projection.
The host must advance `sourceGeneration` for reset, source/access snapshot changes.
`active=false` represents host top-layer retirement and fences actions/shortcuts.

`inspector` supplies `mode: 'modal' | 'inline'`, controlled `selectedId`/`onSelect`,
title/meta/body/footer renderers, optional stop/wrap boundary policy and a current
focus fallback. Stop is the default; Torque explicitly requests wrap. Modal chrome
uses the public InspectionDialog and useControlledRecordNavigation. Inline keeps
bounded list/detail sibling scroll regions; narrow screens show detail with Back
to list. Inline record navigation uses buttons, without a window arrow listener.
Published useArrowNav is unchanged.

Body/footer receive an `OperationsActionScope`. Invoke `scope.run(action)` **when
executing** an action, including delayed/retained callbacks. It returns false after
record/source/access/layer retirement, unmount or StrictMode replay. Capturing a
record and acting directly bypasses this contract; arbitrary caller-owned header,
filter-action and cell nodes remain the host's responsibility. The composition
never authorizes a business mutation. Always enforce actual application authority
at the application's action boundary too.

Pane-local `/` focuses search only when the key originates in this focused pane,
with no editable/widget owner, prevented event, modifiers, IME/keyCode229,
composition or competing overlay. Row Enter/Space and list Up/Down retain native
widget ownership. Escape clears nonempty search once and retains focus; empty
Escape uses an explicitly supplied current fallback. Modal arrows are attached to
the actual popup root through the approved adapter. Nested overlay keys remain
with that overlay. No background window search listener is installed.

Close returns focus after commit only to a connected visible enabled admitted
current-generation trigger, otherwise the explicit current fallback or search.
Pending restoration is fenced against another source/overlay/unmount.

For persisted navigation convenience, the host may use existing createListCursor
from design-app-runtime and save `onVisibleOrderChange` IDs with query/facet state.
Clear on source retirement and validate restored IDs against current admission;
session storage is never admission evidence. Parallax's isolated candidate proof
uses this seam for actual Torque records and a proposed Run Explorer inline
adaptation. Baseline Run Explorer is modal; this proof does not claim native parity
or migrate live routes. Hardware OS IME and physical touch require separate proof.
