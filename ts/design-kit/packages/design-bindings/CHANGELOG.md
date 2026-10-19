# @hollis-labs/design-bindings

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
