# @hollis-labs/kit-account

## Unreleased — private 0.0.0

- Add controlled `ApiTokenManager` with host-advertised scopes/capabilities and
  confirmed revoke, separate one-time `NewTokenDisclosure`, and provider-driven
  `ConnectedAccounts`. Keep transport, request state, outcomes and secret disposal
  host-owned; unknown states offer no action. Record packed access-flow proof.

- Add controlled `AccountProfile`, host-rendered `AccountPreferences`, and
  `WhoamiBadge` with explicit local/verified identity assurance.
- Establish Tailwind v4/source registration, externalized builds/declarations,
  behavior tests and packed browser verification. No manifest wiring or transport.
