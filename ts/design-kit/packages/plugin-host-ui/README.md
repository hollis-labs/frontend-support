# @hollis-labs/plugin-host-ui

Host-neutral provisioning extracted from Nanite's importmap and `_host` entry mechanism. Exports: `.` for the runtime, ordering and scoped layout stores; `./react` for selectors and render primitives; `./vite` for importmap provisioning; `./settings` for optional configuration forms; `./source.css` for Tailwind scanning; `./isolation` for the optional verified-byte frame runtime. The package follows the plugin-host-ui design draft. It is prepared for public npm delivery. Registry publication is a separate owner-operated step; local candidate archives are not published releases.

## Host importmap

```ts
import { defineConfig } from 'vite'
import { designKitEntries, pluginHostImportmap } from '@hollis-labs/plugin-host-ui/vite'

export default defineConfig({
  base: '/admin/',
  plugins: [pluginHostImportmap({ entries: [
    { specifier: 'react', source: 'react', exports: ['createElement', 'useState', 'version'], defaultExport: true },
    { specifier: 'react-dom', source: 'react-dom', exports: ['createPortal', 'flushSync'] },
    { specifier: 'react-dom/client', source: 'react-dom/client', exports: ['createRoot', 'hydrateRoot'] },
    { specifier: 'react/jsx-runtime', source: 'react/jsx-runtime', exports: ['Fragment', 'jsx', 'jsxs'] },
    ...designKitEntries('@example/ui', {
      button: { source: '@hollis-labs/design-components', exports: ['Button'] },
    }),
  ] })],
})
```

Install the host's React, React DOM and design-kit packages in the host; this helper does not install or bundle a private runtime. Explicitly list **every export your plugins are allowed to import**, including any additional React APIs: the short example above is a small contract, not a full React export list. Missing named/default exports fail the production build. Duplicate specifiers are refused when configuring the plugin. Files may be absolute paths or `./` paths relative to the Vite root. Bare module names resolve from the host.

The helper adds runtime entry chunks with strict export signatures and injects an importmap before module scripts. Vite dev serves virtual re-export entries; production maps their emitted filenames. `/` and absolute subpath bases such as `/admin/` are supported. Main application imports and plugin imports resolve the same host modules within one realm. Plugin bundlers must externalize every mapped specifier (including `react/jsx-runtime`) instead of bundling another copy. A browser supporting native importmaps is required; no obsolete contract aliases or automatic `@nanite/ui` rewrite is installed.

Existing Rollup inputs are retained. The helper reserves input names `plugin-host-ui-N`. It leaves routing, API proxying and theme selection to the host. Apply it once per host build. A standalone buildable host at `examples/importmap-host` demonstrates provisioning without an app dependency:

```sh
cd <worktree>
npm ci
npm run build -w @hollis-labs/plugin-host-ui
npm run example:build -w @hollis-labs/plugin-host-ui
```

## Stylesheet ownership

The Vite helper provides a browser-only virtual module; Node/Vite dependencies do not enter its output:

```ts
import { createStylesheetLeases } from 'virtual:plugin-host-ui/stylesheets'

const leases = createStylesheetLeases(document)
const generation = { owner: 'notes', generation: 'accepted-generation-id' }
const release = leases.acquire(generation, '/plugins/notes/styles.css')
// During revoke/unload, before loading another generation:
leases.releaseOwner(generation)
release() // releases are idempotent
// On host disposal:
leases.dispose()
```

Each lease is owner/generation scoped; canonical absolute URLs share one link until the last lease releases. One manager belongs to one document/host scope; call its release hooks from the host lifecycle. The manager removes only nodes it created, never host/design-kit theme links. Pass only stylesheet URLs already admitted by the host's trust/CSP policy. HTTP(S) URLs are supported; this mechanism is not sandboxing or origin admission. Failed/unaccepted plugins must acquire no leases. Browser stylesheet loading failures are surfaced by normal link events; a lease is resource ownership, not a load-success receipt.

For TypeScript, declare the virtual module in the host's ambient types (the example includes a declaration). Its `StylesheetLeases` and `StylesheetOwner` types are type-only exports from `./vite`; browser code must import the implementation through the virtual module, not the Node build helper.

## Versions and isolation

`VersionAdmission<T>` carries host-declared version strings and a required `check(requirements, versions)` callback. `admitPluginVersions` delegates that decision and returns `{ accepted: true }` or `{ accepted: false, reason }`. `T` is a host normalization of the reviewed contract, **not a new registry/manifest wire schema**. CW-20261003-0037 owns runtime/design-kit requirement fields and enforcement. Invoke admission before executing/adopting a plugin or leasing its stylesheet. The helper itself does not check version ranges or bundle integrity.

An iframe has a different JavaScript realm and its own runtime singleton set/importmap. It cannot share the literal parent's React object. A typed capability bridge and the frame's import strategy belong to CW-20261002-0145; this helper implements neither isolation nor bridge authority.

## Design-kit tokens and CSS

Use the host's design-kit version and semantic tokens for foreground, surface, border, danger, spacing, type and radius. Import its documented token/theme CSS once in the host; never lease it as plugin CSS. Components may be mapped under any configured namespace using `designKitEntries`. CSS is not an executable importmap export: styles enter through the host stylesheet build or an admitted stylesheet lease. In a Tailwind v4 host, import the installed design package's documented `source.css` entry or declare its sources for scanning; import `@hollis-labs/plugin-host-ui/source.css` so its emitted class names are scanned. Plugin CSS must use scoped selectors and host token variables; do not override the global host theme. This helper does not copy a palette or change theme classes.

## Checks

From the design-kit repository root: `npm run typecheck -w @hollis-labs/plugin-host-ui` and `npm run test:run -w @hollis-labs/plugin-host-ui`. Tests exercise actual Vite dev HTTP responses, production emitted specifier/export resolution, subpath bases, singleton deduplication, missing exports, duplicate specifiers, stylesheet generation/disposal and the admission seam. Use design-kit's typecheck, build-before-test, test:run, lint and design-rule gates, then the package pack dry-run and example build. Root lockfile and blocking gate-list enrollment are maintainer-owned integration changes. The package follows the repository's per-package tag convention: plugin-host-ui-vX.Y.Z; publishing and tags require separate owner approval.

## Render host contract

The root entry has no React or DOM imports. Create one runtime with `createPluginHostRuntime(adapter)` and put `PluginHostProvider` from `./react` around its consumers. The provider retains the controller; additional selectors do not register panels again. Last-provider cleanup unsubscribes and releases only that scoped host panel projection. A later mount restores it, including React Strict Mode effect replay. `dispose()` fences this runtime permanently; it does not clear or dispose the host-owned registry. The host owns registry generation disposal and stylesheet leases.

The structural `PluginRegistryInstance<Input>` accepts a registry v2 instance (`registryVersion: 2` snapshots) with `sync`, `subscribe`, `snapshot`, `list`, and `get`. `get` uses the registry's owner/local qualified key. Adopted entries supply `hostInstance`, `value`, and `isActive()`. Supported registry v2 range: `@hollis-labs/plugin-registry ^0.2.0` (`registryVersion: 2` snapshots). The registry is a development dependency only; the host installs and owns its registry instance. The local structural interface remains the runtime contract. Package typechecking includes the real-instance assignment in `test/registry-compat.test.ts`; that test also verifies sync, status projection (including unknown status normalized to `unavailable`), and immediate unload fencing against the published loader. Structural fakes still cover isolated controller behavior. Wire parsing, integrity/version admission, catalog schemas, kind opt-in, refusals, and revoke-before-load remain upstream registry/host responsibilities.

The adapter supplies:

- `scope`: app, environment, optional project, client; each runtime owns one immutable scope.
- `catalog`: a validated `createSlotCatalog` result containing the host's explicit kinds, regions, metadata validators/projections, reserved policy, accepted widget kinds and ordering. There are no presets or implicit panel/drawer opt-ins. Each ref carries host epoch, owner, generation, kind and local key.
- `isolation`: stable external store of the app's effective `sandboxed-frame` or `main-origin` mode and setting revision. The package chooses no default. Host/app settings apply the default sandboxed-frame policy and development override. A missing/invalid app setting blocks rendering. Frame mode blocks plugin component rendering and registers no same-realm panels; host-rendered declarative surfaces remain available; a frame/bridge controller is separate work.
- `renderContext`: stable external store of host-owned render props. These overwrite declaration props; a session host can explicitly supply `session_id`. No global session/store/query-client dependency is assumed. Promises can feed `runtime.sync`; external stores supply synchronous snapshots.
- `panels.reconcile(scope, views)` and `releaseScope(scope)`: replace/release this scope's accepted, available panel projection, preserving other scopes and core panels.
- optional `icons.resolve(name)` and required `diagnostics(event)`: host icon mapping and code-only failure reporting. Components never display raw thrown exception text.

All observable stores need stable `getSnapshot()` objects until they change and an appropriate `getServerSnapshot()`. The runtime caches projected snapshots even though registry snapshots may be freshly allocated. Entries with unknown status (normalized to `unavailable`), `declared_not_selected`, `refused`, or `unavailable` remain visible as validated metadata and never resolve or mount. `isCurrent(view)` checks epoch, owner/generation, kind/key, export identity, active lease, reserved names and isolation again immediately before rendering. Concurrent async sync completion after disposal cannot re-publish views.

## React API

### Host catalog and declarative rendering

`createSlotCatalog({ kinds, regions, reserved })` validates and freezes a copy of the host policy. Each kind supplies `kind`, `schemaVersion`, `representations`, named `regions`, `role: "contribution" | "widget"`, and synchronous `validate(entry)` / `project(entry)` functions. Each region supplies its `name`, one `representation`, accepted `kinds`, explicit `widgetKinds`, and `ordering: "priority-ascending" | "priority-descending" | "manifest"`. Optional region `actions: { cardinality: "required" | "optional" | "none", allowedTags: ("command" | "navigate" | "modal")[] }` declares the local action policy. Absence admits no actions. A none policy has no allowed tags; required/optional policies require at least one valid unique tag. Policy is copied and frozen. Missing validators, duplicate names, dangling references and invalid policies fail construction. A widget is supported only when its role and region opt-in both allow it. `slot` is declarative-only. No Nanite vocabulary is installed. The upstream-reserved owner `core` is also refused by catalog inspection; the host reserved predicate may add restrictions, never relax upstream names. Validators and projectors must be pure; the host owns schema policy and authorization.

Projected labels, region, icon, ordering, props and optional `data` are validated and copied. Data/props must be finite JSON values with safe-integer numeric values; executable, cyclic or prototype-bearing projections are refused. `data` is an opaque host-validated presentation value, **not a new inline-slot wire schema**. A component's projected region must match its declared component region. Optional kind `declaredRegion(entry)` reads the declared placement (for inline slot/nav schemas, validated `metadata.slot`); the catalog compares it with the projected region. Without this reader, declarative placement validation/mapping remains the host projector's responsibility. Declarative regions never execute browser exports; `PluginDeclarativeBody` receives a host `render(data, view, props)` binding, with host context merged last. It uses the same per-view error/Suspense boundaries and live unload checks as component bodies. `PluginPanelBody` only accepts component views; `WidgetRenderer` also requires a catalog-approved widget. Isolation affects plugin component execution, not ordinary host rendering of validated declarative data.

For example, a host may declare its own notice schema and binding:

```ts
const catalog = createSlotCatalog({
  kinds: [{
    kind: 'host.example.notice', schemaVersion: 1, role: 'contribution',
    representations: ['declarative'], regions: ['example.inline'],
    validate: entry => isHostNotice(entry.declarative),
    project: entry => ({ label: 'Notice', region: 'example.inline', data: projectHostNotice(entry.declarative) }),
  }],
  regions: [{ name: 'example.inline', representation: 'declarative',
    kinds: ['host.example.notice'], widgetKinds: [], ordering: 'manifest' }],
  reserved: ref => hostReservedIdentity(ref),
})
```

`isHostNotice`, `projectHostNotice` and `hostReservedIdentity` are host-supplied functions. No detailed inline schema or renderer is assumed by the package. Regions order ascending/descending with default priority 10, stable manifest order and canonical identity ties, or solely manifest order when declared. The host supplies `manifestOrder` as the per-contribution orderIndex from reviewed declaration order (never map iteration or load timing). Projection requires a safe-integer index and int32 priority; explicit priority 0 is valid. Browser callbacks receive parsed JSON: token spelling (`1e2` versus `100`) and pre-rounding large integers are not recoverable. Raw-token checks run upstream before ordinary parsing; the browser checks finite values and safe integers, with schema-specific ranges supplied by the host. Saved user order wins for present identities; new declarations follow region policy. `runtime.ordering(region)` exposes that policy; unknown regions have no policy.

Catalog refusals name the contribution ref, `required` flag and fixed reason (`unsupported-kind`, `unsupported-schema`, `unsupported-representation`, `unsupported-region`, `unsupported-widget`, `reserved`, `invalid-metadata`, or `projection-failed`). Optional unsupported declarations produce a generic unavailable view with empty props/data and no unvalidated plugin label. Unknown component regions are not installed by fallback. Refusals are available on accepted host snapshots and through code-only diagnostics.

`runtime.sync(input)` returns `{ registryResult, planning: { accepted, refusals, requiredInactive } }`. A required catalog refusal withholds the **entire host snapshot and panel reconciliation**, including when the registry lists that required entry as inactive. `requiredInactive` lists required entries that the registry reports as declared_not_selected/refused/unavailable, even when catalog-supported. It does not implicitly block presentation: the host decides its activation policy. This is host presentation planning, not registry rollback: the registry may have accepted and advanced its own revision. Existing views still check live registry leases before rendering, so an old host snapshot cannot restore a revoked generation. The host handles failed planning, then supplies a corrected registry revision/policy. A catalog change requires a new runtime; policy mutation does not change an existing catalog.

### Migration to the catalog API

Replace adapter-level `project` / `reserved` with the required `catalog: createSlotCatalog(...)`; move projection and validation into explicit kind definitions and reserved checks into catalog policy. Supply all regions, widget opt-ins and ordering; there are no aliases or overloads. Read registry sync results from `result.registryResult` and host planning from `result.planning`. Region selector ordering now comes from the catalog, rather than a hook-level policy argument.

Later Nanite adoption is a separate clean break: map nav-rail to `nav.item`, drawers to `drawer.tab`, right rail to `panel`, settings surfaces to `settings.region`/`settings.field`, and inline toolbar/message/composer/context surfaces to declarative `slot`. Declare separate widget-accepting component regions where needed, and explicit modal/command destinations. Migrate declaration IDs and layout keys deliberately. Existing manifests are not translated; the live app remains unchanged. Typed action adapters are a separate addition.

`usePluginViews()` observes the projected set; `usePluginSlots(region, savedOrder?)` selects/arranges a host region using the catalog's declared ordering; `usePluginPanels()` selects panel declarations; `usePluginDrawerTabs(region)` selects drawer tab declarations. Exported root constants `PANEL_KIND = "panel"`, `DRAWER_TAB_KIND = "drawer.tab"`, and `WIDGET_KIND = "widget"` are the registry v2 kind names; the runtime and hooks use these names. Hooks return inactive metadata too so hosts can show diagnostics; bodies mount only current accepted views. Typed action dispatch is a separate addition.

`PluginPanelBody({ panel, fallback?, loading? })`, `PluginDrawerTabBody({ tab, ... })`, and `WidgetRenderer({ widget?, ... })` give each export its own error boundary and Suspense fallback. Owner/generation/epoch changes remount owned state. Unrelated revisions preserve healthy child state. Failed boundaries reset when the export value changes; `PluginRenderBoundary` is also exported for direct composition. Drawer IDs are `plugin:<encoded owner>:<encoded local key>`; selection IDs are durable `contributionId(ref)` tuples including kind, owner and local key. These two ID forms have different purposes.

`PluginReviewDialog` is controlled: title/description, rows with semantic `id`, label, description and added/removed/changed/unchanged state, optional `plugin: { id, version? }`, `currentBundle: { version?, digest? }` and `previousBundle: { version?, digest? }` display fields, busy/error, `onOpenChange`, and `onApprove`. Duplicate labels remain distinct rows. Busy disables close/cancel/approve; the host owns the async transaction, permission policy and bundle digest pinning. `onApprove()` receives no payload (including no click event); displayed bundle details do not replace host-owned digest pinning. Review UI does not grant capabilities.

## Ordering and persistence

`orderContributions(views, savedOrder?, policy?)` places known saved identities first, then priority (ascending by default, explicitly choose descending if desired), manifest order, and canonical identity. Default priority is 10. New entries are appended by that rule; unknown saved IDs never invent views. Core ordering and developer filtering are host inputs.

`createPluginLayoutStore(storage, scope, region, schemaVersion?)` uses an encoded tuple including all scope dimensions, region and schema version. Storage implements read/write/remove; browser localStorage is an optional host choice. Only order, visibility and selected identity persist, never props, session context, plugin configuration or secrets. `reconcile(available, retainMissing = true)` adds new identities while retaining preferences across temporary owner unload; choose false to prune missing identities. Hidden/missing selection falls back to the first available visible identity. Invalid data/storage failures fall back safely and report diagnostics. No legacy Nanite layout key is read or migrated.

## Minimal rendering example

`examples/render-host` uses ordinary external stores and promises, two host-named regions, and an owned panel/widget. Its registry is an illustrative fake, not a loader. It explicitly selects main-origin for development and offers owner unload. Run from the repository root after building design-components/tokens:

```sh
npm run example:render:build -w @hollis-labs/plugin-host-ui
```

The host imports design-tokens' theme/token CSS and design-components' documented styles once. In Tailwind v4, import this package's `source.css` alongside design-components' source integration. The package defines no palette and does not override the app theme. React, React DOM and Vite peers are optional at package level: install React/DOM for `./react`, Vite for `./vite`. This extraction changes no consumer app.

## Plugin configuration (`./settings`)

Install `@hollis-labs/kit-settings@^0.2.0` to use this entry. It is an optional peer so runtime/render/provisioning users need not install the settings kit. Import its documented `source.css` alongside this package's source integration. Forms compose the kit's `SettingsGroupForm` and `SettingsProvenanceRenderer`; no field controls or query client are copied into this package.

```ts
import { projectPluginSettings, createPluginSettingsController } from '@hollis-labs/plugin-host-ui/settings'

const projection = projectPluginSettings(runtimeFieldsOrManifestConfig, {
  id: 'notes.config', label: 'Notes configuration',
  can_read: true, can_validate: true, can_update: true, can_reset: true,
  permissions: {
    name: { editable: true, restart_required: false },
    token: { editable: true, restart_required: false },
  },
  reserved_keys: [hostIsolationFieldKey],
})
const controller = createPluginSettingsController(projection, host.settings, {
  kind: 'plugin', owner: 'notes', generation: acceptedGeneration,
  scope: { kind: 'project', id: stableProjectId },
})
// <PluginConfigForm controller={controller} />
// At owner revoke or scope change, before another generation loads:
controller.dispose()
```

The input is a runtime `ConfigFieldDef[]` (key/type/label/description/default/required/options/component) or a manifest `config` object with `fields` and `secrets` maps. Bool/boolean maps to boolean; int/integer to integer; number remains a finite number control, including strict numeric draft text while editing; string stays string. Select uses a non-empty unique homogeneous scalar enum, including booleans and finite numbers. Invalid/mixed/nested choices, nested/custom schemas, unknown assertions and custom component requests return `{ status: 'unsupported-schema', reason }`; the form presents an unavailable state. There is no automatic string fallback.

Secret fields become write-only strings with `secret: true`; defaults, examples and enums are omitted. Independent manifest secret declarations merge by key, with duplicate identities refused. The output is a frozen flat object schema with `additionalProperties: false`, required keys, matching field permissions and explicit read/validate/update/reset capabilities. Read-only fields need a reason; restart-required fields need an apply target. Defaults are annotations only: values and fallbacks are resolved by the host, never inferred in the form.

`SettingsScope` is `{ kind: 'client' | 'environment' | 'project', id }`; its non-empty ID is supplied by the host. A controller owns one immutable scope and one plugin owner/generation or host app target. It has no persistent cache. The optional root adapter `settings` hook carries promise-based `read`, `validate`, `save` and `reset`, each receiving the target and `AbortSignal`. Enable capabilities only when the host implements them. Read returns `{ revision, values, apply? }`; revisions are opaque non-empty revision/ETag strings. Validate receives `{ revision, changes: { set, unset } }`; save receives the same validated intent; reset receives `{ revision, keys }`. Mutations return `{ status: 'saved', snapshot }` or `{ status: 'conflict', revision }`. This is an adapter interface, not a new backend wire schema. The host enforces target ownership, permissions, revision checks and secret storage on its backend.

The controller calls host validation before every save/reset and blocks local invalid values. Backend exceptions and validation messages are not echoed; user-visible errors contain safe generic text. A background refresh preserves dirty edits and their original snapshot; changed revisions produce an explicit conflict and block writes until discard/reload. Read refresh never quietly rebases a draft. `cancel()` aborts pending work, clears the draft and adopts a pending verified snapshot if available; `dispose()` also clears values and fences all late results. The form retains the controller and clears its drafts on last form unload, including Strict Mode cleanup. The host must dispose controllers at owner revoke or scope change, even if a form is retained elsewhere.

Snapshot `values` contain per-field `{ present, editable, has_override, ... }`. Ordinary present values include a typed scalar `value`; absent values omit it. Secret values contain only `present` and matching `secret_present` with permission metadata; a secret snapshot containing even an own undefined `value` is rejected. Existing secrets are never reconstructed. Replacement secret input exists only in controlled transient drafts and the in-flight host request. Secret drafts clear after completed save/reset attempts (including rejection/failure), cancellation, unload and disposal; ordinary drafts remain on failed mutations. Do not log or serialize controller drafts/requests, cache them in a query client, or put them in localStorage/layout preferences. Host validation/persistence must not echo submitted credentials into snapshots or metadata.

## Host app isolation setting

`projectAppIsolationSettings(hostFieldKey, capabilities)` constructs a separate host-owned group with exactly `sandboxed-frame | main-origin`, no default, and the host's stable group/field keys. Pass it to a controller with `{ kind: 'app', appId, scope }` and render `AppIsolationConfigForm`. Plugin projection always has plugin origin; it cannot create this host projection or use its app target. Plugin and app groups/drafts are never merged. The host should additionally reserve this field key in plugin projection and enforce the target namespaces in its backend.

The host snapshot supplies the mode, revision, editability/read-only reason, override presence, `source: { kind: 'default' | 'env' | 'file' | 'override', label }`, and `apply_state: 'active' | 'pending_restart' | 'unknown'`. Missing/unsupported provenance blocks writes. The host declares restart requirements/targets and supplies reconciled `apply: { restartRequired, applyTargets }`; optional `onApply(targets)` forwards intent to a host-owned operation, never performs a restart in this package. No source, default or application state is guessed.

Changing the select updates a draft only. The render runtime's `adapter.isolation` must continue to read the host's verified **effective mode**, never this draft or a stored desired value pending restart. The host/app policy chooses sandboxed-frame by default and may choose main-origin for development; this package chooses neither. Actual frame rendering, bridges, CSP and effective-mode application belong to the host's separate isolation controller.

Current render-time lease checks scan/re-inspect the registry snapshot per view (O(n)); this deliberately favors correctness before an indexed performance optimization.

### Typed actions

A region opts into actions with `actions: { cardinality: 'required' | 'optional' | 'none', allowedTags: [...] }`. Omission allows no actions. A required policy requires a projected action; a none policy requires an empty tag list. Catalog creation validates and freezes the policy. A host kind projector returns one optional `action` on the view after validating its declaration. There are no built-in declaration schemas or region presets.

The closed intent union is:

```ts
{ type: 'command', command: 'owner/local_key', arguments: { /* JSON */ } }
{ type: 'navigate', route: 'host-approved-route-id', parameters: { /* JSON */ } }
{ type: 'modal', region: 'host.modal', entry: { owner_id: 'owner', local_key: 'widget' }, props: { /* JSON */ } }
```

`handler` is an `unsupported-action` refusal, with no alias. The registry's `handler` representation is separate: command targets use an existing accepted command entry with that representation. Modal targets use an accepted, live `widget` entry in an explicitly published component region with `modal: true` and widget acceptance. The host gateway pins the target generation; intents cannot supply a generation, lease or export. Navigation accepts a route identifier, not an arbitrary URL: the host validates it against its route registry.

The optional `adapter.actions` supplies live `scope` and `invocation` external stores and promise-based `validate`, `command`, `navigate`, and `modal` methods. Every invocation first calls `validate` to enforce the host's typed argument, effect, capability, route and caller policy. The invocation store contains verified host context, never plugin-supplied caller identity; replace its immutable snapshot when that context changes. All four methods receive a frozen `ActionContext` and an `AbortSignal`. Only the matching typed operation runs after successful validation. Results are `{ status: 'success' }` or `{ status: 'refused', reason: <named code> }`; exceptions and malformed host results become `host-failed` without exposing their contents.

Use `dispatchPluginAction(intent, { host: runtime, contribution: view.ref }, signal)` outside React, or `const dispatch = usePluginAction()` and `await dispatch(view, signal)` inside the provider. The hook callback is stable for its runtime and cancels its pending calls on unmount. The source may be declarative or component-based: dispatch uses its host catalog binding, never assumes a declarative payload, and does not implement a frame bridge. Dispatch requires the exact current catalog-projected action, an accepted active source lease and matching host scope. Arguments/parameters/props are copied and frozen JSON objects. A changed source/target generation, declaration, registry epoch, scope or verified invocation context invalidates the call; unload/dispose and caller cancellation abort it. Late results are fenced, including hosts that ignore cancellation. Abort cannot undo an effect a host already committed: host operations must honor the signal at their own effect boundary.

No window events, routing implementation, command RPC or modal component mounting is installed by this package. The render-host example uses ordinary external stores and promises to approve navigation directly. Hosts own the schemas and transport; parsed-value checks cannot recover raw JSON token forms.

The optional [`./isolation` entry](./ISOLATION.md) supplies a verified-byte registry
importer, opaque frame controller and closed protocol/CSP helpers. `./vite` packages
reviewed runtime artifacts and a fixed bootstrap. Install the optional graph lexer
peer and provide app-owned policy delivery, live registry leases and typed action
bindings. Each surface gets its own confirmed realm; mode changes fence all old
sessions before replacement. See the integration contract, Chromium harness and
limits in ISOLATION.md, including self-navigation egress and main-origin authority.


## Release compatibility and delivery

The optional Vite peer accepts `^7.0.0 || ^8.0.0`; release evidence targets
7.3.6, 8.2.2 and Tangent's actual locked 8.3.1. Components and tokens stay on
`^0.4.0`. Install React/React DOM 19, and `es-module-lexer` for isolation;
`kit-settings ^0.2.0` is required only by the settings entry.

For parents whose script policy refuses data/blob URLs, configure the
`moduleDelivery` option on `createPluginFrameBrowser`. The host provisions
immutable same-origin module responses from the supplied verified inventory.
The runtime derives native importmap SRI from those bytes, checks integrity
support before plugin execution, and admits only dedicated frame documents.
It refuses main-origin rendering in this delivery mode. No failed delivery
falls back to a source URL or a different execution mode. See [ISOLATION.md](./ISOLATION.md)
for the server authority, CORS, lifecycle and browser requirements.

Each public entry is independently importable: browser code uses `.`, `./react`,
`./settings` or `./isolation`; Node build code uses `./vite`. No consumer must
import an internal file. A local proof must install the exact packed candidate
and retain its digest separately from any eventual registry-release receipt.
