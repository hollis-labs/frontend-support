# kit-account audit (K1.1 checklist)

Audited at 0.2.0 (`ApiTokenManager`, `NewTokenDisclosure`, `ConnectedAccounts`, `AccountProfile`,
`AccountPreferences`, `WhoamiBadge`). CW-20261112-0021, 2026-11-12. K1.1 was written for a `kit-user` package that
does not exist; the same six checks are applied here to kit-account. K1.3 (scope for a `kit-auth`) is folded in at the
end. The SF-7 PR2 components (`SignInRequired`, `SessionExpired`, `StepUpDialog`, PR #25) were not on main when this was
run and are **not covered**; audit them with this checklist when they land.

Method: source read of every component, the 27 jsdom behavior tests, `build`, `typecheck`, `lint`, `test:run`. The
Playwright harness (`docs/access-browser.mjs`) needs an isolated consumer and was not run; narrow-layout and contrast
results below are from class/markup review, not measured pixels.

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | Token contract | Pass with notes | No hex, px or `[..px]` values in `src/`. Colour, radius and type use contract names (`text-fg-muted`, `rounded-panel`, `text-control`, `text-caption`). `[overflow-wrap:anywhere]` is a behaviour property, not a scale value. The expiry `<select>` is hand-styled (`h-9 rounded-control border-border ...`) instead of a design-components control (F3). |
| 2 | Themes / contrast | Not measured | The package names tokens only; palettes live in design-tokens and design-components. Status colour is never the sole signal: Pill text always carries the state ("Active", "Expiring", "Verified"). Danger and warning text (`text-danger`, `text-warning`) on `bg-bg-elevated` was not contrast-measured per theme (F4). |
| 3 | Keyboard / focus | Pass | Dialogs come from design-components `FormDialog`, `ConfirmDialog`, `DetailDialog` (Esc, trap, labelled). Focus returns to the Create trigger on close (tested). Denied actions stay as disabled buttons, so the control order does not shift. Native checkboxes and select. |
| 4 | ARIA | Pass after fix | Sections are `aria-labelledby` with `aria-busy`; errors are `role=alert`; loading and copy confirmation are `role=status`; denied reasons are linked with `aria-describedby`; per-row Revoke has a name. **Fixed:** `WhoamiBadge` put `aria-label` on a role-less `div` (not reliably exposed); it is now `role="group"`. |
| 5 | Empty / loading / error | Pass after fix | Loading suppresses the empty text (tested). **Fixed:** with a load `error` and no rows, "No API tokens." / "No connected-account providers." printed beside the error and read as a confirmed empty list; both are now suppressed (tested). Unknown token status renders "Unknown" and never echoes the raw value. |
| 6 | Narrow (390px) | Pass by review | Rows stack (`flex-col`, `sm:flex-row`), long names wrap, connected-account buttons wrap. The harness asserts no horizontal overflow at 1280 and 390 but is stale (F1). |

## Fixed in place
- `WhoamiBadge` accessible group (above).
- Empty-state text hidden while an error is shown, in `ApiTokenManager` and `ConnectedAccounts`, with a test.
- CHANGELOG: the "Unreleased, private 0.0.0" section is now the 0.1.0 entry; Unreleased holds this PR's changes.
- README: removed "Private 0.0.0, not published"; the draft shape now lists `expiry`; test count no longer hard-coded.

## Follow-ups (larger, not done here)
- **F1** `docs/access-browser.mjs` and `demo/access.tsx` predate 0.2.0. The harness looks for a "Save your new token" region, a "Copy token" button and "I have saved this token"; the component is now a "Copy your key now" dialog with "Copy" and "Done", and creation is in a dialog. Re-run and update the harness in an isolated consumer, then refresh the receipts and screenshots.
- **F2** `ConnectedAccounts` prints the raw `status` string for unknown values (a test pins this), while `ApiTokenManager` renders "Unknown" and never echoes. Decide on one rule; the closed-set approach is safer.
- **F3** Replace the native expiry `<select>` with a design-components select once one is available, or add the missing token step.
- **F4** Measure contrast for `text-danger`, `text-warning` and `text-fg-muted` on `bg-bg-elevated` in each theme.
- **F5** Add a screenshot-based narrow check for the 0.2.0 dialogs (create, revoke, reveal).

## K1.3 (scope kit-auth) folded in
K1.3 asks what a kit-auth should hold: sign-in, session expiry, step-up and consent, device and session list, error and
lockout states, API token UI, permission-denied and capability-gated states. Against current state:
- Already in kit-account: API token management (0.2.0, with denied states), one-time reveal, connected accounts, whoami.
- In flight: sign-in required / session expired and step-up dialog (SF-7 PR2, #25).
- Not built, not recommended as a new package: device/session list and lockout states. No backend contract exists for
  them (Hadron has one-time-link login and in-memory sessions only). Treat as a future kit-account addition when a host
  needs them.
- UI threat notes that still apply: copy that cannot be spoofed by host-supplied text (instruction text is a slot, not
  markup from untrusted sources); confirmation for destructive and step-up actions (revoke dialog today); secrets are
  never rendered outside the one-time reveal; sandboxed-frame clickjacking is a host concern (frame-ancestors), not
  solvable in the kit. Security-owner review of these notes is still open.
