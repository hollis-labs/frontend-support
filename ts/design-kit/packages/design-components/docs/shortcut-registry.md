# Shortcut Registry & Layered Escape Stack (CW-20261010-0090)

## Overview

This specification implements the keyboard interaction and focus architecture defined in the Nil Behavior Spec (`docs/nil-behavior-spec.md`) and confirmed under owner direction **DEC-079** (`01a123ff-1a7d-7f2d-88b0-72f56e6dead6` / `01a123ff-25bc-7dad-8380-e31a32092c02`).

The architecture establishes:
1. **Centralized LIFO Layered Escape Stack (`useLayeredEscape`)**:
   - The innermost (topmost active) overlay owns the Escape key.
   - **Input-clearing before closing contract**: if focus is inside a clearable search or filter input, Escape clears the input first and consumes the event (`stopPropagation()`, `stopImmediatePropagation()`, `preventDefault()`), preventing accidental dismissal of the containing modal or background queries. Subsequent Escape dismisses the overlay.
   - Background queries and page state are strictly preserved when dismissing an overlay.
   - Priority cannot override activation order without an explicit nested scope contract.
   - Committed render/unmount callback fences (`live()`) prevent stale callback execution.
2. **Focus Return Resolver (`restoreAdmittedFocus` / `resolveAdmittedFocusTarget`)**:
   - Focus is restored to the triggering opener only if it is currently connected in the DOM, not disabled, and admitted by caller source projection (e.g. record still present).
   - If disconnected or stale, focus falls back to an explicit caller fallback anchor.
3. **Double-Shift Detection Hook (`useShiftShift`)**:
   - Detects two consecutive `Shift` key presses within a configurable threshold (default `300ms` per DEC-079).
   - Modifier-aware: suppressed when `metaKey`, `ctrlKey`, or `altKey` are held.
   - Suppressed in editable targets (`input`, `textarea`, `select`, `contenteditable`, and ARIA text/combobox roles).
   - Suppressed during active IME composition (`isComposing` or `keyCode === 229`).
   - Window blur or any non-Shift key immediately resets the tap window.
   - Suspended when an active modal overlay owns keyboard focus.
   - Supports deterministic monotonic clock injection (`getTime`) for test reproducibility without `Date.now()`.
4. **Scoped Shortcut Registry (`useShortcut`) & Quick Search (`useQuickSearchShortcut`)**:
   - `useShortcut` enforces exact modifier matching (requiring all declared modifiers and forbidding undeclared modifiers).
   - Suspends background (Tier 4) shortcuts while active overlays are open in the stack.
   - `useQuickSearchShortcut` binds `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) as primary and `Shift-Shift` as alias to a unified `onOpen` callback.
5. **Shared Admission Guards (`keyboard-guards.ts`)**:
   - Extracted Parallax Torque guards applied to `SearchInput` (`/`-to-focus with IME, modifier, overlay, and editable target checks).
   - Legacy `useArrowNav` remains published and unchanged by default.

## Caller scopes and retained handles

`useShortcut`, `useShiftShift`, and `useQuickSearchShortcut` accept caller-owned
`sourceGeneration`, `accessible`, `isAdmitted`, and optional `scopeElement`.
The scope is a connected element (or resolver); events outside it are refused.
Admission and source transport remain application policy. Each exposed handle
belongs to one committed render and subscription activation. Retain a handle for
negative controls only: any subsequent commit, access change, source replacement,
effect replay, or unmount retires it. Native listeners refresh to the current
committed options without retiring the registration on stable-prop rerenders.

`useLayeredEscape` accepts `rootElement` and `isLayerAdmitted` separately from
focus-return `isAdmitted`. Register the popup root, not the surrounding page.
Visible nested or portal popups defer parent Escape; the event target cannot
promote a background layer ahead of the active inner layer. `handleEscape` refuses
an invocation on a non-topmost layer. Caller focus fallback must be explicit.

For Base UI controlled dialogs, cancel its independent Escape dismissal and allow
propagation, so child controls and the single native bubble stack settle the event:

```tsx
onOpenChange={(open, details) => {
  if (details.reason === 'escape-key') {
    details.cancel()
    details.allowPropagation()
    return
  }
  if (!open) closeCurrentInspection()
}}
```

Do not install a capture keydown listener. Input and widget handlers must be able
to consume Escape before it reaches the window stack. The stack consumes handled
native events immediately; `onClearInput` must return true only when it actually
clears the current focused input.

`SearchInput` keeps legacy debounced clear-and-blur and slash behavior by default.
`layeredEscape` opts into immediate consumed clearing, composition/overlay guards,
and exact slash modifiers. `retainFocusOnClear` retains focus after non-empty
clearing. Existing consumers need not adopt either option.

Shift timing uses `null` for no pending tap: clock zero is a legitimate origin.
Non-finite clocks reset the window; a backwards clock establishes a new first tap.
Source/access changes, non-Shift keys, modifiers, touchstart, blur and suppressed
ownership reset pending taps. Native composition lifetime also fences manual
triggers. Synthetic composition diagnostics do not prove hardware OS IME behavior.
