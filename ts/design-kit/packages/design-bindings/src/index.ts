/**
 * `@hollis-labs/design-bindings` — the binding contract.
 *
 * The fourth row of the portfolio's ownership table, and until now the one with no
 * owner:
 *
 *   wire      type name, schema, validation, response payloads   go-envelopes
 *   design    tokens, components, appearance                     the design-kit packages
 *   behavior  resolver lease, draft custody, submit gates        the app
 *   binding   "this schema renders as these components"          HERE
 *
 * Every app used to write the fourth one by hand, which is the drift mechanism N
 * consumers deep: Nanite writes one, Tangent writes another, and the two diverge
 * without either being wrong.
 *
 * WHAT THIS PACKAGE SHIPS, AND THE ONE THING IT DOES NOT:
 *   - the row SHAPE (`BindingRequest`, `Binding`)
 *   - the GENERATOR CONTRACT (`defineBindingTable`, `HostPolicy`)
 *   - the RESOLVER (`resolve`)
 *   - NO TABLE. Not now, not later. A binding names components in one host's module
 *     tree, so the table is host-local by construction — which is precisely why
 *     `component:` was wrong in go-envelopes, and is the structural reason this
 *     design can refuse override while still allowing customisation.
 *
 * Zero runtime dependencies, and no React: this answers which entry, with which
 * payload path, at which trust. The host renders.
 *
 * START WITH `binding.ts`. Its header carries the one rule and why the row type is
 * closed, and the two-type split there is the load-bearing idea in the package.
 */
export type {
  PayloadBinding,
  FallbackBinding,
  BindingState,
  BindingRequest,
  Binding,
} from './binding.ts'

export type {
  RendererClass,
  TrustClass,
  Isolation,
  TrustProfile,
} from './trust.ts'
export { TRUST_PROFILES, trustProfileFor, isolationFor, trustClassPermits } from './trust.ts'

export type {
  HostDecision,
  HostPolicy,
  ResolverConfig,
  BindingTableSpec,
  BindingTable,
} from './table.ts'
export { defineBindingTable, constantTrust } from './table.ts'

export type { MissCode, Drawable, Miss, Resolution, ParsedEntry } from './resolve.ts'
export { resolve, safeFallbackOf, parseEntry } from './resolve.ts'
