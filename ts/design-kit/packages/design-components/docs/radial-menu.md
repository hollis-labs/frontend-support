# Deliberate holds and radial actions

CW-20261010-0091. Public DOM primitives in `@hollis-labs/design-components`.
No app adapters, provider effects or publication. The controlled menu and hook
are independent: a caller can use a hold for a secondary button action and can
open a menu from the keyboard without synthesizing a hold.

```tsx
const hold = useLongPress({
  sourceGeneration: source.revision,
  activationGeneration: record.id,
  accessible: source.accessible,
  isAdmitted: () => source.ids.includes(record.id),
  onLongPress: ({ target, clientX, clientY }) => {
    setMenu({ recordId: record.id, target, position: { x: clientX, y: clientY } })
  },
})
return <button type="button" {...hold.bindings} onClick={inspectRecord}>Record title</button>
```

`duration` defaults to 1000 milliseconds; `movementTolerance` defaults to 8
CSS pixels. Moving **beyond**, not exactly to, that distance cancels. Primary
left-pointer only; interactive descendants keep their own pointer actions.
The hook never captures a pointer, cancels browser scrolling, or sets touch-action.
Pointer release/leave/cancel, touchcancel, scroll, blur, root disconnection,
disable/access changes and committed replacement cancel pending callbacks.
Caller admission and active layer checks run both on press and at timer expiry.
This contract admits background roots only: any active shared layer or visible
unregistered overlay vetoes a hold. It does not permit secondary holds inside
a dialog. A future owned-layer contract needs explicit identity and separate proof.

The successful release click is suppressed only on the originating target and
pointer gesture. Keyboard clicks, unrelated targets and the next independent
pointerdown retain normal behavior. The release token expires after the native
compatibility mouseup/click dispatch turn, which may follow touch pointerup in a later task. A fired gesture keeps release custody when opening
the menu commits a new frame; a source/activation/access replacement retires it.
There is no permanent “suppress next click” flag. `gesture.cancel()` cancels only
that exact live gesture. `result.cancel()` cancels the current frame's hold;
retained result handlers and cancel functions from older frames cannot act.
Activity hide/reveal, unmount/remount and StrictMode replay cannot revive them.

`RadialMenu` takes `open`, `label`, `position`, `items`, `onAction`,
`onOpenChange`, `sourceGeneration`, `activationGeneration`, `accessible`,
`isAdmitted`, `focusReturn` and optional `escapeStack`. The activation generation
is a string/number identifying the opening session; changing it starts a fresh
menu. Item IDs are opaque and unique among siblings; the center uses a separate internal identity.
Each item has `id`, `label`, finite `angle`, optional icon, disabled state and
optional child items. Actions remain caller-owned. Children enter a new menu level;
the center and Escape return to its parent before closing the root.

Angles are degrees clockwise from the **right** (`cos`/`sin`), preserving the
actual Nil `RadialMenuWrapper.tsx` orientation. The reviewed spec's labels “0°
top” and “90° right” disagree with that primary source. The fixture preserves
Nil's actual todo 8 / note 5 / more 4 angles and action identities. Notes use
COPY as the source does; there is no invented note MORE action.

ArrowRight/Down advance clockwise; ArrowLeft/Up reverse. Tab/Shift+Tab cycle
through enabled actions and center. Enter/Space activate. Focus enters the first
enabled action, or center when none are enabled. Disabled buttons never dispatch.
The root has menu semantics, each action/center is a labelled menuitem. Keyboard
opening belongs to the caller: the evidence uses public `useShortcut` for
Shift+F10 and ContextMenu, scoped to the directly focused row with exact modifiers,
editable/composition guards and layer admission. No new global single-letter key
is installed by these primitives.

The menu uses the public layered Escape/focus admission contract. A nested popup
owns its keys; composition and editable targets retain custody. The caller must
admit the current record/source and provide an admitted visible fallback target.
Pointer actions and center dismissal restore focus through the same resolver.
The menu does not claim to be a modal dialog; it is an action menu with contained
keyboard cycling, an outside-click dismiss surface, and caller-owned focus.

Geometry is algorithmic: measure spacing-scale probes (`w-16` orbit, `w-2`
clearance), action bounds and visual viewport, then clamp the center. Buttons,
text, border, focus ring and surfaces name public scale/color tokens. Long labels
are bounded/truncated with full accessible names. Reduced motion removes color
transitions. Extremely small viewports unable to fit the measured orbit center
it symmetrically; the evidenced lower bound is 390×420.

## Evidence

Parallax's isolated `nil-radial.html` / `Behaviors/Nil/Radial` stories exercise
Nil source-derived tutorial todo titles and labelled local note fixtures, seed
4421 and reference 2026-10-04T14:30:00Z. A distinct message-action story uses the
same primitive with sparse IDs, long labels and a disabled action. Effects are
local diagnostic counters, with no network/backend/real records. This is a
behavior specimen, not the full Nil recreation reserved for CW-20261010-0093.

Focused hook tests cover configurable timing, movement boundary, release custody,
source/access/activation replacement, old gesture cancellation and StrictMode /
Activity retirement. Browser specs cover actual Chromium mouse hold/cancellation,
keyboard actions/layers/focus and edge bounds at 1280 and 390×420, plus Chromium
CDP touch emulation. Synthetic composition and fixture popup setup are explicitly
labelled; neither native OS IME nor physical touchscreen hardware is claimed.

Focus is requested on opening and deliberate menu navigation. Position and viewport
commits preserve a newer foreground focus owner. A backdrop close requires the exact
admitted primary press: its captured frame, source, activation and target must still be
current at release. Prevented, competing and retired releases cannot close a replacement
menu.
