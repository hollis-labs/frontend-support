# GenUI

`@hollis-labs/genui` renders complete, reviewed declarative surfaces and coordinates host-owned actions. It is experimental; `0.1.0` is on npm, and each release is the owner's step. It supports `approval`, `form`, and `list_detail`; it does not execute publisher code or load remote components.

The wire contract is owned by [Substrate GenUI](https://github.com/hollis-labs/substrate/tree/main/genui). The copied schema, catalog and fixtures live in `contract/`; `contract/provenance.json` records the exact source commit and hashes. TypeScript wire aliases and standalone validators are generated mechanically from that schema. Validation does not compile schemas or require unsafe-eval in the browser. One `genuiBinding` declaration integrates with the existing `@hollis-labs/design-bindings` owner; hosts still decide isolation and admission.

## Integrate

```tsx
import { GenuiController, GenuiSurface, type GenuiTransport } from '@hollis-labs/genui'

// Implement this adapter in the authenticated host, with registered operations,
// current policy, durable action records, and the canonical GenUI protocol.
declare const transport: GenuiTransport
declare const validatedTransportBytes: string

const controller = new GenuiController(validatedTransportBytes, transport)
const view = <GenuiSurface controller={controller} />
```

Keep one controller for the life of a mounted surface and dispose it on unmount. Disposal aborts the view's requests; it does **not** cancel an operation in the host. To reconnect, obtain a current envelope and call `recover(actionId)` on a new controller before enabling a pending action. Durable pending-action discovery belongs to the host, not browser storage. A controller's local busy guard is presentation behavior, not an idempotency guarantee across windows or processes.

The injected transport has three operations:

- `submit(rawCall, signal)` returns a raw canonical `AgentFunctionResponse` correlated to that call's fresh `functionCallId`.
- `recover({ surfaceId, actionId, functionCallId }, signal)` performs a host read, returning `{ response, request? }`. `response` is a canonical response correlated to the read. Optional `request` is the exact original canonical call retained by the host, not a newly inferred input. This is a local adapter shape; it adds no canonical wire fields. For the host HTTP object wrapper, use `parseRecovery(rawBody, functionCallId)` before ordinary JSON parsing so duplicate keys and unsupported numeric lexemes cannot be lost. A recovered request must omit confirmation proof; proof-bearing recovery evidence refuses. Without that call, recovered confirmation can be displayed but cannot be resubmitted. Shared action IDs must never select the first offered choice by guesswork.
- `confirm({ surfaceId, actionId, functionCallId, call, challenge }, signal)` runs the real host confirmation flow and returns an opaque host-issued proof. The controller attaches it to the original action ID and unchanged input, then submits with a fresh transport invocation ID. Host verification determines its authority and expiry. The browser cannot mint a grant.

The host authenticates and resolves subjects, operation registrations, revision basis, current grants and risk. Responses such as `accepted`, `needs_confirmation`, `stale`, unknown future statuses, and protocol/transport errors do not become optimistic success. The UI never automatically re-executes after uncertainty. `Check host status` only reads. A new review is required for stale inputs; terminal conflict never becomes a new operation.

## Reviewed patterns

- **Approval:** title, summary, before/after fields and exact offered choices. Each click uses that choice's complete `genui_action` and input, including mutually exclusive choices sharing an intent ID.
- **Form:** labeled text, multiline text, boolean and safe-integer fields with inline errors and focus on the first invalid field. It submits the complete typed draft as `input.draft`, preserving immutable base input. The host validates it and creates a new review; submission does not directly apply a mutation.
- **List/detail:** shared shell `SplitPane` and `ListRow`, including keyboard resize and narrow-layout back navigation. `onSelect(id)` asks the host for a new validated surface; `onSelect('')` requests the list view. The browser does not invent detail or issue an action on selection.

Loading, empty, error, stale, conflict and expired views remain visible. Errors and unknown states have persistent accessible status text. All content is rendered as text, with no HTML injection, function attributes, arbitrary component names, URLs or host-region claims.

## Placement and focus

`SurfaceFrame` reuses the design kit's controlled dialog, sheet and popover primitives, plus inline, fullscreen and toast presentation. The **host** selects placement, atomically reserves its existing shell stack, and controls dismissal. `GenuiPresentationHost` describes that admission seam. Reuse the shell's maximum depth and focus restoration; only a host-approved confirmation may nest above another overlay. Do not enforce atomic admission by reading a stale React `entries` snapshot. The package creates no competing overlay manager.

Pass `returnFocus` for a modal or drawer without a kit trigger. Escape and dismiss hide the surface and return focus; they never claim cancellation. Inline validation and uncertain outcomes must not be shown only in a transient toast. The envelope's presentation hint is advisory and does not select the host's placement.

## Validation

Input must be a complete atomic envelope with exactly one reviewed root. Progressive or partial component streams are refused. Raw JSON is checked **before** JavaScript number conversion: duplicate keys, invalid UTF-8/Unicode, negative zero, fractions, exponents and integers outside ±9,007,199,254,740,991 refuse. Limits match the canonical profile: surface 256 KiB, action/response 64 KiB, depth 32, collections 256, UTF-8 string values 16 KiB and object keys 256 bytes. Schema validation and pattern semantics follow that pass. Unknown future statuses remain unresolved; malformed known statuses and retired `partial` refuse.

Local immutable snapshots provide rendering consistency, not authority. No local digest, arbitrary idempotency key, session credential, current-role cache or optimistic outcome substitutes for host evidence. Credentials and endpoints belong in the injected host adapter, never the envelope or this package.

## Develop

From `ts/design-kit`:

```sh
npm ci
npm run build --workspace @hollis-labs/design-tokens
npm run typecheck --workspace @hollis-labs/genui
npm run lint --workspace @hollis-labs/genui
npm run test:run --workspace @hollis-labs/genui
```

Tests exercise canonical shared fixtures, strict parsing, exact form serialization, confirmation/recovery, uncertain states, accessible errors, modal focus/dismissal and semantic markup goldens for all three patterns. They use a synthetic transport only for package-level behavior; they do not claim an authenticated application integration.

Refresh the bundle only from a reviewed canonical source commit:

```sh
node scripts/import-contract.mjs <canonical-genui-directory> <exact-source-commit>
```

Review the schema/fixture diff and generated types together. Publication, host policy wiring, application deployment, production confirmation and durable action storage remain outside this package.
