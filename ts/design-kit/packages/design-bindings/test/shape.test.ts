/**
 * The structural defences, asserted as COMPILE ERRORS.
 *
 * Every `@ts-expect-error` below is a two-way assertion: `tsc` fails if the next
 * line compiles, AND it fails if the directive becomes unnecessary. So this file
 * fails the build both when a defence is removed and when it is quietly widened —
 * which is what makes it a test of behaviour rather than a note about intent.
 *
 * IT IS CHECKED BY `npm run typecheck`, not by the test runner. The runtime test at
 * the bottom exists so the file is not silently excluded from a run; the real
 * assertions are the directives.
 *
 * WHAT IS BEING DEFENDED, and why it is worth this much ceremony:
 *
 *   1. THE ONE RULE — a binding names a component identity, never an appearance
 *      value. Made structural by the row type being closed, so there is nowhere to
 *      put a colour. The alternative was a lint rule; a type that cannot hold a
 *      value beats a rule that objects to one, because it needs no CI step and
 *      nobody to remember it.
 *
 *   2. SETTLED ANSWER #3 — a kit's default rows are inert and cannot become
 *      authoritative. A kit ships requests, and the host-only fields are ABSENT from
 *      a request rather than optional on it, so a kit cannot fill one in and a kit's
 *      rows cannot reach the resolver.
 */
import { test } from 'node:test'
import { ok } from 'node:assert/strict'

import {
  defineBindingTable,
  constantTrust,
  resolve,
  type Binding,
  type BindingRequest,
  type BindingTable,
  type PayloadBinding,
} from '../src/index.ts'

const valid: BindingRequest = {
  kind: 'info-card',
  version: '1.0',
  rendererId: 'info',
  rendererClass: 'react-component',
  entry: 'components/InfoCard#InfoCard',
  payload: { from: 'data' },
  requestedTrust: 'core-trusted',
  fallback: { kind: 'none' },
}

// ===========================================================================
// 1. THE ONE RULE — a binding cannot hold an appearance value
// ===========================================================================

// A colour has nowhere to go.
//
// THE VALUES BELOW ARE DELIBERATELY NOT REAL COLOURS OR SIZES, and that is worth a
// sentence. The assertion is about the FIELD not existing, so the value is
// irrelevant to it — and writing a real hex here trips `design/no-color-literal`
// from the repo's own design-rules gate, which lints this package at zero. Which is
// a small piece of evidence in its own right: the defence has two independent
// layers, and the outer one objected to a hex literal sitting in a contract package
// that ships no appearance at all. It was right to.
// @ts-expect-error — the row type is closed; there is no appearance field on it.
const withColour: BindingRequest = { ...valid, color: 'any-value-at-all' }

// Neither has a size. The one rule covers SCALE as much as colour — `text-[13px]`
// names a value exactly as much as `#1a1b26` does.
// @ts-expect-error — closed.
const withSize: BindingRequest = { ...valid, fontSize: '13px' }

// And neither has a class name, which is the form the violation would most plausibly
// arrive in.
// @ts-expect-error — closed.
const withClassName: BindingRequest = { ...valid, className: 'rounded-md border' }

// THE ESCAPE HATCH IS THE REAL THREAT, and it is the one that would not look like a
// design decision when it landed. A single free-form record re-opens appearance to
// the design layer under the name "renderer options".
// @ts-expect-error — there is no options bag, deliberately. The absence is the feature.
const withOptions: BindingRequest = { ...valid, options: { tone: 'subtle' } }

// The payload union is closed too, so the bag cannot arrive through it.
// @ts-expect-error — 'style' is not a PayloadBinding variant.
const badPayload: PayloadBinding = { from: 'style', value: 'any-value-at-all' }

// ===========================================================================
// 2. SETTLED ANSWER #3 — a kit's rows cannot become authoritative
// ===========================================================================

// A kit cannot declare its own trust. Trust is granted, and the field is absent from
// the request rather than optional on it, so the attempt names the field it may not
// have instead of being silently ignored.
// @ts-expect-error — a declaration may not assert its own privilege.
const selfGranted: BindingRequest = { ...valid, trustClass: 'core-trusted' }

// Nor its own isolation, which the host derives from the grant.
// @ts-expect-error — derived by the host, never declared.
const selfIsolated: BindingRequest = { ...valid, isolation: 'main-origin' }

// A request is not a binding: the host-only fields are missing, so a kit's rows
// cannot be passed anywhere a composed row is expected.
// @ts-expect-error — BindingRequest lacks trustClass, isolation, state, digest, brand.
const requestAsBinding: Binding = valid

// And a kit cannot write the composed shape out by hand, which is the case the type
// split alone would not cover. The brand cannot be named outside the package.
const handBuilt = {
  ...valid,
  trustClass: 'core-trusted' as const,
  isolation: 'main-origin' as const,
  state: 'available' as const,
  stateReason: '',
  contractDigest: 'sha256:forged',
}
// @ts-expect-error — no brand, and there is no way to write one.
const forgedBinding: Binding = handBuilt

// A kit cannot set a payload ceiling, which is the check that matters most after
// moving it. The ceiling became resolver config on 2026-09-11, and the move would
// have been a regression if it had landed anywhere a kit can write: a ceiling is a
// fact only a host can know, exactly like trust and isolation. It lives in
// ResolverConfig, and the per-row override is settable ONLY from a HostPolicy's
// decision — so there is no field here to set.
// @ts-expect-error — host policy. A kit may not bound its own payload.
const selfCapped: BindingRequest = { ...valid, inlinePayloadLimitBytes: 1 }

// Nor by smuggling it through a nested config object.
// @ts-expect-error — closed; there is no resolverConfig on a declared row either.
const selfConfigured: BindingRequest = { ...valid, resolverConfig: { inlinePayloadLimitBytes: 1 } }

// A kit cannot mint a table either, so it cannot hand a host something that already
// claims authority over wire kinds.
// @ts-expect-error — BindingTable is branded; only defineBindingTable produces one.
const forgedTable: BindingTable = { contractDigest: 'x', rows: [], byKind: new Map() }

// And the resolver refuses anything that did not come from a host's composition.
// Inside a function that is never called: the assertion is the compile error, and
// running the line would throw for the uninteresting reason that an array has no
// lookup index.
function resolverRefusesAnArray() {
  // @ts-expect-error — an array of requests is not a table.
  return resolve([valid], 'info-card')
}

// ===========================================================================
// 3. WHAT IS DELIBERATELY ALLOWED, so the defences are not read as wider than they are
// ===========================================================================

// A host composes freely. This is the permitted path, and it must keep compiling.
const hostTable: BindingTable = defineBindingTable({
  contractDigest: 'sha256:test',
  resolverConfig: { inlinePayloadLimitBytes: 262144 },
  trust: constantTrust('core-trusted'),
  defaults: [valid],
  rows: [],
})

// `resolve` takes a plain string, not the host's generated kind union — the unknown
// kind is the case it exists for.
const unknown = resolve(hostTable, 'a.kind.this.host.never.heard.of')

test('the defences in this file are checked by typecheck, not by this runner', () => {
  // Referenced so `noUnusedLocals` does not remove the assertions above.
  ok([withColour, withSize, withClassName, withOptions, badPayload].length === 5)
  ok([selfGranted, selfIsolated, selfCapped, selfConfigured].length === 4)
  ok([requestAsBinding, forgedBinding, forgedTable].length === 3)
  ok(hostTable.rows.length === 1)
  ok(unknown.ok === false)
  ok(typeof resolverRefusesAnArray === 'function')
})
