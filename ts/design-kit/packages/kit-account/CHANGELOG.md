# @hollis-labs/kit-account

## 0.2.0

Breaking for `ApiTokenManager` and `NewTokenDisclosure` consumers (pre-1.0 minor); no compatibility shim.

- `ApiTokenRecord` gains `createdAt`, `expiresAt?`, `lastUsedAt?` (ISO 8601) and `revokeDeniedReason?`. The row's second line
  reads "scopes · Created 12 days ago · Used 2h ago" (or "Never used"). Unparseable dates render as unknown.
- `status` is the closed set `active | expiring | revoked | expired` (`API_TOKEN_STATUSES`). Any other value renders as
  "Unknown" with no action and is never echoed. Only `active` and `expiring` tokens can be revoked.
- `ApiTokenDraft` gains `expiry` (`30d | 90d | 1y | never`; `API_TOKEN_EXPIRIES`). `EMPTY_API_TOKEN_DRAFT` defaults to 90 days;
  no expiry is allowed but labelled discouraged.
- Creation moves into a dialog (`createOpen` / `onCreateOpenChange`, controlled like the revoke target); focus returns to the
  trigger on close. The header carries "Create token".
- Permission-denied states: `canCreate` false keeps a disabled Create button with `createDeniedReason` (default text);
  `canRevoke` false keeps a disabled Revoke button with the record's `revokeDeniedReason` (default text). Reasons are linked
  with `aria-describedby`.
- `NewTokenDisclosure` is now a dialog ("Copy your key now", Copy and Done); the copy confirmation is announced through a
  polite live region and the value is never announced. The revoke dialog follows the k-revoke golden wording.
- New optional `now` prop (epoch ms) for deterministic relative dates.

## Unreleased — private 0.0.0

- Add controlled `ApiTokenManager` with host-advertised scopes/capabilities and
  confirmed revoke, separate one-time `NewTokenDisclosure`, and provider-driven
  `ConnectedAccounts`. Keep transport, request state, outcomes and secret disposal
  host-owned; unknown states offer no action. Record packed access-flow proof.

- Add controlled `AccountProfile`, host-rendered `AccountPreferences`, and
  `WhoamiBadge` with explicit local/verified identity assurance.
- Establish Tailwind v4/source registration, externalized builds/declarations,
  behavior tests and packed browser verification. No manifest wiring or transport.
