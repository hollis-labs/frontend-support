# @hollis-labs/design-components

## Unreleased — CW-20261010-0092

- Add optional fullscreen chrome, reset-on-open sizing, session persistence and admitted `returnFocus` to public modal wrappers, preserving native focus and legacy defaults.
- Add controlled `SearchPalette` with input-owned result cursor, static radio filters, layered clear/close Escape, composition safety and fenced debounce notifications.
- Add `CycleModeToggle` and `SearchAddToggle`; preserve the appearance `ModeToggle` API and provide a caller-owned secondary action seam.
- Scope Escape composite ownership to an explicitly declared current overlay; unrelated overlays keep their veto.
- Add Nil and Torque isolated specimen coverage; no release, live app migration or native hardware IME/touch claim.

- Fullscreen dispatch verifies its exact current popup ownership; admitted return also preserves a newer plain foreground focus owner. Forwarded React callback-ref cleanup is retained.

## Unreleased — CW-20261010-0091

- Add `useLongPress`: configurable deliberate holds (1000ms, 8px defaults), pointer/scroll/lifetime cancellation, exact gesture release-click custody, and non-revivable committed-frame/source/access/activation admission. Touch scrolling remains native.
- Add controlled `RadialMenu`: fixed-angle token-scaled actions, nested back/close, disabled actions, viewport clamping, keyboard rotary/Tab navigation, layered Escape and admitted focus return. Nil and a distinct message idiom are evidenced in isolated Parallax stories. No version or publication change.

## Unreleased — CW-20261010-0072

- Add optional `AppShell` aside slot (`aside?: ReactNode`, `asideWidth?: AsideWidth`, `asideCollapsed?: boolean`, `onAsideCollapsedChange?: (collapsed: boolean) => void`).
- Preset widths: `compact` (w-80 / 20rem), `regular` (w-96 / 24rem, default), and `wide` (w-112 / 28rem).
- Desktop layout reserves zero space/sliver when `asideCollapsed: true`.
- Responsive fallback to `OverlaySidebar` below the 1024px (`lg`) breakpoint.
- Pinned header and footer; independent aside and body scrolling.
- Admitted connected focus return on desktop collapse/resize and narrow close, including custom triggers and explicit fallback admission. Optional `OverlaySidebar.focusReturn` delegates return resolution to Sheet after dismissal; default callers retain Sheet behavior.
- Zero breaking changes: existing no-aside `AppShell` behavior and markup are preserved.

## Unreleased — CW-20261010-0090

- Add `useLayeredEscape`: centralized LIFO Escape stack, innermost overlay owns
  keys, input-clearing before closing contract, background query/state preservation,
  and admitted focus return with connection, disability, and caller admission guards.
- Add `useShiftShift`: 300ms double-tap window per DEC-079 Nil specification,
  modifier-aware, suppressed in editable targets and during IME composition (isComposing
  or keyCode 229), reset on non-Shift key or window blur, and injectable monotonic clock
  for deterministic test fixtures.
- Add `useShortcut`: scoped keyboard shortcut hook with exact modifier matching
  and active overlay suspension.
- Add `useQuickSearchShortcut`: composite hook binding Cmd+K (macOS) / Ctrl+K
  (Windows/Linux) as primary and Shift-Shift as alias.
- Add shared admission guards (`isEditableTarget`, `isInteractiveTarget`, `isComposingEvent`,
  `matchExactModifiers`, `hasActiveModalOverlay`) and focus return resolver (`restoreAdmittedFocus`).
- Add opt-in `SearchInput.layeredEscape` for immediate consumed Escape clearing and
  guarded slash focus; legacy debounce/blur/slash behavior remains the default.
- Fence exposed handles by committed frame and non-revivable activation lease while
  refreshing native listeners. Add caller source/access/admission and DOM scopes,
  composition lifetime guards, nested popup ownership and zero-origin Shift timing.
  Keep Escape coordination attached while portalled roots connect; closed popups
  release ownership during their exit animation. Legacy `useArrowNav` remains unchanged.

## Unreleased — CW-20261010-0036

- Add `useControlledRecordNavigation` with caller-admitted opaque IDs, explicit
  wrap/stop boundaries, discoverable-control availability, popup bubble/composition
  ownership and committed-render/unmount callback fences. Source transport,
  admission, routing and focus remain caller-owned; legacy `useArrowNav` retains
  its window-listener API. Local candidate only; release version/publication is
  reserved for the separate owner release window.

## 0.5.0 — 2026-10-10

Add controlled record navigation, shortcut/layer admission, layered Escape, long press/RadialMenu, SearchPalette/CycleModeToggle and dialog fullscreen/focus options; fix AppShell overlay resize focus custody. Upgrade the six core packages together; ^0.4.0 excludes this minor.


## Unreleased — CW-20261010-0092

- Add optional fullscreen chrome, reset-on-open sizing, session persistence and admitted `returnFocus` to public modal wrappers, preserving native focus and legacy defaults.
- Add controlled `SearchPalette` with input-owned result cursor, static radio filters, layered clear/close Escape, composition safety and fenced debounce notifications.
- Add `CycleModeToggle` and `SearchAddToggle`; preserve the appearance `ModeToggle` API and provide a caller-owned secondary action seam.
- Scope Escape composite ownership to an explicitly declared current overlay; unrelated overlays keep their veto.
- Add Nil and Torque isolated specimen coverage; no release, live app migration or native hardware IME/touch claim.

- Fullscreen dispatch verifies its exact current popup ownership; admitted return also preserves a newer plain foreground focus owner. Forwarded React callback-ref cleanup is retained.

## Unreleased — CW-20261010-0091

- Add `useLongPress`: configurable deliberate holds (1000ms, 8px defaults), pointer/scroll/lifetime cancellation, exact gesture release-click custody, and non-revivable committed-frame/source/access/activation admission. Touch scrolling remains native.
- Add controlled `RadialMenu`: fixed-angle token-scaled actions, nested back/close, disabled actions, viewport clamping, keyboard rotary/Tab navigation, layered Escape and admitted focus return. Nil and a distinct message idiom are evidenced in isolated Parallax stories. No version or publication change.

## Unreleased — CW-20261010-0072

- Add optional `AppShell` aside slot (`aside?: ReactNode`, `asideWidth?: AsideWidth`, `asideCollapsed?: boolean`, `onAsideCollapsedChange?: (collapsed: boolean) => void`).
- Preset widths: `compact` (w-80 / 20rem), `regular` (w-96 / 24rem, default), and `wide` (w-112 / 28rem).
- Desktop layout reserves zero space/sliver when `asideCollapsed: true`.
- Responsive fallback to `OverlaySidebar` below the 1024px (`lg`) breakpoint.
- Pinned header and footer; independent aside and body scrolling.
- Admitted connected focus return on desktop collapse/resize and narrow close, including custom triggers and explicit fallback admission. Optional `OverlaySidebar.focusReturn` delegates return resolution to Sheet after dismissal; default callers retain Sheet behavior.
- Zero breaking changes: existing no-aside `AppShell` behavior and markup are preserved.

## Unreleased — CW-20261010-0090

- Add `useLayeredEscape`: centralized LIFO Escape stack, innermost overlay owns
  keys, input-clearing before closing contract, background query/state preservation,
  and admitted focus return with connection, disability, and caller admission guards.
- Add `useShiftShift`: 300ms double-tap window per DEC-079 Nil specification,
  modifier-aware, suppressed in editable targets and during IME composition (isComposing
  or keyCode 229), reset on non-Shift key or window blur, and injectable monotonic clock
  for deterministic test fixtures.
- Add `useShortcut`: scoped keyboard shortcut hook with exact modifier matching
  and active overlay suspension.
- Add `useQuickSearchShortcut`: composite hook binding Cmd+K (macOS) / Ctrl+K
  (Windows/Linux) as primary and Shift-Shift as alias.
- Add shared admission guards (`isEditableTarget`, `isInteractiveTarget`, `isComposingEvent`,
  `matchExactModifiers`, `hasActiveModalOverlay`) and focus return resolver (`restoreAdmittedFocus`).
- Add opt-in `SearchInput.layeredEscape` for immediate consumed Escape clearing and
  guarded slash focus; legacy debounce/blur/slash behavior remains the default.
- Fence exposed handles by committed frame and non-revivable activation lease while
  refreshing native listeners. Add caller source/access/admission and DOM scopes,
  composition lifetime guards, nested popup ownership and zero-origin Shift timing.
  Keep Escape coordination attached while portalled roots connect; closed popups
  release ownership during their exit animation. Legacy `useArrowNav` remains unchanged.

## Unreleased — CW-20261010-0036

- Add `useControlledRecordNavigation` with caller-admitted opaque IDs, explicit
  wrap/stop boundaries, discoverable-control availability, popup bubble/composition
  ownership and committed-render/unmount callback fences. Source transport,
  admission, routing and focus remain caller-owned; legacy `useArrowNav` retains
  its window-listener API. Local candidate only; release version/publication is
  reserved for the separate owner release window.

## 0.4.0 — 2026-10-02

- Use full-strength focus rings, including destructive and invalid controls,
  with design-tokens' stronger `ring` values (CW-20261002-0091). Destructive
  Buttons now use the focus token instead of a tinted danger ring; fills,
  pointer hover and feedback borders retain their existing roles. Native
  text-field click focus strengthens too; no modality tracking is introduced.

- Correct shadcn MIT attribution for the 23 earlier ui primitives inherited
  through sysop-ui: verified file-level provenance, source headers and package
  LICENSE scope. Comments/docs/notice only (CW-20261002-0053).

- Add shared `useControllableState({ value, defaultValue, onChange })` with a stable
  setter, functional updates and change-only callbacks (CW-20261002-0052).

ButtonGroup, Collapsible and HoverCard are added in `0.4.0`; registry `0.3.0`
does not contain these primitives. Requires design-tokens `^0.4.0`.

- Add `HoverCard`/trigger/content on Base UI PreviewCard with trigger delays,
  positioning, render composition and token styling. Preview content remains
  supplementary and hidden from screen-reader navigation by default; interactive
  consumers may opt into accessible content with `aria-hidden={false}` (CW-20261002-0043).

- Reuse existing `Callout` for alerts; no redundant `Alert` port added.

- Add MIT shadcn `ButtonGroup`, text and separator ports: independent control
  grouping, vertical/horizontal layouts, Base UI render composition and token radius.
- Add `Collapsible`/trigger/content on Base UI, retaining host-controlled and
  uncontrolled open state, disabled behavior and render composition.
- Append the shadcn MIT notice to the package LICENSE with the first primitive
  source ports; this changes the shipped tarball attribution (CW-20261002-0043).

- Document AI Elements source provenance, origin-specific MIT/Apache-2.0 attribution,
  port checklist and upstream-version inventory (CW-20261002-0043).

## 0.3.0 — 2026-10-02

Co-released with the other core packages (design-tokens, design-app-runtime, kit-dashboard,
kit-chat, eslint-config-design), alongside the first releases of kit-settings and kit-observe.
Requires `@hollis-labs/design-tokens` `^0.3.0`.

**Behaviour change to know before upgrading: small controls are squarer.**

- Register contract radius tokens in `cn()`'s existing radius groups. Named
  `rounded-control`/`rounded-panel` now replace competing steps in argument order,
  including modified/corner utilities. Known steps and explicit token-variable
  overrides continue to work.
- **Visible rendering change:** ungrouped Button `xs`, `sm`, `icon-xs` and
  `icon-sm`, plus caller control overrides, change from accidental 8px (contract
  CSS) or 9px (dashboard theme) to the intended 6px. Existing panel-only surfaces
  and kit-settings' token-variable workaround are unchanged. This includes
  kit-observe retry/copy actions, kit-chat card actions and composer Send/Stop.
  Option A approved 2026-10-02; [computed evidence](https://github.com/hollis-labs/design-kit/blob/main/packages/design-components/docs/radius-aliases.md).
- No release here. Ship in the next design-components **minor**, with internal
  dependency ranges raised together. Kit-chat uses the shared `cn()` after #48.

## 0.2.0 — 2026-10-01

Co-released with design-tokens, design-app-runtime, eslint-config-design, kit-chat and
kit-dashboard. Requires `@hollis-labs/design-tokens` `^0.2.0`.

**Appearance controls (CW-20261001-0498).** New controlled `ModeToggle` and `ThemePicker`.
The host owns the preference and its persistence; pair them with `createThemeStore` /
`useTheme` from design-app-runtime, or any store of your own. `ThemePicker` is a native
select, so keyboard and screen-reader behaviour needs no provider.

**`OverlaySidebar` (CW-20261001-0501).** A controlled modal sidebar composed from `Sheet`,
with pinned host header and footer around a scrolling body. Focus containment, Escape and
backdrop dismissal come from Base UI; the host owns open state, navigation and content. It
holds no layout store and no viewport breakpoint. See
[source reconciliation](docs/overlay-sidebar.md).

**Visible change in dark mode.** The outline and destructive `Button` variants no longer
carry dark-only background and border overrides (`dark:bg-input/30`,
`dark:border-input`, `dark:hover:bg-input/50`, `dark:bg-destructive/20`,
`dark:hover:bg-destructive/30`); they follow the active mode's tokens instead. The
destructive focus ring keeps its dark override.

**Install requirement (CW-20260912-0097).** `tailwindcss: ^4.0.0` is now a **required** peer
for styled components. npm 7+ installs it when it is missing, and an incompatible
installed major (for example Tailwind 3) now fails peer resolution instead of installing
silently unstyled. The automatic install does not configure your CSS build: keep the
explicit app dependency and the stylesheet imports described in the README.

## 0.1.1 — 2026-10-01

**Fix: `cn()` no longer drops the contract's font-size tokens.** The published `0.1.0`
merged class names with plain `tailwind-merge`, which does not know `text-micro`,
`text-caption`, `text-label` or `text-control` are font sizes and files them with the
text *colours*. Merging one beside a colour class therefore silently removed one of the
two. Two visible results: a `size="sm"` primary `Button` rendered `text-control` and lost
`text-primary-foreground` (near-white on near-white, unreadable), and `Pill` lost its
`text-caption` / `text-label` and inherited the body size.

`cn()` now registers the font-size group from `@hollis-labs/design-tokens`'
`TEXT_TOKENS`, so it follows the contract instead of a hand-typed list. A colour and a
size now survive independently, in either order and under responsive variants, and an
explicit `className` override of either still wins. No API change, nothing to migrate.
Needs `@hollis-labs/design-tokens` `^0.1.0`, which is already a dependency, so no other
package has to be released with it.

Found by Tachyon's design-kit migration (CW-20261001-0521). Covered by a regression
suite that renders every `Button` variant at every size and every `Pill` tone, plus
`Input`, `Checkbox`, `PopoverTrigger` and `Callout`.

## 0.1.0 — 2026-09-11

First release, alongside the five other packages in this repo. The set shares a
version number; the release record for all of it is the repo's
[`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

**The idiom-free base** — 23 shadcn primitives on Base UI plus 21 components, every
one naming tokens from `@hollis-labs/design-tokens` and never a value. Extracted from
`libs/sysop-ui` against one test: *would `kit-chat` take this unchanged?*

**Read the README's first section before installing.** One `@import` line stands
between a styled component and an unstyled one, and leaving it out produces no error.

Fixed here on the way to release, both silent, both found by building a consumer
rather than by reading the code:

- **`ui/sonner.tsx` had never been themed, in either tree.** It named
  `var(--popover)`, `var(--popover-foreground)` and `var(--border)`, none of which
  were ever declared, so sonner fell back to its own defaults and the toast simply
  rendered wrong. Repaired to name contract tokens through sonner's own theming
  surface.
- **`useCopy` threw synchronously outside a secure context**, escaping the click
  handler and aborting React's dispatch for that event, while its own doc comment
  promised failures were swallowed. Guarded, and the comment corrected.

This package also now ships the two `data-*` custom variants and the one utility its
class strings name (`data-horizontal`, `data-vertical`, `no-scrollbar`) inside
`source.css`. They used to arrive via `shadcn/tailwind.css` from a sibling package's
theme, which is why nothing failed inside this repo and everything would have failed
outside it.

- Bounded Form/Detail/Inspection dialogs now contain body scroll and keep their
  outer viewport stationary. FormDialog adds a styling seam and blocks dismissal
  while submitting. Added an editable InputCombobox built on Base UI.
