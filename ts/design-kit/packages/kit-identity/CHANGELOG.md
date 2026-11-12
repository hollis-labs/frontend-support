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
- Built and run against a real Basalisk (Substrate identity module); differences from the written contract are listed in the README.
