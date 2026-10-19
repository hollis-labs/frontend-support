/**
 * A miss is a classification, never an exception.
 *
 * The failure these assertions exist to prevent is the one settled answer #4 names:
 * a silently dropped envelope is how an agent's message disappears with no trace.
 * So `resolve` must never throw and must never leave a caller with nothing to draw —
 * and the four codes must stay distinguishable, because they are four different
 * things for an operator to do.
 */
import { test } from 'node:test'
import { strictEqual, doesNotThrow } from 'node:assert/strict'

import {
  defineBindingTable,
  constantTrust,
  resolve,
  type BindingRequest,
  type HostPolicy,
} from '../src/index.ts'

const card: BindingRequest = {
  kind: 'info-card',
  version: '1.0',
  rendererId: 'info',
  rendererClass: 'react-component',
  entry: 'components/InfoCard#InfoCard',
  payload: { from: 'data' },
  requestedTrust: 'core-trusted',
  fallback: { kind: 'none' },
}

function tableWith(rows: readonly BindingRequest[], trust: HostPolicy = constantTrust('core-trusted')) {
  return defineBindingTable({
    contractDigest: 'sha256:test',
    resolverConfig: { inlinePayloadLimitBytes: 262144 },
    trust,
    rows,
  })
}

test('an unknown kind is classified, not thrown — the normal plugin case', () => {
  const t = tableWith([card])
  doesNotThrow(() => resolve(t, 'some.plugin.kind.nobody.ships'))

  const r = resolve(t, 'some.plugin.kind.nobody.ships')
  strictEqual(r.ok, false)
  if (r.ok) return
  strictEqual(r.code, 'unclassified')
  strictEqual(r.kind, 'some.plugin.kind.nobody.ships')
  // The kind is echoed and the reason names it, so a host can say WHICH envelope it
  // could not draw rather than showing an anonymous gap.
  strictEqual(r.reason.includes('some.plugin.kind.nobody.ships'), true)
})

test('resolve does not throw on the degenerate inputs a real wire produces', () => {
  const t = tableWith([card])
  for (const kind of ['', ' ', '__proto__', 'constructor', 'toString', '0']) {
    doesNotThrow(() => resolve(t, kind), `threw on ${JSON.stringify(kind)}`)
    strictEqual(resolve(t, kind).ok, false)
  }
})

test('an empty table classifies every kind rather than failing to build', () => {
  const t = tableWith([])
  strictEqual(t.rows.length, 0)
  const r = resolve(t, 'info-card')
  strictEqual(r.ok, false)
  if (!r.ok) strictEqual(r.code, 'unclassified')
})

test('a refused trust claim is quarantined and says so, and is never downgraded', () => {
  const t = tableWith([card], () => ({ quarantine: 'the publisher signature did not verify' }))
  const r = resolve(t, 'info-card')

  strictEqual(r.ok, false)
  if (r.ok) return
  strictEqual(r.code, 'quarantined')
  strictEqual(r.reason, 'the publisher signature did not verify')

  // Not downgraded: the row did not quietly become a weaker trust class that would
  // have been allowed to run. It kept what it asked for and is refused.
  const row = t.rows[0]!
  strictEqual(row.state, 'quarantined')
  strictEqual(row.trustClass, 'core-trusted')
})

test('an incoherent grant is quarantined by composition, whatever the host said', () => {
  // `declarative` trust cannot contain a `sandboxed-frame` renderer. That is a
  // category error rather than a policy choice, so composition refuses it — as a
  // quarantine, never as a downgrade to a class that happens to fit.
  const sandboxed: BindingRequest = {
    ...card,
    kind: 'third-party-widget',
    rendererClass: 'sandboxed-frame',
    requestedTrust: 'sandboxed-code',
  }
  const t = tableWith([sandboxed], constantTrust('declarative'))
  const r = resolve(t, 'third-party-widget')

  strictEqual(r.ok, false)
  if (r.ok) return
  strictEqual(r.code, 'quarantined')
  strictEqual(r.reason.includes('refused rather than downgraded'), true)
})

test('unavailable is distinct from unclassified, because the remedies differ', () => {
  const t = tableWith([card], () => ({ unavailable: 'this build ships no approvals UI' }))
  const r = resolve(t, 'info-card')

  strictEqual(r.ok, false)
  if (r.ok) return
  strictEqual(r.code, 'unavailable')
  strictEqual(r.reason, 'this build ships no approvals UI')
})

test('a safe fallback is offered on a miss', () => {
  const withFallback: BindingRequest = {
    ...card,
    fallback: { kind: 'safe', rendererId: 'generic-json', degradation: 'renders the payload as a titled JSON view' },
  }
  const t = tableWith([withFallback], () => ({ unavailable: 'not in this build' }))
  const r = resolve(t, 'info-card')

  strictEqual(r.ok, false)
  if (!r.ok) strictEqual(r.fallbackRendererId, 'generic-json')
})

test('an UNSAFE fallback is recorded on the row and never offered', () => {
  // The rule that comes with the field, or the field is decoration. Degrading a
  // structured decision into something that cannot express it returns a success the
  // user acts on — worse than refusing, and invisible.
  const withUnsafe: BindingRequest = {
    ...card,
    kind: 'approval-card',
    fallback: { kind: 'unsafe', rendererId: 'plain-text', degradation: 'drops the approve/deny control' },
  }
  const t = tableWith([withUnsafe], () => ({ unavailable: 'not in this build' }))
  const r = resolve(t, 'approval-card')

  strictEqual(r.ok, false)
  if (r.ok) return
  strictEqual(r.fallbackRendererId, null)

  // Recorded, though — which is why `unsafe` is a separate variant from `none`. An
  // operator can see a fallback exists and why it is withheld.
  strictEqual(t.rows[0]!.fallback.kind, 'unsafe')
})

test('no fallback yields null, which means draw the generic view and name the kind', () => {
  const t = tableWith([card], () => ({ unavailable: 'not in this build' }))
  const r = resolve(t, 'info-card')
  if (!r.ok) strictEqual(r.fallbackRendererId, null)
})
