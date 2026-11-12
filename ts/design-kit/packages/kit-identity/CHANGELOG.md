# @hollis-labs/kit-identity

## Unreleased

First version (`0.1.0`), CW-20261112-0080.

- `IdentityGate`, `SetupScreen`, `SignInScreen`, `BootScreen`, `AuthLayout`.
- Pages: `AccountSecurityPage`, `ApiKeysPage`, `PairingCodesPage`, `SessionsPage`, `SignOutPage`, `SignOutButton`.
- `IDENTITY_ROUTES` and `IDENTITY_PAGES`.
- `@hollis-labs/kit-identity/client`: `createIdentityClient`, `IdentityProvider`, `useIdentity`, `IdentityError`.
- Errors render as a danger `Callout` (token colour, icon, border, `role="alert"`).
- One term, "Access keys", across nav, page, dialog and button (via `kit-account` `labels`); a failed create is announced inside the dialog.
- Sessions show a short device label ("Chrome on Linux", else "Unknown device", raw User-Agent in a tooltip) and relative times.
- Offline first-run setup: when `GET /api/setup` reports `setup_over_http: false` (or `POST /api/setup` answers 403 `setup_offline`) the gate shows `SetupOfflineScreen` (plain "No owner yet", the `<app> identity setup` instruction, no form, no retry). `IdentityGate` takes `appName`. `IdentityClient.setupRequired()` became `setupState()` (`{required, overHttp}`); an absent `setup_over_http` is read as true. New status `setup-offline`, new `showSetupOffline`.
- Design follow-ups: Revoke and Sign out use the outline button; pairing disclosure says "expires in N minutes (at HH:MM)"; the account header no longer repeats the username when it equals the display name; setup copy reads "This screen only appears the first time."; a flat error body's `error` string is shown when there is no `message`.
- Built and run against a real Basalisk (Substrate identity module); differences from the written contract are listed in the README.
