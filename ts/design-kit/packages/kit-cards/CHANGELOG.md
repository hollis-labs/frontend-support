# @hollis-labs/kit-cards

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
