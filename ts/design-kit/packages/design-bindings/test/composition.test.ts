/**
 * Composition — a kit's rows are inert, a host's row wins, and nothing is override.
 *
 * These assert settled answers #3 and #5 as behaviour. The STRUCTURAL half of the
 * same defence — that a kit's rows cannot become authoritative even if a kit tries —
 * is in `shape.test.ts`, where it is a compile error rather than an assertion.
 */
import { test } from 'node:test'
import { strictEqual, deepStrictEqual } from 'node:assert/strict'

import {
  defineBindingTable,
  constantTrust,
  resolve,
  isolationFor,
  type BindingRequest,
} from '../src/index.ts'

/** What a kit ships: a request, for a kind it implements. */
const kitDefault: BindingRequest = {
  kind: 'chat.message',
  version: '1.0',
  rendererId: 'kit-chat.message',
  rendererClass: 'react-component',
  entry: '@hollis-labs/kit-chat/MessageCard#MessageCard',
  payload: { from: 'data' },
  requestedTrust: 'core-trusted',
  fallback: { kind: 'none' },
}

const base = {
  contractDigest: 'sha256:test',
  resolverConfig: { inlinePayloadLimitBytes: 262144 },
} as const

test('a kit default composes when the host does not declare the kind itself', () => {
  const t = defineBindingTable({
    ...base,
    trust: constantTrust('core-trusted'),
    defaults: [kitDefault],
    rows: [],
  })
  const r = resolve(t, 'chat.message')
  strictEqual(r.ok, true)
  if (r.ok) strictEqual(r.binding.rendererId, 'kit-chat.message')
})

test('a host row beats a kit default, and the default simply does not compose', () => {
  // This is composition, NOT override. There is no shared table to override; the
  // host is choosing what its own table says. Settled answer #5.
  const hostRow: BindingRequest = { ...kitDefault, rendererId: 'app.message', entry: 'components/Message#Message' }
  const t = defineBindingTable({
    ...base,
    trust: constantTrust('core-trusted'),
    defaults: [kitDefault],
    rows: [hostRow],
  })

  strictEqual(t.rows.length, 1)
  const r = resolve(t, 'chat.message')
  if (r.ok) strictEqual(r.binding.rendererId, 'app.message')
})

test('two kits claiming one kind is ambiguous, not first-wins', () => {
  // Taking the first would be a binding decided by array order — the drift this
  // package exists to remove, arriving as a convenience.
  const otherKit: BindingRequest = { ...kitDefault, rendererId: 'other-kit.message' }
  const t = defineBindingTable({
    ...base,
    trust: constantTrust('core-trusted'),
    defaults: [kitDefault, otherKit],
    rows: [],
  })

  const r = resolve(t, 'chat.message')
  strictEqual(r.ok, false)
  if (r.ok) return
  strictEqual(r.code, 'ambiguous')
  strictEqual(r.reason.includes('declare a single host row'), true)
})

test('a host settles an ambiguity by declaring its own row', () => {
  const otherKit: BindingRequest = { ...kitDefault, rendererId: 'other-kit.message' }
  const hostRow: BindingRequest = { ...kitDefault, rendererId: 'app.message' }
  const t = defineBindingTable({
    ...base,
    trust: constantTrust('core-trusted'),
    defaults: [kitDefault, otherKit],
    rows: [hostRow],
  })

  const r = resolve(t, 'chat.message')
  strictEqual(r.ok, true)
  if (r.ok) strictEqual(r.binding.rendererId, 'app.message')
})

test('a host declaring one kind twice is ambiguous too', () => {
  const t = defineBindingTable({
    ...base,
    trust: constantTrust('core-trusted'),
    rows: [kitDefault, { ...kitDefault, rendererId: 'second' }],
  })
  const r = resolve(t, 'chat.message')
  if (!r.ok) strictEqual(r.code, 'ambiguous')
})

test('isolation is derived from the granted class, never from the request', () => {
  // The request cannot state an isolation — there is no field for it. What a host
  // grants decides where it runs, which is Tangent's rule generalised.
  const t = defineBindingTable({
    ...base,
    trust: constantTrust('sandboxed-code'),
    rows: [{ ...kitDefault, rendererClass: 'sandboxed-frame' }],
  })
  const r = resolve(t, 'chat.message')
  strictEqual(r.ok, true)
  if (!r.ok) return
  strictEqual(r.binding.isolation, 'sandboxed-frame')
  strictEqual(r.binding.isolation, isolationFor('sandboxed-code'))
})

test('a host grant overrides what the row requested, because a request is a request', () => {
  const t = defineBindingTable({
    ...base,
    trust: constantTrust('portfolio-trusted'),
    rows: [kitDefault], // requests 'core-trusted'
  })
  const r = resolve(t, 'chat.message')
  strictEqual(r.ok, true)
  if (r.ok) strictEqual(r.binding.trustClass, 'portfolio-trusted')
})

test('a host policy can decide per row, from evidence the row does not carry', () => {
  const t = defineBindingTable({
    ...base,
    trust: (request) =>
      request.entry.startsWith('@hollis-labs/')
        ? { admit: 'core-trusted' }
        : { quarantine: 'renderers outside the portfolio scope are not admitted in this build' },
    rows: [kitDefault, { ...kitDefault, kind: 'vendor.card', entry: 'vendor/Thing#Thing' }],
  })

  strictEqual(resolve(t, 'chat.message').ok, true)
  const vendor = resolve(t, 'vendor.card')
  strictEqual(vendor.ok, false)
  if (!vendor.ok) strictEqual(vendor.code, 'quarantined')
})

test('composition never throws, and one bad row does not cost the others', () => {
  // A host whose boot dies on a single malformed generated row loses every kind it
  // could have drawn. A miss is a classification here too, not only in resolve.
  const t = defineBindingTable({
    ...base,
    trust: (request) => (request.kind === 'bad' ? { quarantine: 'no' } : { admit: 'core-trusted' }),
    rows: [{ ...kitDefault, kind: 'bad' }, kitDefault],
  })
  strictEqual(t.rows.length, 2)
  strictEqual(resolve(t, 'chat.message').ok, true)
})

test('the contract digest is stamped on the table and every row it composed', () => {
  const t = defineBindingTable({
    ...base,
    contractDigest: 'sha256:catalog-v7',
    trust: constantTrust('core-trusted'),
    rows: [kitDefault],
  })
  strictEqual(t.contractDigest, 'sha256:catalog-v7')
  deepStrictEqual(t.rows.map((row) => row.contractDigest), ['sha256:catalog-v7'])
})

test('the payload ceiling is resolver config, and no row carries the constant', () => {
  // Decided by Chrispian 2026-09-11. All 19 of Tangent's rows carry the identical
  // 262144, so it carries no per-row information — host policy denormalised into a
  // table. Trust is per-row because a binding requests it; isolation is off the row
  // because the host derives it; a ceiling behaves like isolation.
  const t = defineBindingTable({
    ...base,
    resolverConfig: { inlinePayloadLimitBytes: 1024 },
    trust: constantTrust('core-trusted'),
    rows: [kitDefault],
  })

  // The row does not carry it — ABSENT, not undefined-valued.
  strictEqual('inlinePayloadLimitBytes' in t.rows[0]!, false)

  // The ceiling still applies to every resolution. It did not go away; it moved.
  const r = resolve(t, 'chat.message')
  strictEqual(r.ok, true)
  if (r.ok) strictEqual(r.inlinePayloadLimitBytes, 1024)
})

test('a host policy may override the ceiling for one kind', () => {
  const t = defineBindingTable({
    ...base,
    resolverConfig: { inlinePayloadLimitBytes: 262144 },
    trust: (request) =>
      request.kind === 'chat.attachment'
        ? { admit: 'core-trusted', inlinePayloadLimitBytes: 8 }
        : { admit: 'core-trusted' },
    rows: [kitDefault, { ...kitDefault, kind: 'chat.attachment' }],
  })

  const plain = resolve(t, 'chat.message')
  const capped = resolve(t, 'chat.attachment')
  if (plain.ok) strictEqual(plain.inlinePayloadLimitBytes, 262144)
  if (capped.ok) strictEqual(capped.inlinePayloadLimitBytes, 8)

  // The override sits on the row it overrides, and only on that one.
  strictEqual('inlinePayloadLimitBytes' in t.rows[0]!, false)
  strictEqual(t.rows[1]!.inlinePayloadLimitBytes, 8)
})

test('the config is reachable for a miss, which has no row to read', () => {
  // A fallback renderer drawing untrusted content needs the same ceiling.
  const t = defineBindingTable({
    ...base,
    resolverConfig: { inlinePayloadLimitBytes: 4096 },
    trust: constantTrust('core-trusted'),
    rows: [],
  })
  strictEqual(resolve(t, 'nothing.here').ok, false)
  strictEqual(t.resolverConfig.inlinePayloadLimitBytes, 4096)
})
