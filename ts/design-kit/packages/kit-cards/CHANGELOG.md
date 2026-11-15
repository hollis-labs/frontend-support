# @hollis-labs/kit-cards

## 0.3.1 (CW-20261115-0031)

Additive; every new prop is optional and off by default, so existing cards render and behave as before. Published as a
patch so the `^0.3.0` ranges in kit-chat keep resolving.

- `ApprovalCard` and `ChoiceCard`: `undoMs` (hold the answer with an Undo button, then respond; unmount cancels),
  `shortcuts` (keys act while focus is inside the card; Approval: Y approves, N denies; Choice: 1-9 pick an option;
  Cmd/Ctrl+Z undoes a held answer), `recommended` (id of the action/option to tag "Recommended"), `fallbackHref` and
  `fallbackLabel` (a link beside the actions for a card that cannot be decided inline).
- `ApprovalCard` only: `note` (optional or `{ required }`; sent as `decisions[0].note`), `rememberChoice` ("Always in
  this chat"; sends `data.remember: true`), `mediumRiskConfirm={false}` (one click on medium risk instead of a second
  confirmation; combine with `undoMs`).
- `FormCard`: `idempotencyKey` (passed to `storeSecret` as its third argument, `{ idempotencyKey }`), and `secrets`, a
  per-field map of `SecretFieldOptions`: `allowFile`, `maxBytes` (clear message for a typed value or file over the
  limit), `multiline` (masked textarea), `fingerprint` + `onReplace` (shows the fingerprint and Replace instead of the
  value; nothing is submitted for the field until it is replaced).
- Not in this release: the typed "access needed, input kept" state (the existing `elevation` and `stale` states already
  keep input), and `note`/`rememberChoice` on `ChoiceCard`.

## 0.3.0 (CW-20261113-0024)

- Dependency range only, no source change: `@hollis-labs/design-bindings` `^0.2.0` → `^0.3.0`, the contract app-shell
  0.11.0 uses, so an app installs one binding contract. design-bindings 0.3.0 is additive over 0.2.0. No
  `design-app-runtime` dependency; the package works beside design-app-runtime 0.6.

## 0.2.0 — BREAKING (CW-20261105-0004)

- Follows design-bindings 0.2.0 (`^0.2.0`): the registry speaks isolation, not trust classes.
  `requestedTrust` → `requestedIsolation`, `grantedTrust` → `grantedIsolation`, `grantTrust` →
  `grantIsolation`, `GrantRequest.requestedIsolation`. Default request is `main-origin` (was
  `portfolio-trusted`). `Origin` is now the design-bindings type, re-exported. No aliases.

## Unreleased (0.0.0, private)

- New package. The card set, the `CardOutcome` / `CardResponder` response seam and `classifyPriorResponse` moved here
  from `@hollis-labs/kit-chat`, which re-exports every name unchanged (kit-chat 0.6.0).
- New: `ApprovalCard`, `ChoiceCard`, `ReviewCard`, `FormCard` (JSON-Schema subset, secret by reference), `ErrorCard`,
  `StatusBanner`, `GroupCard`, `StepperCard`, the layout set, `ResolvedFooter`/`CardNotice`/`useAnswerable`, the
  headless engine (`/engine`), and `createCardRegistry` + `CardSlot`.
- `classifyPriorResponse` classifies `expired` and `superseded` as terminal states.
- `ConfirmationCard` and `PromptCard` gain the shared state props (`busy`, `stale`, `onReload`, `elevation`, `receipt`,
  `supersededBy`) and a terminal receipt.
- Escalation: the Designer's brief placed `register(kind, version, component, schema)` in `design-bindings`. That
  package's contract forbids a registry or `register()`; the registry is an instance in this package instead.
