# kit-cards verification

State: **implemented and machine-checked. Not reviewed, not approved.** Passing tests below do not establish that the
cards look right; the visual review is a separate step by a person. Rendered evidence (screenshots) is attached to the
Torque task, not committed here.

## Commands (from `ts/design-kit`, packages built)

```sh
npm run build && npm run typecheck && npm run lint && npm run test:run
npm run e2e -w @hollis-labs/kit-cards      # builds the production gallery, then Playwright
```

In a fresh sandbox the matrix needs `npx playwright install chromium`, matching the installed `@playwright/test` version.

`npm run lint` in kit-cards applies `designConfig({ severity: 'error' })`. A deliberate `text-[13px]`, a hex literal, a
raw palette class and an invented token (`bg-bg-surface`) each failed lint, then were removed.

## Matrix

74 fixtures (card x state, plus registry states) x {1280, 390} x {light, dark} = 296 screenshots, 0 assertion failures.
Card kinds: approval (medium and high risk), choice, review, form, confirmation, prompt x {pending, submitting,
resolved, canceled, expired, superseded, stale, failed, needs-elevation}; error, status, group, stepper; registry:
resolved, unknown-kind, version-skew, quarantined, agent-restricted, renderer-threw.

Computed-style assertions (read from the browser, compared with probe elements using the token class):

- no document horizontal scroll at 390 and 1280
- envelope radius equals `rounded-panel`; envelope background equals `bg-elevated`
- title colour equals `text-fg`; title size equals `text-sm`
- body control text computes to 13px and `text-control` resolves to 13px
- at 390, the stale notice's action sits under its text (full width), not beside it
- at 390, every visible button, text input, select and textarea is at least 44px tall

The first run of the 44px check failed for ConfirmationCard, PromptCard and the high-risk phrase field (28-32px); they
were fixed (`max-sm:min-h-11`) and the matrix re-run clean.

## Keyboard / assistive-technology pass (Playwright)

Nothing focused on load; Tab order is Approve, Deny, Dismiss; medium risk asks before answering; high risk is gated by
the typed phrase and the destructive action is never focused; radios move with arrow keys; a failed form submit focuses
the `role="alert"` summary and its links focus the control; the secret input is `type="password"`; stale shows an alert and a
reachable reload; answering moves focus to the `role="status"` receipt (only when focus was dropped) and leaves no
enabled control; a card that mounts terminal does not take focus; no running animation under reduced motion.

## Not covered here

- Tray, toast and modal **components**. The engine decides surfaces; mounting them waits for a real store and route.
  "Focus return from a modal" is therefore untested.
- A screen reader was not run. `role="status"` / `role="alert"` and focus behaviour are asserted, announcement is not.
- Golden payloads and per-state fixtures exist for the new and answerable cards; the pre-existing Info, Metric, Progress,
  Timeline, Diff, Artifact, Document, Table and List cards have none yet.
- Prompt, List and Table do not yet take the full shared state props (stale, elevation); Confirmation and Prompt do.

## Consumers (built against packed candidates, not the registry)

Parallax (typecheck and production build) and Tachyon (typecheck, production build, full frontend test suite) were built
against tarballs of this branch's kit-chat 0.6.0, kit-cards, design-components, design-tokens and design-bindings, with
`@hollis-labs/kit-cards/source.css` imported. The unmodified registry design-components 0.5.0 lacks `InputCombobox`, which
kit-chat already needs, so Parallax cannot build against registry components regardless of this change.
