# @hollis-labs/kit-identity

Setup, sign-in, password, API-key, pairing-code and active-session screens for apps built on the Substrate identity module,
plus the small typed client that talks to it. Presentational screens are controlled and fetch nothing; the client and
`IdentityProvider` are in a separate entry, `@hollis-labs/kit-identity/client`.
Builds on [`@hollis-labs/kit-account`](../kit-account) (`ApiTokenManager`, `NewTokenDisclosure`, `SignInRequired`,
`SessionExpired`, `WhoamiBadge`). Publishing is the owner's step; until the kit is in the Substrate BOM, pin the exact tag.

## Use

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";
@import "@hollis-labs/kit-account/source.css";
@import "@hollis-labs/kit-identity/source.css";
```

```tsx
import { IdentityProvider } from '@hollis-labs/kit-identity/client'
import { IdentityGate, IDENTITY_ROUTES, IDENTITY_PAGES } from '@hollis-labs/kit-identity'

<IdentityProvider>
  <IdentityGate story={<Logo />} appName="myapp">{/* the app shell, mounted only when signed in */}</IdentityGate>
</IdentityProvider>
```

`IdentityGate` takes `appName` (the host command name shown on the no-owner screen; it reads `<app>` if omitted). It renders boot, first-run setup (or, when the server creates the owner on the host only, a plain no-owner screen) and sign-in outside the shell (no route, no nav item) and mounts its children
only after a session exists. `IDENTITY_ROUTES` is the in-shell route table (`/identity/account`, `/identity/keys`,
`/identity/pairing`, `/identity/sessions`, fallback `/identity/sign-out`) with labels and the capability each nav item
requires (`{app}.admin` for keys and pairing); `IDENTITY_PAGES` maps the same ids to page components. Contribute the
sessions item only once a pinned version ships it. Sign out is an action: put `SignOutButton` in the user menu, or use
`SignOutPage` where the shell has no slot.

## Contract (the client owns it; apps do not redo it)

- Paths default to `/api/setup`, `/api/login`, `/api/logout`, `/api/password` and
  `/api/identity/{profile,keys,pairing-codes,sessions}`; override with `baseUrl`, `identityBase` and `paths` (`paths.profile`
  defaults to `<identityBase>/profile`).
- On boot, once no setup is needed, the provider reads `GET /api/identity/profile`: 200 fills `profile`, `scopes` and the
  badge (also after a reload), 401 is signed out. A host without the route (404, or 403 `route_not_mapped`) falls back to
  the `GET /api/identity/sessions` probe: the session is known, the profile is not, and the badge is "Identity unavailable".
- Every non-2xx body is flat `{code, message, details?}` and becomes an `IdentityError`. The UI shows `message` only; a
  missing or unreadable body shows "The request could not be completed."
- Every request sends `X-Requested-With: XMLHttpRequest` and `credentials: 'same-origin'`. The session cookie is HttpOnly;
  the kit never sees it.
- `401 invalid_login` is a credential error and stays on its form (including a wrong current password on
  `PUT /api/password`). Any other 401 means the session ended: the provider moves to the sign-in screen with the
  "Session expired" state.
- A 403 on keys, pairing codes or sessions renders `SignInRequired reason="denied"` with no create control.
- One-time values (key, pairing code) live only in component state and are cleared on dismiss, unmount and session change.
  They never reach storage, URL, logs or errors.
- `useIdentity()` exposes `status`, `profile`, `scopes`, `badge` (for `WhoamiBadge`; `assurance` is `local` unless the
  server says `verified`) and the actions.

## Known gaps in the server (as run against Basalisk)

- Older identity modules have no `GET /api/identity/profile` (`403 route_not_mapped`). Against those the profile and
  scopes are known only after setup or sign-in; after a reload `profile` and `scopes` are `null`, the badge is
  "Identity unavailable", and the Pairing page can only learn it is denied from the server's 403.
- There is no scope catalogue. The scope picker offers the caller's own scopes, the host's `scopeSuggestions`, and
  free-text entry.
- Pairing codes have no list or revoke route, so that page is an explanation and one action.
- An empty key list is `{"keys":null}`, and revoked keys disappear from the list. Status therefore comes from `expires_at`
  alone (active / expiring within 7 days / expired).
- Key wording comes from `kit-account`'s `ApiTokenManager` `labels` prop (and a failed create shows in the dialog through
  `createError`), so `@hollis-labs/kit-account` with those props must be released before this package.
