# @hollis-labs/design-bindings

## 0.2.0 — BREAKING (CW-20261105-0004)

Clean break, no aliases or shims. Breaking changes:

- **Trust vocabulary is isolation only** (Tangent ADR 0009). `TrustClass` is removed, as are
  `isolationFor` and `trustClassPermits` (the derive-isolation-from-class step). `Isolation`
  (`main-origin | host-primitive | sandboxed-frame | external-surface`) is now what a row requests
  and a host grants. `BindingRequest.requestedTrust` becomes `requestedIsolation`;
  `Binding.trustClass` is removed (`Binding.isolation` is the grant); `HostDecision.admit`,
  `constantTrust`, `TRUST_PROFILES` (keyed by `Isolation`, `trustClass` field dropped) and
  `trustProfileFor` take an `Isolation`. New `isolationPermits(isolation, rendererClass)`.
- **Resolve by `kind@version`.** `resolve(table, kind, { version, origin })` — the options argument
  is required. A known kind at an unknown version returns Miss `unavailable`. `BindingTable.byKind`
  is replaced by `byKindVersion` (keyed by the new `bindingKey(kind, version)`) and `versionsByKind`.
  Duplicate detection and host-beats-default precedence are per `kind@version`.
- **Origin.** `origin: 'host' | 'agent'` (new type `Origin`). Agent-origin content is barred from
  ambient-authority isolation (`main-origin`): Miss `quarantined`.
- New exports: `Origin`, `ResolveOptions`, `bindingKey`, `isolationPermits`.

## Unreleased (CW-20260912-0097)

- Declare `tailwindcss: ^4.0.0` as an optional peer for the consumer-owned CSS
  pipeline. npm does not auto-install it or warn when it is missing; incompatible
  installed majors fail peer resolution. Document the explicit build-tool install.
  JavaScript-only consumers can continue without Tailwind.

## 0.1.0 — 2026-09-11

First release, alongside the five other packages in this repo. The set shares a
version number; the release record for all of it is the repo's
[`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

**The binding contract** — which component draws a wire kind, how the payload reaches
it, and at what trust. It names a component *identity*, never an appearance value,
which is what keeps it from becoming a second appearance authority.

This is the layer the portfolio did not have: every app wrote the schema-to-component
mapping by hand, which is the drift mechanism the rest of these packages exist to
close. Zero dependencies; ships TypeScript source.
