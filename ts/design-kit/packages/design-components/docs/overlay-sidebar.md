# Overlay sidebar

CW-20261001-0501 extracts the sidebar's reusable presentation as a composition
of the existing `Sheet`, not a second drawer primitive. It is idiom-free:
navigation, session selection, settings, and plugin content are host slots.

```tsx
<OverlaySidebar open={open} onOpenChange={setOpen}
  trigger={<Button variant="outline">Open navigation</Button>}
  title="Navigation" description="Choose a view"
  header={<WorkspacePicker />} footer={<ProfileActions />}>
  <SessionList onSelect={(id) => { select(id); setOpen(false) }} />
</OverlaySidebar>
```

`side` is `left` by default, or `right`. The header and footer stay pinned while
the body scrolls. The title names the dialog. Base UI handles focus containment,
Escape, outside dismissal and returning focus to the supplied trigger. The host
controls `open`, decides when selection closes it, and chooses when a viewport
needs an overlay. No stores, queries, breakpoints or app routing are imported.
Use the normal token and `design-components/source.css` imports.

## Source reconciliation

Read-only inventory on 2026-10-01: Nanite at
`227852e5e92090cbf7f05cc4b5eebb6dbff84104`, Flux at
`232064c3a5eaa8e8d9e270d89d78df3ca81df231`.

Both current `components/chat/LeftRail.tsx` and `components/RightRailV2.tsx`
sit inline beside chat, shrinking their width when closed. They are **not modal
overlays**. Their reusable pinned header/scroll-body/footer layout informs this
composition; their session trees, widget registries, drag state, stores and API
calls stay in the apps. This fulfills the requested overlay surface without
claiming the reference apps already use it.

The existing `AppShell.nav` remains appropriate for a persistent rail. A modal
overlay uses `Sheet`, so it does not shrink the main content column. This small
base PR is separate from kit-chat's card inventory/extraction; it adds no card
chassis or chat-specific exports.

Styles name contract tokens and named spacing/type steps. The existing Sheet
backdrop follows the contract's current scrim exception; no new color or scale
values or idiom tokens are introduced.

## Verification

All five workspace checks passed, including the built-package design-rules gate
at zero violations. Two new interaction tests cover host slots, dismissal and
focus return. A packed-consumer Chromium check verified left/1280px and
right/280px layouts: the body scrolled, footer stayed visible, type computed to
13px, and the narrow panel stayed within the viewport. Focus containment, Escape
with focus return, host selection, Close and desktop backdrop dismissal passed
without page errors. See `receipts/sidebar-browser.json`. Reference apps were
read-only; adoption and card extraction belong to the separate kit-chat change.
