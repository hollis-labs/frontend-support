# Optional dialog sizing and controlled search

CW-20261010-0092 implements the reviewed Nil directions and DEC-079 defaults.
The public package remains at 0.4.0; local Parallax specimen packs are source
artifacts, not a release. No live Nil adoption is included.

`DialogContent`, `AlertDialogContent`, `SheetContent`, `DetailDialog`, `FormDialog`,
`ConfirmDialog`, `InspectionDialog`, `CommandDialog`, `JsonModal` and
`OverlaySidebar` accept `DialogOptions`. Native Base UI modality, trap, dismissal,
controlled/uncontrolled open state and cancellation remain in the primitive.
Omitting the options preserves existing sizing and focus defaults, including the
450px bounded Detail/Form/Confirm geometry. Inspection already exposed native
popup initial/final focus; that contract remains available.

```tsx
<DetailDialog open={open} onClose={close} title="Record"
  showFullscreenToggle initialFocus={editorRef}
  returnFocus={{ trigger: () => currentRow(), isAdmitted: currentAdmission,
    fallbackTarget: () => anchorRef.current, isFallbackAdmitted: anchorAdmission }}>
  {body}
</DetailDialog>
```

`showFullscreenToggle` opts into the control. Internal fullscreen state resets to
bounded on each opening. `fullscreenSessionKey` opts into sessionStorage using
exact `true`/`false` values; malformed/denied storage reads are bounded and denied
writes do not prevent the toggle. `fullscreen` with `onFullscreenChange` is a
controlled override: the caller owns resetting it, and a storage preference never
overrides the controlled value. No localStorage or hidden archetype key exists.
Toggle changes dimensions of the same popup and body nodes. Pointer activation
retains editor focus/selection; keyboard activation retains focus on the toggle. Captured toggle callbacks also
require the exact current connected popup to own admission: nested/competing
portals veto, with only current registered lower roots and this layer's explicit
owned results exempted. React object/callback refs and callback cleanup compose
with this internal popup reference.

`initialFocus` and `finalFocus` keep native Base UI types and behavior. Explicit
`returnFocus` takes precedence over `finalFocus`; omit it to preserve native
finalFocus. Its `FocusReturnOptions` requires current source admission from the
caller when returning to a record. The existing resolver rejects disconnected,
disabled, hidden, inert and aria-hidden targets, and validates the explicit
fallback too. The return is resolved in a microtask after primitive cleanup
releases aria-hidden. Only the matching committed closed frame and activation
may perform it. A newer render, Activity retirement, ordinary unmount, or a newly
active sibling overlay vetoes queued work. A newer plain foreground focus owner
also vetoes return; a closing popup's own focus and document body remain eligible
for the admitted return. Admission is read when returning,
never cached as a target before close. OverlaySidebar's legacy `focusReturn`
remains its existing path when new `returnFocus` is omitted; native `finalFocus`
can also be explicitly supplied. AppShell resize/retirement policy is unchanged.

## SearchPalette

The host controls `open`, `query`, `options`, filter selection, source generation,
access and actions. Results require unique stable IDs. Input owns DOM focus and
ARIA 1.2 combobox semantics; Up/Down moves aria-activedescendant, Enter invokes
`onSelect`, and disabled results are skipped. The static radio strip precedes the
sole results scroll region. Tab enters the selected filter; Left/Right cycles it.

The existing layered Escape stack clears a nonempty focused query first, then
closes. Composition vetoes clearing, navigation and primitive Escape dismissal,
while normal input updates remain editable. Only this layer's explicitly linked
contained results listbox is owned; other listboxes, menus and nested dialogs
retain the existing outer-layer veto. Native dismissal uses cancellation details
when admission fails.

`onSearch(query, sourceGeneration)` is an optional debounced notification. Each
committed frame retires prior callbacks and timers; open/access/source/layer
admission is checked again at dispatch. It does not fetch. A host starting async
work must reject stale results against its own current source/request identity.
The default delay is 150ms, configurable via `debounceMs`.

**Implementation proposals, routed to PM, not owner-confirmed:** palette arrows
stop at boundaries, filter radios wrap, debounce defaults to 150ms. The reviewed
spec does not assign these palette defaults. No Alt+number shortcut or alternate
Inbox Space policy is inferred as accepted.

## Mode controls and navigation

`CycleModeToggle` cycles the caller's N-state ordered `modes`. The name preserves
existing appearance `ModeToggle`. `SearchAddToggle` explicitly toggles Search and
Quick Add, retaining +project/@context syntax as host-owned input text.
`onSecondaryAction` is a Shift+F10 keyboard seam. Caller-supplied pointer handlers
may implement long-press and must suppress the following click; no duplicate hold
timer is shipped. The 0091 hook can be integrated after actual main landing.

Lists use Up/Down, inspection records use the landed
`useControlledRecordNavigation` Left/Right contract, and boards use 2D axes with
dialog ownership taking precedence. The Parallax workbench contains isolated
Nil and Torque specimens, not the 0093 recreation. All actions are local inert
intent; fixtures use seed 4421 and reference time 2026-10-04T14:30:00Z.

Synthetic composition/pointer tests establish forwarding and state admission.
Hardware IME and physical touch acceptance are not claimed.
