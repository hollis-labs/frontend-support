# Admin manifest contract — proposal v1

**Decision checkpoint:** CW-20261001-0503, 2026-10-01. Proposed for Chrispian's
review; this document does not approve implementation or claim any app serves
these endpoints today. It elaborates decision 3 of the accepted Tesseract ADR
`project/design-kit/knowledge/adr:adr_vnext_gui_story`.

The backend declares configuration, supported operations and observation
resources. A generic admin shell renders those declarations with design-kit.
The backend owns resolution, authorization, validation, persistence and apply
behavior. design-kit owns presentation; the eventual wire types and schemas
belong with `go-envelopes`, consistent with the repository's ownership boundary.
This proposal records the wire seam for review, without registering a type or
shipping a schema package, handler, adapter, form or migration.

## 1. Information architecture is part of the contract

| Content | Destination | Behavior |
| --- | --- | --- |
| Editable configuration | Settings | Validate, save, remove overrides when supported |
| Configuration locked by deployment policy or env/file ownership | Settings | Disabled field, source and reason; no write control |
| Computed runtime state, health, current counts | Status | Read-only observation |
| Historical series and troubleshooting details | Diagnostics | Read-only observation |

The distinction is about what the value means, not whether a widget is disabled.
`embedding_mode` is configuration; `embedding_status` is computed state. A locked
listen address is still configuration. Uptime and active sessions are runtime
state. No runtime state goes into a settings schema, and no writable resource
goes into Status/Diagnostics. These rules prevent a generic renderer from
recreating today's mixed settings pages.

Restart is a separate lifecycle action, never an implicit side effect of Save.
Settings may explain pending application and link to the app's authorized
lifecycle workflow; v1 does not declare generic restart/kill/deploy buttons.
Product navigation may coexist with this admin surface but cannot reclassify its
resources. Tachyon's `/api/nav` remains product navigation, not a second authority
over the admin sections.

## 2. Discovery and compatibility

An authenticated `GET /admin/manifest` returns `application/json` with
`Cache-Control: private, no-store`. Its path is conventional; a deployment may
mount the complete admin API below a proxy prefix. All declared endpoint `path`
values are absolute paths relative to that deployment's origin and include its
prefix. Cross-origin URLs, credentials, fragments, traversal and executable UI
code are forbidden. The shell never performs mutations during discovery.

| Field | Required shape and meaning |
| --- | --- |
| `contract_version` | Integer `1`; incompatible changes require a new integer |
| `app` | `{id, label}`; stable machine ID and plain-text display label |
| `revision` | Opaque declaration revision, changed when schema/capabilities/paths change |
| `settings` | Array of configuration groups; empty when none are exposed |
| `health` | Array of health resource declarations; empty when unsupported |
| `stats` | Array of scalar stat declarations; empty when unsupported |
| `series` | Array of historical series declarations; empty when unsupported |
| `diagnostics` | Array of structured read-only diagnostic declarations |

IDs match `^[a-z0-9][a-z0-9_.-]*$` and are unique within their array. Group field
keys follow the same pattern. Labels/descriptions are plain text, never HTML.
Array order is display order. Empty arrays mean unsupported, not healthy/zero.
Unknown optional fields are ignored; unknown versions prevent rendering and
writes with a visible unsupported-contract message. Unknown required semantics
need a new contract version, not an extension a v1 client silently ignores.

Discovery is cheap metadata, not a probe fan-out. Values and observations are
fetched separately. Capability declarations follow Cerberus's split: they tell
the shell what to offer, but each call still authorizes and can fail honestly.
The manifest is filtered for the caller; hiding a control is never authorization.
Use the app's existing auth. Cookie-backed mutations require its CSRF protection;
this proposal adds no public unauthenticated admin surface or new credential flow.

## 3. Settings declaration

Each group requires `id`, `label`, `section: "settings"`, `scope`, `schema`,
`fields`, `resolution`, `capabilities`, and `endpoints`.

`scope` is `{kind, id}`. `kind` is `app`, `plugin`, `project`, or `user`; `id`
identifies the concrete subject (app ID, plugin ID, project ID, or user ID).
No wildcard subject or client-selected identity is implied. The backend checks
access to that subject. A manifest describes the selected authorized context;
changing context fetches a new manifest. Group ID identifies this group within
that context. Multi-level user/project/global inheritance remains backend-owned;
the shell displays provenance, not a second resolver.

### Schema profile

`schema` is an inline JSON Schema with
`$schema: "https://json-schema.org/draft/2020-12/schema"`, `type: "object"`,
`properties`, and `additionalProperties: false`. V1 generic fields are flat
string, boolean, integer or number properties; enums give select controls.
Support `required`, `title`, `description`, `default`, `enum`, `minimum`,
`maximum`, `minLength`, `maxLength`, `pattern`, `readOnly` and `writeOnly`.
No type coercion: `false`, `0`, empty string and JSON null remain distinct.
Null is invalid in this profile; use explicit override removal instead.
Complex arrays/objects, arbitrary extension maps and conditional schemas need
an app-specific editor or a future profile; never fall back to an unchecked form.
No remote `$ref` fetching. An unsupported schema makes that group unavailable
with an explanation while other supported groups remain usable.

`default` is an annotation, not an instruction for the browser to initialize or
persist values. `readOnly`/`writeOnly` are also annotations; the backend must
enforce this contract's mutation and disclosure rules. `format` alone must not
be treated as validation. These distinctions follow the
[JSON Schema validation specification](https://json-schema.org/draft/2020-12/json-schema-validation).
Backend semantic validation (including allowed URL targets) remains mandatory.

`fields` is a map keyed exactly like `schema.properties`. Each entry requires:

| Field | Meaning |
| --- | --- |
| `editable` | Boolean; declaration-level permission to accept an override |
| `secret` | Boolean; disclosure/write protocol below |
| `restart_required` | Boolean; changing this field requires restart of `apply_target` |
| `apply_target` | Stable app or plugin ID when restart is required; otherwise omitted |
| `read_only_reason` | Required nonempty plain text when `editable` is false |

A noneditable property has `readOnly: true`. An editable property must not have
`readOnly: true`. A secret property has `writeOnly: true`, type string, and no
default/examples/enum containing secret material. A nonsecret property must not
have `writeOnly: true`. Conflicting declarations invalidate the group rather
than guessing which flag wins. A snapshot can further restrict editability
for the current source or caller; it can never grant a declaration-denied write.

`capabilities` explicitly contains booleans `can_read`, `can_validate`,
`can_update`, `can_reset`. Each true capability requires its matching endpoint;
false means the endpoint is absent. Writable groups require read and validate.
Noneditable groups have update/reset false. Endpoints have `{method, path}`:
read is GET; validate, update and reset are POST. Explicit commands avoid the
ambiguity of legacy PUT handlers that actually merge partial values.

### Resolution and per-value source

`resolution.precedence` is an array of enabled layers in descending priority,
drawn without duplicates from `override`, `env`, `file`, `default`. Choose the
conventional order `[override, env, file, default]` for new adapters; existing
deployment semantics may retain env above override, declared explicitly.
`resolution.write_layer` is `override` for writable groups and absent otherwise.
This keeps existing resolution honest instead of silently changing what env
means across apps. No layer is created just because the manifest lists it.
Database/keychain UI settings are the override layer; operator-authored startup
files are the file layer, even if an override store itself uses a JSON file.

The read endpoint returns `{group_id, revision, values, validation}` plus a
strong HTTP ETag. `revision` is the manifest revision, not the value ETag.
ETags are opaque revision tokens, never hashes of secrets or secret-bearing
snapshots. Every resolved value or permission change invalidates the ETag;
changes in env/file/default layers must also participate in conflict detection.
`values` maps every declared key to a record:

| Record field | Meaning |
| --- | --- |
| `present` | Boolean; missing required value is representable without a fake null |
| `value` | Resolved desired configuration; present iff nonsecret and `present: true` |
| `source` | Required iff present: `{kind, label}` with kind default/env/file/override |
| `editable` | Effective permission now; cannot exceed declaration permission |
| `read_only_reason` | Required when effective permission is false |
| `has_override` | Boolean; whether removal would affect an existing override |
| `secret_present` | Required for secret fields only; equals `present`; no `value` |
| `apply_state` | `active`, `pending_restart`, or `unknown` |

Source labels are safe descriptions (e.g. env variable name), never values,
credential locators or private filesystem paths. For inherited overrides they
name the safe scope, e.g. "project override". Absent values have no source/value.
`apply_state` says whether the desired value is known to be running. It is
application metadata about the setting, not a dump of runtime state. Active
values, PID, connectivity, and restart progress belong to observation resources.
If the adapter cannot know the running value, report `unknown`; never invent
`active`. Changing a restart-required desired value is `pending_restart` until
the backend verifies the target loaded it. Identical updates are no-ops.

### Validate, update and reset

Validate/update share the request `{revision, set, unset}`. `set` maps keys to
new typed values; `unset` is an array of keys whose overrides are removed.
Require both containers (possibly empty), reject duplicates/intersection and
undeclared/read-only keys. Omission leaves a value alone. `unset` never erases
env/file/default or an ancestor scope's override. Removing a required override
with no valid fallback fails validation. `can_reset: false` prohibits nonempty
`unset` as well as the reset command.

The server resolves the proposed overrides against all other layers and
validates the **complete desired configuration**, including secrets held
privately. It performs cross-field and backend semantic checks. Client checks
are feedback only. Required means present; use minLength/pattern for nonempty
text. No persistence, lifecycle or external write occurs during validate.

Validation returns `{valid, errors}`; each error has `{path, code, message}`.
`path` is a JSON Pointer into the desired configuration (e.g. `/nanite_url`), or
the empty string for a group error. Errors contain no supplied secret values.
Success has `errors: []`; validation failure may have multiple field errors.
Use HTTP 200 for a completed validation, whether valid or invalid.

Update requires `If-Match` with the read ETag, and matching `revision`. It
revalidates and atomically persists the whole group or changes nothing. A
validate response is not a permit to bypass that recheck. Durability and secret
storage are backend responsibilities; an adapter cannot offer `can_update`
unless it can preserve all-or-nothing semantics across its stores.

Reset is an explicit `{revision, keys}` POST with `If-Match`, equivalent to
`set: {}` and `unset: keys`; it removes only the named overrides. No implicit
"reset everything" or automatic restart. Choose validation-preserving reset
over Tachyon's current ability to reset into an invalid configuration because
the generic shell must not make a working config invalid without saying so.
Recovery from already-invalid configuration remains possible by supplying the
missing values in the same update.

Update/reset success is HTTP 200 with `{snapshot, changed_keys,
restart_required, apply_targets}` and a new ETag. `snapshot` is the read shape;
`restart_required` is true iff a changed desired value requires restart, and
`apply_targets` lists the unique affected IDs (empty otherwise). The backend
may conservatively require restart if its apply behavior needs it. A pending
restart is shown until verified, even after a subsequent no-op save.
Saving a live-applied field reports `active` only after successful application;
otherwise report `unknown` and a diagnostic. The UI re-reads after uncertain
network results; it never retries a mutation automatically or optimistically
claims a secret/config save succeeded.

Command failures use `{error: {code, message, errors?}}`: 400 malformed input,
401 unauthenticated, 403 forbidden, 404 unknown group, 409 `manifest_changed`,
412 `value_conflict` for stale ETag, 422 `validation_failed`, 428 missing
precondition, 501 `unsupported`, 503 unavailable backend. Re-fetch and reconcile
drafts after 409/412, never overwrite automatically. All errors are sanitized.

### Secrets

Secret reads contain only presence/source/editability/apply metadata. Never
return the secret, a hash, length, prefix or placeholder string as a value.
Omitted `set` key means keep; a string means replace; `unset` means remove the
override subject to validation and capability rules. Empty string is a real
value and must satisfy the schema; it never means keep/delete. No magic
`"********"` sentinel. The shell starts with a blank replacement control and
separate presence text; it submits only a deliberately entered replacement.
Passwords must not go into browser persistence, URL parameters, logs, analytics,
error bodies, schema defaults or audit values. Audit actor, subject, changed
key names, outcome and revisions only. The backend stores secrets in its
approved secret store and omits them from ordinary config responses.

## 4. Observation declarations and responses

All observation endpoints are GET, require the caller's read authorization and
return `Cache-Control: private, no-store`. No endpoint may mutate state.
Declarations require `id`, `label`, `section`, `endpoint: {method, path}`,
`poll_interval_ms` (integer >= 1000), and `stale_after_ms` (integer at least the
poll interval). Responses contain `observed_at` as a UTC RFC3339 timestamp.
The shell stops polling hidden resources and shows stale/unavailable separately
from zero/healthy. Timeouts and 503 never become an empty successful chart.

| Array | Section | Additional declaration fields | Response |
| --- | --- | --- | --- |
| `health` | `status` | None | `{observed_at, status, checks}` |
| `stats` | `status` | `unit`, `kind: gauge/counter` | `{observed_at, value}` |
| `series` | `diagnostics` | `unit`, `kind: gauge/counter`, `max_points`, `max_window_seconds` | `{observed_at, points, truncated}` |
| `diagnostics` | `diagnostics` | `schema` for the structured `data` payload | `{observed_at, data}` |

Health `status` is `healthy`, `degraded`, `unhealthy`, or `unknown`; `checks` is
an array of `{id, label, status, message?}` with the same status vocabulary.
200 includes unhealthy results; 503 means the observation itself is unavailable.
This prevents an unhealthy dependency from being confused with a failed fetch.
Health checks must be cheap or cached and must not launch agents or perform
repair. Sanitized messages must not expose credentials or raw external errors.

Stats have finite numeric `value`, or null for a known missing sample. `unit`
is `count`, `bytes`, `seconds`, `milliseconds`, `ratio`, or `percent`. Ratios
are 0–1; percent is 0–100. Counters are cumulative and can reset on process
restart; do not label a counter as a rate. V1 has one scalar per resource,
avoiding an unbounded dimensions/query language.

Series accept `from`, `to` UTC timestamps and integer `limit`, bounded by the
declared positive `max_points` and `max_window_seconds`. Invalid ranges return
400; oversized requests return 422. Points are `{at, value}` sorted ascending
by unique UTC timestamps. Value is finite number or null for a gap. `truncated`
reports an incomplete requested range; no silent invented history. Unavailable
history is an omitted declaration. Polling a scalar does not create a backend
history promise. Units and counter-reset semantics match stats.

Diagnostics are bounded structured data described by inline JSON Schema, with
no `writeOnly` payloads or mutation controls. Unlike the form profile, read-only
diagnostic schemas may use nested objects/arrays; the UI can render a structured
viewer. Free-text log streaming, actions, subscriptions and arbitrary URLs are
outside v1. Legacy envelopes/shapes must be normalized by backend adapters;
the shell does not become a growing collection of app-specific decoders.

## 5. Examples and source evidence

The two proposed manifests are
[Tachyon](examples/tachyon-admin-manifest.json) and
[Nanite](examples/nanite-admin-manifest.json). They are illustrative declarations,
not exported live manifests. All `/admin/...` resource paths in them are proposed
adapter endpoints. Values, sources, limits and polling intervals are examples,
not observations or new promises made by the apps.

Tachyon exposes observe-ops's three URL settings. A post-save read for one field
could be:

```json
{
  "group_id": "plugin.observe-ops",
  "revision": "tachyon-example-1",
  "values": {
    "nanite_url": {
      "present": true, "value": "http://127.0.0.1:8091",
      "source": {"kind": "override", "label": "plugin override"},
      "editable": true, "has_override": true, "apply_state": "pending_restart"
    },
    "torque_url": {
      "present": true, "value": "http://127.0.0.1:8990",
      "source": {"kind": "default", "label": "declared default"},
      "editable": true, "has_override": false, "apply_state": "active"
    },
    "tether_url": {
      "present": true, "value": "http://127.0.0.1:8947",
      "source": {"kind": "default", "label": "declared default"},
      "editable": true, "has_override": false, "apply_state": "active"
    }
  },
  "validation": {"valid": true, "errors": []}
}
```

The ETag is an HTTP header, e.g. `"observe-ops-values-2"`. A secret record in
Nanite's illustrative plugin group could instead be:

```json
{
  "present": true, "secret_present": true,
  "source": {"kind": "override", "label": "plugin secret override"},
  "editable": true, "has_override": true, "apply_state": "unknown"
}
```

Nanite's embedding status is declared only as a diagnostic. Its user settings
example uses existing validation enums; the plugin secret group is a hypothetical
installed plugin demonstrating the existing keychain split, not a claim that
that plugin exists. Series declarations are illustrative future adapter support.
The deployment group demonstrates locked configuration. For its listen address,
an illustrative record is `present: true`, `value: "127.0.0.1:8090"`,
`source: {kind: "env", label: "deployment environment"}`, `editable: false`,
`read_only_reason: "Managed by deployment configuration"`, `has_override: false`,
`apply_state: "unknown"`. A file-owned value uses `source.kind: "file"` and a safe
label such as "deployment file"; it remains configuration, not runtime state.

Primary code read on 2026-10-01 (repo-relative paths; commits identify the
checkout moment, not a claim that uncommitted changes were absent):

| Repo and HEAD | Primary inputs | Consequence for this proposal |
| --- | --- | --- |
| Tachyon `1a586fc15d45c59ae7dcf2c8f4bf7071639f111a` | `plugins/config-ops/{adapter,local_adapter,verb_handler}.go`, `plugins/observe-ops/capabilities.json`, `internal/contract/declarations.go`, `frontend/src/api/settings.ts`, `cmd/tachyon/main.go` | Keep schema discovery/get/set/reset separate; persistent overrides, full-config validation, explicit plugin restart; nav cannot override section rules |
| Cerberus `0c1ac2d8b83a3dfdbcfd9dbca9378aa14d64b702` | `pkg/connector/connector.go`, `pkg/connector/contract.go` | Separate cheap capabilities from execution; honest unsupported errors; key-based sanitized errors |
| Nanite `227852e5e92090cbf7f05cc4b5eebb6dbff84104` | `internal/api/{settings,settings_types,plugin_config,processes}.go`, `internal/service/user_settings.go`, `internal/api/api.go` | Separate computed embedding state from config; preserve enums, keychain-backed secrets, process health and metrics resources |
| Flux `232064c3a5eaa8e8d9e270d89d78df3ca81df231` | `src/components/settings/SettingsPage.tsx`, `src/hooks/useSettings.ts` | Reference grouped settings UI; move observation destinations in future adoption; avoid optimistic admin save success |
| Tether `9ef5a5056f5edac9f4eedf3288b1a924e9feec33` | `internal/settings/{model,cascade}.go`, `internal/api/settings.go`, `internal/daemon/server.go`, `apps/sysop/frontend/src/pages/settings.tsx` | Keep scope and layer distinct; uptime/session/hardening observations separate from editing and lifecycle controls |

Tesseract memories `config_ops.persistence`, `frontend.settings_page` and
`host.nav_settings` are contextual references. Current authored code is the
behavior evidence: config-ops now has a frontend Settings page and explicit
restart integration, beyond the older persistence memory's slice.

## 6. Choices and adoption boundary

Choose declarations separate from snapshots to keep discovery cheap and prevent
values/secrets being cached with schemas. Choose typed set/unset commands with
ETags to avoid sentinel secrets, null ambiguity and lost updates. Choose per-group
atomicity, not a transaction across unrelated plugins or apps. Choose inline,
flat scalar form schemas first because Tachyon already declares those types;
defer a general form language until a consumer needs it. Choose GET polling first
because it fits every backend without assuming subscriptions or stored history.

These choices require adapters; they are not existing APIs. Tachyon needs JSON
Schema conversion, source/apply metadata, ETags, validation command and stricter
reset behavior. Nanite needs separation of computed fields, ETags, atomic secret
commands and source tracking; its legacy masked responses must not pass through.
Tether's scoped inheritance remains backend-owned. Existing app APIs can coexist
while adapters are adopted. A backend must omit unsupported resources/capabilities
until it actually implements them. Neither the shell nor this proposal changes
the underlying app's deployment precedence, secret storage or permissions.

Approval of this spec is the blocking checkpoint before any implementation.
Subsequent work should assign the wire schema/types to their owner, implement
Tachyon first, and exercise stale writes, validation failures, secret retention,
env locks, pending restarts and unavailable observations against real handlers.
This PR contains documentation/examples only and supplies no conformance suite.

## 7. Open questions for the checkpoint

1. Approve the flat scalar v1 profile, or require nested/collection configuration
   for the first dogfood? Nanite extension maps and Tether onboarding lists need
   specialized editors under the proposed boundary.
2. Approve the normalized HTTP command seam and `go-envelopes` wire ownership,
   or retain envelope/verb transport as an additional binding? The proposal keeps
   Tachyon verbs behind an adapter rather than teaching the shell verb envelopes.
3. Confirm each app's precedence and env lock policy during adoption. The
   proposal declares existing order instead of enforcing a portfolio-wide one.
4. Approve validation-preserving reset and atomic secret-store writes; adapters
   unable to guarantee atomicity must keep those capabilities disabled.
5. Which Nanite fields genuinely apply live, and which need restart? Until
   verified, use `unknown` rather than inferring active state from a saved row.
6. Are persisted series required for the first shell, or should first consumers
   omit series until a storage/window owner is assigned? Examples show the shape,
   not a decision to add retention storage.
7. Confirm caller/context mapping (app operator versus per-user/project settings)
   with the app auth owners before exposing scoped manifests. No new role system
   or unauthenticated access is approved here.

## 8. Implementation notes

These clarifications record the shipped behavior of `go-envelopes/admin`
(`UpdateResult` in `admin/validation.go`) and its `admin/adminhttp` binding at
commit `e426da17b661b8c8616acdd015dbc963ed471ba5`.

The “new ETag” on update/reset success is the ETag of the resulting snapshot.
A truly unchanged snapshot, including an identical update that is a no-op,
keeps its ETag. Changes to source, override, permission or apply metadata
invalidate it even when the desired value is unchanged.

Response `restart_required` and `apply_targets` describe this command only.
`restart_required` is true iff a changed desired value requires restart,
including a conservative restart need caused by this change; `apply_targets`
names the unique affected IDs. Outstanding pending restarts from earlier saves
remain in each snapshot value's `apply_state: "pending_restart"`, rather than
the response aggregate. A no-op after a pending change returns `changed_keys: []`,
`restart_required: false` and `apply_targets: []`, while its snapshot still shows
`pending_restart`. Clients must not clear outstanding pending state because
the latest command reports no restart work. `restart_required: true` with empty
`apply_targets` is invalid; an app can always name itself as an affected target.
