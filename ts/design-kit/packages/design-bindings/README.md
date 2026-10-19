# @hollis-labs/design-bindings

The binding contract: **which component draws a wire kind, how the payload reaches
it, and at what trust.**

This is the fourth row of the portfolio's ownership table, and until now the one with
no owner:

| Concern | Owner |
|---|---|
| wire — type name, schema, validation, response payloads | `go-envelopes`; may never assert appearance |
| design — tokens, components, appearance | the design-kit packages; may never assert wire identity |
| behavior — resolver lease, draft custody, submit gates | the app |
| **binding — "this schema renders as these components"** | **here** |

Every app used to write the fourth one by hand. That is the drift mechanism N
consumers deep: Nanite writes one, Tangent writes another, and the two diverge
without either being wrong.

## Tailwind compatibility

The design-kit CSS pipeline requires **Tailwind CSS v4**. This package declares
`tailwindcss: ^4.0.0` as an optional peer because its nonvisual JavaScript APIs
also work without the CSS compiler. npm does not auto-install an optional peer
and produces **no warning when it is absent**; npm 11's default resolver rejects
an installed incompatible major.

When using the CSS pipeline, declare Tailwind in the app's build dependencies
and configure the matching Vite/PostCSS/CLI integration:

```sh
npm install -D tailwindcss@^4.0.0
```

A successful install alone does not verify CSS setup. These nonvisual APIs
need no component scan by themselves. Once the app renders design-components
or an idiom kit, import those packages' `source.css` registrations (or the
dashboard `theme.css` that includes them). See the
[adopter-path guide](https://github.com/hollis-labs/design-kit/blob/main/docs/adopter-path.md)
for complete value declarations and production-browser verification.

## What this ships, and the one thing it does not

- the row **shape** — `BindingRequest`, `Binding`
- the **generator contract** — `defineBindingTable`, `HostPolicy`
- the **resolver** — `resolve`
- **no table.** Not now, not later.

A binding names components in one host's module tree, so the table is **host-local by
construction** — which is precisely why `component:` was wrong in go-envelopes, and
is the structural reason this design can refuse override while still allowing
customisation.

Zero runtime dependencies. No React: this answers *which entry, with which payload
path, at which trust*, and the host renders.

**Zero is a stronger property than it sounds, and it is not asceticism.** A package
with dependencies has to get bundling right, and getting it wrong is quiet: a
dependency that keeps MODULE STATE — a toast queue, a store, a context registry —
vendored into a bundle rather than externalised gives a consumer a second copy, and
the consumer's calls go to a different instance than the rendered one. Nothing
appears, nothing errors, and nothing in the stack points at the bundler. This package
has nothing to vendor and no build step at all: `main` and `types` point straight at
source, so there is no bundle for a copy to hide in.

## Node and SSR consumers

This package exports TypeScript source. Browser builds must transpile it. Node
cannot strip types from dependencies in `node_modules`: a direct import under
Node 24 fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. Bundle this
package into the server output before running that output in Node.

Vite normally externalizes installed dependencies for SSR. Include this package
with `ssr.noExternal` so Vite transpiles its source:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  // Keep the host's existing plugins and build configuration.
  ssr: { noExternal: ['@hollis-labs/design-bindings'] },
})
```

Use the equivalent dependency-transpilation setting in another SSR bundler.
The packed-install adoption smoke verified a Vite 5.4.21 server build with this
setting and executed its output in Node 24.21.0. It does not establish direct
Node import support or compatibility with every server bundler.

## The shape

```ts
import {
  defineBindingTable, constantTrust, resolve,
  type BindingRequest,
} from '@hollis-labs/design-bindings'

// What a kit, a plugin, or your own generator DECLARES.
const rows: BindingRequest<MyKind>[] = [
  {
    kind: 'approval-card',
    version: '1.0',
    rendererId: 'approval',                                  // distinct from kind:
    rendererClass: 'react-component',                        //   one renderer, many kinds
    entry: 'components/ApprovalCard#ApprovalCard',           // module AND symbol, one field
    payload: { from: 'field', field: 'approval', as: 'approval' },
    requestedTrust: 'core-trusted',                          // a request, not a grant
    fallback: { kind: 'none' },
  },
]

// What YOU compose. The only source of a resolvable binding.
const table = defineBindingTable({
  contractDigest: CATALOG_DIGEST,
  resolverConfig: { inlinePayloadLimitBytes: 262_144 },  // host policy, stated once
  trust: constantTrust('core-trusted'),   // or a real policy — see below
  defaults: kitChatBindings,              // inert rows a kit offered
  rows,                                   // yours; beats a default for the same kind
})

// What you ask at render time. Never throws.
const r = resolve(table, envelope.kind)
if (r.ok) draw(r.binding, r.inlinePayloadLimitBytes)
else drawFallback(r.code, r.reason, r.fallbackRendererId)
```

### `payload` is the part that does real work

`entry` says *which* component. `payload` says *how the envelope reaches it*, and
without it a binding loses the field that encoded actual renderer behaviour
(go-envelopes' deleted `props`). The two ApprovalCard rows are why it is a field:

| kind | rendererId | payload |
|---|---|---|
| `approval-card` | `approval` | `{ from: 'field', field: 'approval', as: 'approval' }` |
| `subagent-spawn-approval` | `approval` | `{ from: 'data' }` |

Same renderer, two payload paths. A `Record<kind, string>` cannot express that pair.

## The generator contract

A host **generates** its rows; it does not hand-write a registry. A hand-written
registry is a second source of truth, and it is why Tangent needs two drift suites
today to keep its table and its boot path from diverging.

A generator emits `BindingRequest<K>[]` as data. It needs to satisfy four things:

1. **`kind` comes from the wire catalog**, not from the design layer. The design
   layer may never assert wire identity.
2. **`entry` is `"module/path#ExportedSymbol"`** — one field, so the module and the
   symbol cannot drift apart. Use `parseEntry` when loading.
3. **`requestedTrust` is a request.** Emit what the manifest asked for. Your
   `HostPolicy` decides what it gets.
4. **Emit no trust grant, no isolation, no state, and no digest.** Those are not
   yours; they are absent from the type, so the compiler agrees.

There is no registry here — no module-level state, no `register()`. A table is a
value you build and pass to `resolve`.

### `resolverConfig` is for what every row would repeat

The payload ceiling lives here rather than on a row. Tangent carries it per row and
all 19 rows carry the identical `262144` — a value present on every row carries no
per-row information, so it is host policy denormalised into a table. Put it against
its neighbours: trust is genuinely per-row because a binding *requests* it, and
isolation is deliberately off the row because the host *derives* it. A ceiling
behaves like isolation.

**It did not go away, it moved — and "the security field was removed" is the wrong
reading.** The ceiling applies to every resolution from day one, so nobody faces a
migration the first time they need it; it is simply supplied once instead of repeated.
`resolve` returns the effective value on a hit, and `table.resolverConfig` is reachable
for a miss, where a fallback renderer drawing untrusted content needs the same bound
and has no row to read.

A host that genuinely varies the ceiling by kind returns an override from its
`HostPolicy`:

```ts
trust: (request) =>
  request.kind === 'chat.attachment'
    ? { admit: 'core-trusted', inlinePayloadLimitBytes: 8_192 }
    : { admit: 'core-trusted' },
```

That is the **only** place an override can be set. A ceiling is a fact only a host can
know, so `BindingRequest` has no such field and a kit cannot bound its own payload —
the same rule that stops it declaring its own trust.

**Before adding a field to `Binding`, ask whether every row would carry the same
value.** If so it belongs in `resolverConfig`.

## Trust, in one paragraph

Trust is **requested** by the row and **granted** by your `HostPolicy`. Isolation is
**derived** from the grant and can never be declared. A refused claim is
**quarantined, never downgraded** — a renderer running at less privilege than it
asked for looks like success and is not. Six of the seven portfolio apps need none of
this today; they write `trust: constantTrust('core-trusted')` and never think about
it again. It is in the shape so that adding the dimension later is not a v2 migration
of every binding table in the portfolio, at the exact moment someone is first doing
something security-sensitive.

## A miss is a classification, never an exception

`resolve` does not throw, has no failure path, and always returns something you can
draw. A wire kind with no binding is the **normal** case — it is what a plugin looks
like before a host has decided to draw it.

| code | what happened | what the operator does |
|---|---|---|
| `unclassified` | nothing in this build classifies the kind | ship a row, or expect the kind |
| `unavailable` | classified; this build will not serve it | ask for a different workflow |
| `quarantined` | a trust claim was refused | review the claim — it was not downgraded |
| `ambiguous` | two rows in one tier declared it | declare one host row to settle it |

There is deliberately **no `trust_unimplemented` code**, and its absence is a decision
rather than an oversight. Tangent needs one because it reads trust classes as strings
from a generated table, so "this build does not implement that class" is a real
runtime state. Here `TrustClass` is a closed union and `TRUST_PROFILES` is a mapped
type over it, so a class without a profile is a compile error. The case was
eliminated by the shape, not dropped — do not add the code back.

`fallbackRendererId` is **only ever a fallback that preserves meaning**. A declared
fallback that does not is recorded on the row and never offered, because degrading a
structured decision into something that cannot express it returns a success the user
acts on. `null` means draw the generic view: a titled view of the payload, naming the
kind, is sufficient and honest.

This pairs with go-envelopes' `TypeSupport`. `CheckSupport` asks at build time *"do I
have a policy for every type?"* and prevents surprise; `resolve` asks at runtime
*"can I draw this one?"* and handles it. You want both.

## The one rule, and why there is no lint rule for it

**A binding names a component identity, never an appearance value.**

There is no lint rule. There is nowhere to put one: every type is closed, there is no
index signature, no `options`/`meta`/`props` bag, and `payload` is a closed
discriminated union. A type that cannot hold a colour beats a rule that objects to
one — no CI step, nobody to remember it.

**If you are about to add an extensibility escape hatch, that is the failure mode
this package was shaped to prevent.** One `Record<string, unknown>` for "renderer
options" re-opens appearance to the design layer, and it will not look like a design
decision when it lands — it will look like a convenience. If a renderer needs
something, it comes through the payload, which belongs to the wire; if it is not in
the envelope, the host knows it, and the host is rendering.

The same closedness is what keeps a kit's rows inert — see below.

## The pattern worth stealing

Used twice here, independently, which is what makes it a pattern rather than a trick:

> **Put a value on the shape where reading it is correct, so the wrong read cannot be
> written.**

The failure it removes is the one that typechecks. A field sitting next to the flag
that qualifies it can always be read without the flag, and the compiler has no opinion,
so the bug is invisible at the site that causes it and surfaces somewhere else entirely.

**`FallbackBinding`.** The obvious shape is `{ rendererId, preservesMeaning: boolean }`.
Reading `rendererId` without checking the boolean compiles — and the consequence is a
card that looks rendered and has silently dropped the decision the user was asked to
make, which is worse than refusing because it returns a success they act on. So the id
exists *only* on the `safe` variant. You cannot read it without having matched.

**The payload ceiling.** The obvious shape is an optional field on the row plus a
default in config, read as `binding.x ?? config.x`. Every caller has to remember the
`??`, and forgetting it yields `undefined` rather than an error. So `resolve` returns
the **effective** value on `Drawable` — config, or this row's override, already
resolved. Resolving config against an override is the resolver's job, so the resolver
does it, once.

Both are the same move as the closed row type and the `BindingRequest`/`Binding` split:
prefer a shape that cannot express the mistake over a rule, a comment or a convention
that objects to it after the fact. **Unrepresentable beats detected** — it needs no CI
step, no reviewer, and nobody to remember.

## For kit authors

A kit **may** ship default binding rows for the kinds it implements. That is what
makes a kit adoptable rather than a component grab-bag.

They are `BindingRequest`s, and they are inert by construction:

- the host-only fields are **absent** from the type, not optional, so you cannot
  declare your own trust and be silently ignored;
- nothing in this package consumes a request except a host's own
  `defineBindingTable`;
- there is no registry to install into;
- `Binding` and `BindingTable` are branded, so you cannot write the composed shape
  out by hand and export it as a table.

Export them as data and let hosts compose. A host passing your rows as `defaults` and
then declaring its own row for one kind is **not overriding you** — there is no
shared table to override.

## For CW-20260910-0129 (kit-chat's interactive cards)

Four things, since you consume this and have not read the design thread:

1. **You do not need an error boundary for the "unknown card" case.** `resolve` never
   throws and always classifies, so per-envelope isolation is the default rather than
   something you wrap. You still want a boundary around a card that throws *while
   rendering* — that is a different failure and it is yours.
2. **Do not collapse the four miss codes into "couldn't render".** They are four
   different operator actions; the table above is the copy you need.
3. **Ship your cards as `BindingRequest` defaults, not a registry.** A host composes
   them. See "For kit authors".
4. **`resolve` takes a plain `string` kind**, not your generated union — the unknown
   kind is the case it exists for.

## Toolchain

```bash
npm run typecheck    # tsc; also checks test/shape.test.ts's compile-error assertions
npm run test:run     # node --test
```

No test framework and no lint dependency: the tests use `node:test`, which ships with
Node. `test/shape.test.ts` is checked by **typecheck**, not by the runner — its
`@ts-expect-error` directives fail the build both if a defence is removed and if one
becomes unnecessary.
