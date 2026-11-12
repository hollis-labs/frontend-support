# @hollis-labs/kit-settings

Controlled, grouped forms for the approved [admin manifest scalar profile](../../docs/admin-manifest-contract.md). No fetching, transport, persistence or wire-type registry. Hosts project the manifest's `settings` array into `SettingsRenderer`; observations belong to kit-observe.

## Install

```sh
npm install @hollis-labs/kit-settings @hollis-labs/design-components @hollis-labs/design-tokens
```

`design-components` and `design-tokens` are dependencies; install them directly as well so your
own CSS imports (below) resolve under strict package managers. Required peers: `react` and
`react-dom` 19, `tailwindcss` 4, and `@base-ui/react` and `lucide-react` (used by the base
primitives). npm 7+ installs a missing required peer, but your CSS build still needs the imports
shown under *Consumer CSS*.

```tsx
import { SettingsRenderer } from '@hollis-labs/kit-settings'

<SettingsRenderer
  contractVersion={manifest.contract_version}
  groups={manifest.settings}
  states={states}
  onDraftChange={(groupId, draft) => replaceHostDraft(groupId, draft)}
  onSave={(groupId, changes) => submitThroughHost(groupId, changes)}
  onValidate={(groupId, changes) => validateThroughHost(groupId, changes)}
  onReset={(groupId, keys) => resetThroughHost(groupId, keys)}
/>
```

`states[groupId]` contains a host-owned `values` snapshot projection, `draft`, optional `busy`, sanitized `validation`, `error` and `notice`. Missing state shows a waiting message. Only the host changes values, reports success or clears drafts. `SettingsGroupForm` renders a single already-version-checked group. `fieldExtra` and `groupFooter` slots also support the opt-in provenance renderer below.

A field draft is `{kind: 'value', value}` for typed scalars, `{kind: 'text', text}` for numeric editing, or `{kind: 'unset'}` for explicit override removal. Save emits `{set, unset}` **intent**, with no revision, endpoint or ETag. Untouched fields are omitted; equal nonsecret values do not enter `set`. False, zero and empty string retain their types. Defaults are annotations and never initialize controls. Native selects map options to typed enum members. Incomplete numeric text stays in the draft and blocks save; finite numbers and safe integers are supported. Unicode string length counts code points. `format` is an annotation, not a validator.

“Discard changes” clears the draft through the host callback. “Remove override” stages an explicit unset only when `can_reset`, effective editability and `has_override` allow it. It never clears an inherited/default/env/file value. The host resolves and validates the resulting fallback; the renderer cannot infer it from schema defaults. Removal takes effect only after the host accepts a save and supplies a new snapshot. An optional `onReset(groupId, keys)` offers the explicit reset command for staged removals alone, including reset-only capabilities; mixed edits go through update. There is no reset-all action.

Secret snapshots contain only `present`, matching `secret_present`, effective editability and override presence. Replacement inputs start blank with safe presence text. Untouched means keep; typing then clearing is a deliberate empty replacement (allowed only by the schema); removal is explicit. A secret snapshot containing `value` makes the group unavailable without displaying that value. The kit keeps no secret state or storage. The host must clear transient secret drafts on success, discard, unmount and context changes; never put drafts in URLs, persistent storage, logs or unsanitized errors.

Unsupported contract versions prevent all settings rendering and writes. Unsupported schema assertions, nested/nullable schemas, invalid field declarations or contradictory permissions make only that group unavailable. Snapshot permissions may restrict editing but cannot grant it beyond the manifest. Locked fields retain their value and explanatory reason, have disabled inputs and no mutation actions. Guards also protect callbacks from forged drafts and programmatic submission. Local validation provides feedback; **backend validation is mandatory** and updates must revalidate atomically regardless of an earlier validate result.

The host owns manifest validation/discovery (including endpoint/capability consistency), authentication, authorization, revision context, strong ETags/If-Match, transport, persistence, and backend validation. Reconcile 409/412 with a fresh manifest and snapshot without automatically overwriting drafts. After uncertain network outcomes, reread rather than retrying automatically. Never report an optimistic saved state. `SettingsValidation` is a presentation projection for sanitized JSON-pointer errors, not a replacement wire definition. Callers of exported `evaluateSettings` must first inspect the group, validate the snapshot, and respect its returned errors.

## Consumer CSS

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";
@import "@hollis-labs/kit-settings/source.css";
```

All appearance names existing tokens. React 19, Tailwind 4 and base primitives are peers. Workspace typechecking reads sibling source; declaration builds use package names and require built siblings.

## Demo and checks

From the repository root, build dependencies with `npm run build`, then `npm run demo -w @hollis-labs/kit-settings` or `npm run demo:build -w @hollis-labs/kit-settings`. The demo imports both authored example manifests directly and supplies explicit illustrative snapshots, with local host callbacks and an optional rejected-save scenario. It makes no live app calls. Its secret mock stores presence only.

Tests exercise supported/unsupported schema behavior, validation, permissions, controlled callbacks, secret keep/replace/remove and accessible error associations. See [browser evidence](docs/verification.md) for the desktop/narrow computed-style, keyboard and read-only negative checks. No app integration or backend restart semantics are part of this package; the host owns both.

## Provenance and explicit apply / restart

Use `SettingsProvenanceRenderer` instead of `SettingsRenderer` to opt into the full read metadata. It composes the same forms via their field/footer slots; the original forms remain usable with scalar snapshot projections.

```tsx
<SettingsProvenanceRenderer
  contractVersion={manifest.contract_version}
  groups={manifest.settings}
  states={statesWithMetadata}
  onDraftChange={replaceHostDraft}
  onSave={submitThroughHost}
  onReset={resetThroughHost}
  onApply={(groupId, targets) => applyThroughHost(groupId, targets)}
/>
```

Each value supplies `source: {kind, label}` iff present and `apply_state: 'active' | 'pending_restart' | 'unknown'`. Absent values have no source. Source kinds are `default`, `env`, `file` and `override`; labels must be safe plain text. Secrets show the same source/presence/apply metadata with a blank replacement control, never a stored value. A missing/unknown source, unknown apply state or contradictory restart declaration makes that group unavailable with an explanation. The renderer does not substitute default provenance or treat unknown as active.

Declarations supply `restart_required` and `apply_target`. The field shows the restart-required indicator independently of snapshot apply state. Existing “Remove override” staging is the reset affordance: override provenance explains that the host resolves the fallback, which may be env/file/inherited rather than default. No second resolver or new reset behavior is introduced.

Each group state may additionally supply `apply: {restartRequired, applyTargets}`, `applying` and sanitized `applyError`. This is an explicit **host-owned reconciled presentation projection**, not a wire type. The host obtains it from current backend state/update/reset responses and establishes it for initial loads. Conservative backend restarts can involve fields with no declared target; the component never derives targets from declarations, invents targets or calls a helper implicitly.

When restart is required and targets are nonempty unique IDs, an explicit “Apply / restart” button calls `onApply(groupId, targets)` only; busy/applying disables it. Empty/missing targets explain that the app did not say what to restart and offer no action. Invalid projections offer no action. Missing callbacks explain that the host has not provided an apply action. Projection and per-field state are displayed independently: disagreement remains visible instead of being reconciled in the kit.

The kit holds no restart state, fetches nothing and performs no restart. Calling apply cannot clear `pending_restart`; neither can showing an error. Only host-supplied verified snapshots/projections change the displayed state. The host must reread after failed/uncertain apply and preserve pending status until the backend verifies application, including across no-op saves. Draft/secret lifecycle remains host-owned. Live screen-reader speech and real app/backend apply behavior have not been verified here.

## Controlled setup wizard (package only)

`SettingsWizard` uses the same settings groups, snapshot/draft projections and `inspectSettingsGroup` / `evaluateSettings` validation. It adds no manifest fields. Ordering is static and schema-derived: one step per group, stable required-group-first partition, required fields first inside each group, then review. Manifest order/property order remain stable within each partition. Dynamic completion comes from current snapshots + drafts and never reshuffles steps. Read-only settings render labeled text context, not inputs; secret replacements follow the existing write-only rules.

```tsx
<SettingsWizard
  contractVersion={manifest.contract_version}
  groups={manifest.settings}
  states={states}
  step={hostStep}
  onStepChange={setHostStep}
  onDraftChange={replaceHostDraft}
  checks={hostCheckResults}
  onCheck={requestHostCheck}
  results={hostSaveResults}
  onComplete={submitOrderedGroupIntents}
/>
```

`step` is zero-based, with `groups.length` selecting review. The host owns step and drafts; resume is supplying those props again. The kit has no storage, timers, completion flags or automatic navigation. Persist only nonsecret state through a host-approved policy; transient secret drafts must never enter persistent storage or URLs. Context/schema changes require host reconciliation of the step and drafts.

Checks are presentation results per group (one group per step): `{status: 'idle' | 'running' | 'ok' | 'failed', message?, blocking}`. A missing report shows “Not reported”; idle shows “Not checked.” Only an explicit host `ok` shows OK. A host-required (`blocking: true`) check requires OK before Next/final submit; optional failed/running checks do not block. Unsupported check status/flags fail closed. `onCheck(groupId)` requests work from the host, which owns networking, authorization, stale-result invalidation and cancellation. No connectivity endpoint or fetch exists in the kit. Check/save messages must be sanitized plain text and must never contain supplied secret values.

Final `onComplete(plan)` emits one ordered array of `{groupId, changes}` in step order, containing only groups with nonempty evaluated changes. Each `changes` is the existing `SettingsChanges` shape. An empty array is valid when no writes are needed. This is a local intent, **not a multi-group wire request or an atomic transaction**. Backend validation, per-group revisions/If-Match, authorization and partial failures remain host-owned.

Review redacts secrets as “will be replaced” and shows host outcomes per group: `{status: 'saving' | 'saved' | 'failed', message?}`. Missing results show “Not reported,” never “Saved.” Neither failed nor saved reports mutate drafts in the kit. The host updates snapshots and clears drafts for accepted groups; a later explicit user submit naturally sends the remaining evaluated groups. Saving/busy disables submission. There is no automatic retry or overwrite after conflict; the host rereads/reconciles 409/412 and supplies fresh props. A resumed review step still checks every group's local validation and required checks before allowing submit.

A custom host presentation plan is deferred until a real consumer needs different grouping. The host can already select which groups it passes. No Tachyon onboarding/app code is included. The demo renders both authored manifests with explicitly simulated host connectivity/save outcomes, partial failure, and a host-controlled resume action. See [wizard verification](docs/wizard-verification.md); live screen-reader speech and real backend/network behavior are outside this verification.
