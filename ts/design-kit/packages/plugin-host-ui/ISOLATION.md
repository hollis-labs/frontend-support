# Optional frame isolation

`@hollis-labs/plugin-host-ui/isolation` exports the closed bridge contract and
`createPluginFrameBrowser`, an optional registry importer and structural frame
controller. Core, React and settings entries do not import isolation or its graph
lexer peer. Install the optional `es-module-lexer` peer for isolation or frame
artifact packaging. React, React DOM and configured design exports execute inside
the frame from a reviewed inventory; the parent uses its own singleton in
main-origin mode. Declarative controls remain parent-rendered.

## Host integration

Build runtime entries with `buildFrameArtifacts` and the fixed classic bootstrap
with `buildFrameBootstrap` from `./vite`. Every entry emits one standalone ESM
module, bundling its internal graph and retaining only approved bare peer imports.
Declare explicit export names and compatible package versions. Packaging refuses
unreviewed externals, leftover relative/computed imports, asset graphs and network
CSS. Inventories carry frozen exact bytes and SHA-256 digests. The graph lexer is
syntax admission, not a restriction on arbitrary JavaScript once admitted.

Create one `createPluginFrameBrowser` per app host. Supply its `importModule` as
the existing registry's verified-bundle importer and the same controller as the
host adapter's `frameController`. Its review callback must pin owner, generation,
host instance, bundle digest, effective mode, requested exports and the approved
runtime inventory after checking manifest/version/variant/install policy.
The registry still verifies and adopts the bundle; this package verifies the
provided bytes again and never fetches the source URL. Without signature assurance
it reports `unsigned`, not signature verification.

Supply live registry checks (`isActive`, `isOwnerActive`, `subscribeLeases`), a
lazy `host` reader, compiled per-view bindings and a schema/allowlist JSON `props`
projection. Never project credentials or service handles. The existing host action
adapter performs grants, typed target/argument/effect and verified caller checks.
The frame receives only declared typed command/navigate/modal bindings.

The app supplies a complete `{appId,effectiveMode,revision}` store with no loader
default. `main-origin` additionally requires explicit host authorization through
`allowMainOrigin`, and reports ambient-authority risk. Provision the app importmap
with its reviewed React/design peers before parent imports; parent rendering stays
on the existing React path. The app must unmount cooperative main-origin views
before changing mode. Arbitrary parent code already executed cannot be recalled.
No failed sandbox import falls back to main-origin or restores an old generation.

`delivery.provision` serves the exact `FrameDocument.html` with its CSP and
Permissions-Policy headers and returns a dedicated frame URL and release callback.
Alternatively it may return exact `srcdoc` after admitting the inherited parent
CSP. `policyAdmitted: true` is a host assurance, not browser-policy introspection.
The runtime also embeds the matching CSP meta policy. A host unable to serve or
admit the policy must refuse with `policy-unavailable`; parent CSP is never relaxed.
Frame URLs must not redirect or execute different documents. Bootstrap hash and
per-document importmap nonce are distinct from the bridge nonce. The nonce is set
before insertion; verified modules use digest-bound data URLs without byte rewrites.

## Handles and surface lifecycle

An inert handle pins `(hostInstance, owner, generation, digest, exportName)`.
The registry adopts a frozen plain namespace containing only these frozen,
non-callable handles for exports actually confirmed in an opaque verification
realm. That realm is disposed before importer completion and cannot dispatch calls.
Handles are owner-generation bound and may serve multiple contributions/surfaces.

Every surface creates its own frame, cryptographic nonce, MessageChannel, realm,
leases and state machine. It re-verifies the pinned inventory, imports the exact
bytes and reports its own actual exports before that surface can mount and become
ready. Initialization is never inherited from verification or a sibling session.
Mount rechecks live registry/source ownership and the private digest-bound handle;
forged, revoked, different-generation or different-digest handles are refused.

Inventories are refcounted per owner generation. Disposing one surface preserves
siblings. Owner unload/replacement, effective mode/revision change or explicit
`revokeGeneration` fences all that generation's sessions before replacement can
mount. Cleanup closes ports, aborts calls, detaches frames/listeners/timers and
releases documents independently even if a cleanup throws. Late callbacks cannot
restore authority. Core checks registry adoption and controller currency, and
controller notifications advance the host snapshot. A frame navigation after its
initial document load revokes the session.

## Wire shapes

Port messages are JSON strings. Window bootstrap messages are closed structured
objects and may only bind the channel. The envelope is
`{bridge_version:1,frame_id,nonce,seq,type}`. The nonce is a 32-byte cryptographic
value encoded as 64 lowercase hexadecimal characters; it binds the mount and is
not a credential. Port sequences are positive safe integers increasing per
sender. A `bound` acknowledgement precedes the single `init`.

Nested DTOs have these exact fields:

| DTO | Fields |
| --- | --- |
| Artifact | `id`, `kind` (`module` or `style`), `sha256` (64 lowercase hex characters), `base64` (verified bytes) |
| Import | `specifier` (approved bare module name), `artifact` (module artifact ID) |
| Binding | `id` (opaque host name), `intent` (closed command/navigate/modal descriptor) |
| Success outcome | `status: success` |
| Refused outcome | `status: refused`, `reason`, optional `action_reason`, optional bounded redacted `text` |
| Interrupted outcome | `status: cancelled`, `timeout` or `unknown-outcome` |
| Failure | `code` from the exported `FAILURE_CODES`, including `policy-unavailable` |

The exported schema and reason tables and accepted message trees are deeply
frozen. No duplicate/prototype keys, unknown fields, null optional fields,
nonfinite numbers, non-JSON values or service/handler action tags are admitted.
Import rows reject relative or URL specifiers and must reference inventory
modules. Actual bytes/digests and module graph approval remain the host's
verification responsibility; a syntactically correct digest is not proof.

The state machine intersects actual initialized export names with host-reviewed
requested names before adoption, then admits a single mount. It admits no calls
until ready. The host pins authority outside messages and must check owner,
registry/source/target leases, app scope, invocation and effective mode revision
at dispatch. `dispatchBoundAction` uses only the host's `actions.bindings` resolver
for component sources; it cannot impersonate a declarative source. Ordinary
`dispatchAction` retains the validated host projection descriptor path for either
representation. A component without either reviewed path has no action authority. The resolved
intent must match the request and is rechecked after asynchronous validation.
Target argument/effect/capability and caller checks still use the existing host
adapter. No second gateway or registry exists here.

## Bounds and receipts

The exported package bounds may be tightened by the host: control/context 64 KiB,
init 32 MiB, each raw artifact 8 MiB, aggregate raw artifacts 16 MiB, JSON depth 32,
32 outstanding calls, 20 invocations/second with burst 40, call deadline 30 seconds,
handshake deadline 10 seconds and disposal drain 2 seconds. Repeated rejected
invocations fence a flooding channel. Cancellation uses its own parser/rate budget.
The host must schedule `checkHandshake`/`expired`, abort adapter requests and
release resources; the pure session does not own clocks or ports.

`dispatchBoundAction` accepts a host-only execution observer, called after
validation immediately before the effect adapter starts. It can return false to
fence an expired/cancelled call. The frame never supplies this function. Use it to
call `markExecuting` at the actual effect boundary.
`interrupt` returns cancelled/timeout before that point and unknown-outcome after
it. A definitive host/backend receipt remains authoritative; interruptions cannot
undo committed effects and must never trigger an automatic retry. The host sends
one terminal result, fences late results, and cancels stale work before replacing
scope/context. Unknown result IDs are ignored; duplicate invocation IDs revoke.

The CSP builder accepts only a fixed bootstrap hash and a separate per-document
nonce, and refuses directive injection as policy-unavailable. A frame policy
cannot relax its inherited parent policy. Parser/DOM tests establish contract behavior; the separate Chromium harness
establishes only the browser mechanisms it exercises. Self-navigation may cause network egress before a host
observes it and revokes the channel; this contract promises no universal egress or
CPU/memory containment. Main-origin components have ambient document authority.


## Browser verification and limits

After building, run `node packages/plugin-host-ui/test/browser/run.mjs` from the
repository root with Playwright Chromium installed. `PLAYWRIGHT_EXECUTABLE_PATH`
can select an existing compatible executable. The harness runs a loopback host,
real registry, React/design runtime artifacts and dedicated frame response policy
in a fresh browser context. It uses test-only port instrumentation to inject hostile
packets; production exposes no such port handle.

The harness covers exact verified bytes with a changed bundle URL, frozen export
handles, absent/forged exports, separate frame realms, sibling disposal, typed
allowed/denied effects, invocation/scope/target cancellation and uncertain late
effects, replay/schema/nonce/version/transfer rejection, opaque parent DOM/storage/
cookie denial, fetch/subresources/forms/popups/top-navigation restrictions, focus
and a parent-owned modal, cleanup failure, mode fencing, parent React singleton
and self-navigation detection. Window source/origin/nonce/port/version/schema admission is exercised before
legitimate binding in both browser realms and also covered by contract tests. Browser results apply to the tested Chromium and
host delivery; applications must verify their own browser, inherited policies and
runtime variants. Unsupported runtime/module graphs are refused.

Self-navigation can send a request before load detection revokes the session. This
is observed by the harness, not hidden as universal network denial. CPU/memory and
all possible browser egress are outside this contract. Sandbox isolation does not
establish provenance, signature trust, manifest permission or host grant validity.
Main-origin execution has ambient document authority and cooperative cleanup.


## Immutable same-origin module delivery

`PluginFrameBrowserOptions.moduleDelivery` accepts a `FrameModuleDelivery`.
Its `provision(artifacts, scope, imports, owner)` receives the verified inventory, including a
harmless package-owned integrity probe, and exact owner/incarnation/generation identity, and returns `{urls, release}`. Return one
canonical absolute HTTP(S) URL per module artifact ID, on the parent origin;
each path contains that artifact's SHA-256. Queries, fragments, credentials,
extra/missing modules and duplicate URLs are refused. Styles remain verified
inline artifacts. The derived admitted manifest binds module IDs, byte digests, fixed JavaScript media type, canonical URLs, reviewed specifier-to-artifact graph mapping and integrity metadata. The bootstrap refuses an init mapping that differs from the sealed document mapping. All static/dynamic/transitive imports are checked against the pinned bare-peer mapping; computed, relative, URL and import.meta graphs refuse. The protocol's existing init/bridge shapes are unchanged.

The host server owns this response store. It must authenticate provisioning,
validate bounded canonical bytes/digests, snapshot each response immutably,
serve exact JavaScript bytes with `Content-Type: text/javascript`,
`X-Content-Type-Options: nosniff`, and CORS permitting the opaque frame (`null`
origin, no credentials). A credential-free dedicated response may use
`Access-Control-Allow-Origin: *`. Never redirect, interpolate scripts, return
mutable source URLs or route the response through an untrusted proxy/service
worker. A digest in a URL alone is no evidence of response integrity.
The host must refuse unknown routes, redirects, digest/content mismatches and attempted replacement. Keep admitted mappings stable until their frames stop; revoke/stop authority separately from deleting bytes, and MUST enforce non-reusable route identity for the entire host/server incarnation and across any persistence/restart boundary where old URLs can still be requested. Refuse replacement/reuse after disposal as well as while live. Bind route scope to the exact owner/incarnation and admitted manifest; use a fail-closed retention policy, with no rebinding after deletion. The lifetime release removes only the scope's store; deletion/replacement must
not alter any other active scope. Provisioning must not expose host credentials
to the frame. This library grants no server authority or new HTTP routes.

The runtime verifies the provided artifacts again, pins the URL inventory,
and generates an importmap `integrity` entry for every module. In each opaque
realm it first imports a harmless package-owned positive probe with correct SRI,
then imports the same bytes at a separate pinned URL with an incorrect digest.
Admission requires the latter import to reject and Resource Timing to show a
completed HTTP 200 response with the exact decoded byte length, without a
matching CSP denial. Delivery MUST send `Timing-Allow-Origin: *` for those
responses. Missing timing support, missing routes, incomplete transfers or a
browser accepting the bad digest refuse before plugin execution. The positive
probe and plugin graph use the same native importmap integrity path.

This is not intrinsic browser introspection: admission also trusts the sealed
host to serve the exact admitted probe bytes with valid JavaScript MIME and
opaque-origin CORS headers, without redirects or interception. HTTP 200 and
byte length alone do not prove that contract. A host violating those assurances
could turn a CORS/MIME error into a false integrity signal in an unsupported
browser; that host is outside the admitted contract. Supported-browser evidence
must include actual response hashes/headers and native bad-SRI rejection, with
positive rendering and an unavailable-probe/unsupported-integrity refusal
control. The bootstrap removes readable nonce attributes and CSP metadata after importmap installation, before any plugin module executes; parsed/header CSP remains enforced. The plugin and its approved bare
peer graph then load under the correct SRI digests, without rewriting bytes.
Each frame retains a separate module singleton set and bridge lifecycle.

This mode requires a dedicated same-origin frame response whose exact document,
CSP and Permissions-Policy are admitted by the host's `delivery.provision`.
The child script policy names only pinned module URLs plus its trusted bootstrap
hash/document nonce; it has no data/blob script source. The parent policy is
unchanged. `srcdoc` is refused, since its inherited policy cannot admit a new
bootstrap or importmap nonce under Tangent's production script policy.
Main-origin is refused in this mode; there is no fallback to the legacy data-URL
mode. The latter remains explicit existing behavior when `moduleDelivery` is
absent and requires a separately admissible host policy.

Run the focused harness with `PINNED_MODULES=1 node test/browser/run.mjs` after
building. It exercises the parent self+Tangent-shim script policy, exact-byte
opaque rendering, plugin/runtime response tampering after provisioning,
changed sourceUrl, clean replay and the existing bridge/isolation contracts.
A passing browser receipt applies to that browser and delivery adapter only.
Production Tangent endpoint adoption is separate from a local candidate proof. HTTP caches, service workers, redirects or global import maps must never widen the admitted graph or replace bytes behind an admitted identity. The same native integrity path must enforce the negative probe, positive rendering and every plugin/runtime/transitive load in each supported browser; otherwise refuse admission.
