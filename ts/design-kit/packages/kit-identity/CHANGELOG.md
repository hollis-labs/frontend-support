# @hollis-labs/kit-identity

## 0.1.2 (CW-20261113-0029)

- Fix (accessibility): after a failed sign-in, keyboard focus moves to the announced error. Before, the form was disabled
  while the request ran and focus fell to the page body. `FormMessage` takes `focus`; `SignInScreen` sets it.

## 0.1.1 (CW-20261113-0023)

- Fix: after a page reload the provider had no profile, so `useIdentity()` gave `profile` and `scopes` as `null` and the
  badge read "Identity unavailable". On boot it now reads `GET /api/identity/profile` (new `IdentityPaths.profile`,
  default `<identityBase>/profile`; new `IdentityClient.readProfile()`, `null` on 401). 200 fills profile, scopes and
  badge; 401 is signed out (not "Session expired"). A host without the route (404 or 403 `route_not_mapped`) keeps the
  0.1.0 behaviour through the `/api/identity/sessions` probe.

## 0.1.0

First version, CW-20261112-0080.

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
