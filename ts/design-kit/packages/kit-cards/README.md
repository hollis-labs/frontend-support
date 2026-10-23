# @hollis-labs/kit-cards

The card kit: the **Envelope** chassis, the card shapes that compose on it, the answerable cards (Approval,
Choice, Review, Form-from-schema, plus the existing Confirmation and Prompt), a **headless lifecycle engine**, and a
**renderer registry**. Props down, outcomes up.

> **Private, version 0.0.0.** The repository never publishes; the owner does.

## Boundaries (what this package will never do)

- It never fetches, sends or subscribes, and **never builds a wire response**. A card reports a `CardOutcome`; the host
  owns the wire kind, payload binding, routing, mutations, approval policy, state and persistence (go-envelopes owns the
  wire).
- It ships **no default binding rows**. A card is a *shape*, not a wire kind.
- The engine takes **rules as data** and a **host clock**; no wire kinds live inside it.
- **Server state is authoritative.** Nothing here infers expiry from a clock; `expired` and `superseded` arrive as the
  recorded status, like `submitted`.

## Consumer setup — two lines, and they are not optional

```css
@import "@hollis-labs/design-components/source.css";
@import "@hollis-labs/kit-cards/source.css";
```

(after `@import "tailwindcss"` and the design-tokens stylesheet, per `docs/adopter-path.md`). Tailwind v4 emits a utility
only for a class string it has seen and does not scan `node_modules`, so without the second line the cards render
mostly unstyled and **nothing errors**. Every consumer imports it — including consumers of `@hollis-labs/kit-chat`,
which re-exports these cards (kit-chat's own `source.css` imports it too, so an existing adopter keeps working).

Checked in a fresh production build (`npm run demo:build`): with the import the stylesheet contains
`max-sm:min-h-11`, `bg-danger-muted` and `accent-primary`; with the import deleted, none of the three is generated.

## The set

| Export | What it is | Existing thing examined first |
| --- | --- | --- |
| `Envelope*` | the one chassis (moved from kit-chat) | — |
| `ConfirmationCard`, `PromptCard`, `ListCard`, `TableCard` | answerable shapes (moved) | — |
| `ApprovalCard` | risk class, what changes, who asked, digest, expiry; typed phrase for `high` | `ConfirmationCard` — same outcome seam, but approvals add contract a confirmation lacks |
| `ChoiceCard` | single / multi / other | `PromptCard` (text only), `ListCard` (data rows) |
| `ReviewCard` | answerable before/after: approve, request changes (with note), reject | `DiffCard` (read-only, own chassis) |
| `FormCard` | form from a JSON-Schema subset, secret by reference | `kit-settings` field layer (private, flat, dirty/save-coupled — **not wrapped**) |
| `ErrorCard`, `StatusBanner` | terminal failure; one-line banner | `Callout` (banner is a thin wrapper; `Callout` is `role="alert"` for every tone) |
| `GroupCard`, `StepperCard` | presentation-only grouping / sequence | `Tabs`, `CollapsibleSection` |
| `ResolvedFooter`, `CardNotice`, `useAnswerable` | the **one receipt slot** and shared state | the per-card copies in Confirmation/Prompt |
| `Stack`, `Row`, `Section`, `Field`, `ActionBar` | the closed layout set | — |
| `CardMiss`, `CardBoundary` | unknown kind / version skew / throwing renderer never draw blank | — |
| `@hollis-labs/kit-cards/registry`: `createCardRegistry`, `CardSlot` | `register(kind, version, component, schema)` and the slot that draws a resolution | `design-bindings` (see below) |
| `@hollis-labs/kit-cards/engine` | headless lifecycle engine | — |

"Input/Text (fast path)" is `PromptCard`; it was not duplicated. "Result/Receipt" is **not a card kind**: it is the
shared `ResolvedFooter` slot every answerable card uses once it is terminal.

## States

Every answerable card renders: **pending, submitting, resolved, canceled, expired, superseded, stale (409), failed,
needs-elevation (read-only + CTA slot)**, and unknown-kind via `CardSlot`. `partial` is absent on the emit side
(`CardOutcome` cannot express it) and still *read* as open. Terminal cards have no actionable control and carry a
`role="status"` receipt; when the person resolves a card, focus moves to the receipt only if it was dropped by the
button that just unmounted.

Stale keeps the person's input. Needs-elevation hides the actions and shows the host's CTA. A missing or unrecognised
approval `risk` is treated as the most restrictive: read-only, with the elevation notice.

## Form schema subset

Supported: an object schema with `properties`/`required`; `type` string | number | integer | boolean | array of enum;
`title`, `description`, `default`, `enum`, `minimum`, `maximum`, `minLength`, `maxLength`, `pattern`, `format`
(`date`, `textarea`, `secret`), `writeOnly`, `readOnly`. `secret` is reserved: masked, never echoed or put in a
receipt, delivered through the host's `storeSecret` by reference (`{ ref }`) — and disabled, visibly, with no handler.
Anything else (`$ref`, `oneOf`, nested objects, unknown formats, …) is a **visible fallback** text/JSON field that names
the keyword; it is never silently dropped.

## Lifecycle engine

`createCardEngine({ rules, now, store? })`. Rules are data: `match` (kind/source/risk/blocking, with trailing-`*`
prefix), `surface`, `dedupeBy`, `supersedes`, `ttlMs`, `actions`, `escalateBlocking`. A toast never holds the only copy of
an answerable card (it gets a durable `home`); dedupe/supersede never reorder and, while a card is being edited, the
replacement is held and the card shows `updatedAvailable` until the host calls `applyPending`. `describeExpiry` returns
the absolute time and a countdown only in the final minute.

## Renderer registry and trust

Import it from `@hollis-labs/kit-cards/registry`. It is a separate entry because it loads `design-bindings` at runtime (that package publishes TypeScript source as its `main`); the root entry never does, so an adopter that only draws cards is unaffected.


`design-bindings` deliberately has no `register()` (its header: no global registry, zero runtime dependencies, a binding
is host-local by construction), so the registry here is an **instance** a host creates — no module state — that reuses
design-bindings' `MissCode`, `RendererClass`, `TrustClass` and trust profiles. Trust is *requested* by the registration
and *granted* by the host's `grantTrust` (default: refuse everything); a refused claim resolves to a `quarantined`
miss and is never downgraded; agent-originated content may only use a renderer whose granted class has no ambient host
authority. A duplicate `(kind, version)` throws rather than being chosen by call order.

## Promotion rule

Promote a card into this package when **two or more apps** use it, and ship it with (1) a golden example payload
(`fixtures/golden/*.json`), (2) a fixture per state (`fixtures/cases.tsx`), and (3) token-only styling. An app's
one-off card composes from the primitives and contributes back.

## Design rules

`npm run lint` applies `designConfig({ severity: 'error' })` from `@hollis-labs/eslint-config-design`: no raw colour,
no arbitrary scale, no raw palette, no undefined token — zero findings, no baseline, no exemption file. No idiom prefix is
claimed (contract tokens only); a token the contract lacks goes through token-contract §9.3.

## Scripts

`build`, `typecheck`, `lint`, `test:run`, `demo:build` (production gallery), `e2e` (Playwright matrix + keyboard pass,
see `docs/verification.md`).
