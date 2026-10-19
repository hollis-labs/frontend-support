/**
 * The two ApprovalCard rows — same renderer, two payload paths.
 *
 * READ THIS BEFORE TREATING A GREEN RUN AS PROOF SOMETHING SHIPPED WORKING.
 *
 * This is the FIRST EXERCISE of the N:1 path, not a regression check on a working
 * one. The distinction matters because three documents — the CW-0123 proposal, its
 * settled comment, and this task's own description — say the N:1 case is "already
 * solved" by Tangent's `rendererId` being distinct from `kind`. Measured in
 * `apps/tangent/ui/src/generated/renderer-bindings.ts` on 2026-09-11: 19 rows carry
 * 19 DISTINCT `rendererId`s. No value is used twice. The capability is real and
 * expressible; nothing has ever run it.
 *
 * That is the fourth instance in this epic of a capability read off a vocabulary
 * rather than off its exercise — the same shape as ResponseV1's `partial`, where the
 * enum contained the value so everyone credited the behaviour and the write path
 * contradicted it. See `[[verify_capability_claims_against_write_path]]`.
 *
 * So the rows below are NOT quoted from a shipped table. They are the pair from
 * go-envelopes' deleted `ENVELOPE_IMPORT_METADATA`, recorded in CW-0113's 17-row
 * table: `approval-card` → `ApprovalCard` with `props: "approval"`, and
 * `subagent-spawn-approval` → the same component and export with no `props` at all.
 * The `rendererId: "approval"` string is this design's, because the shipped metadata
 * had no such field — that is exactly what it was missing. What is asserted here is
 * the SEMANTIC PAIR, which is what has to work: one renderer, two payload paths.
 */
import { test } from 'node:test'
import { deepStrictEqual, strictEqual, notDeepStrictEqual } from 'node:assert/strict'

import {
  defineBindingTable,
  constantTrust,
  resolve,
  parseEntry,
  type BindingRequest,
} from '../src/index.ts'

/** `approval-card` fed the envelope's `approval` field. Was `props: "approval"`. */
const approvalCard: BindingRequest = {
  kind: 'approval-card',
  version: '1.0',
  rendererId: 'approval',
  rendererClass: 'react-component',
  entry: 'components/chat/envelopes/ApprovalCard#ApprovalCard',
  payload: { from: 'field', field: 'approval', as: 'approval' },
  requestedTrust: 'core-trusted',
  fallback: { kind: 'none' },
}

/** `subagent-spawn-approval` fed `envelope.data`. Same component, no `props`. */
const subagentSpawnApproval: BindingRequest = {
  kind: 'subagent-spawn-approval',
  version: '1.0',
  rendererId: 'approval',
  rendererClass: 'react-component',
  entry: 'components/chat/envelopes/ApprovalCard#ApprovalCard',
  payload: { from: 'data' },
  requestedTrust: 'core-trusted',
  fallback: { kind: 'none' },
}

function table() {
  return defineBindingTable({
    contractDigest: 'sha256:test',
    resolverConfig: { inlinePayloadLimitBytes: 262144 },
    trust: constantTrust('core-trusted'),
    rows: [approvalCard, subagentSpawnApproval],
  })
}

test('both rows resolve, and they share one renderer identity', () => {
  const t = table()
  const a = resolve(t, 'approval-card')
  const b = resolve(t, 'subagent-spawn-approval')

  strictEqual(a.ok, true)
  strictEqual(b.ok, true)
  if (!a.ok || !b.ok) return

  strictEqual(a.binding.rendererId, 'approval')
  strictEqual(b.binding.rendererId, 'approval')
  strictEqual(a.binding.entry, b.binding.entry)
})

test('the payload paths differ, which is what Record<kind, string> cannot express', () => {
  const t = table()
  const a = resolve(t, 'approval-card')
  const b = resolve(t, 'subagent-spawn-approval')
  if (!a.ok || !b.ok) throw new Error('both rows must resolve')

  // A `Record<kind, string>` maps each kind to one component identity. These two
  // kinds agree on identity and disagree on everything the host must do with it, so
  // that shape loses the difference entirely — which is the whole argument for
  // PayloadBinding being a field rather than a convention.
  strictEqual(a.binding.rendererId, b.binding.rendererId)
  notDeepStrictEqual(a.binding.payload, b.binding.payload)
})

test('each payload binding round-trips through composition unchanged', () => {
  const t = table()
  const a = resolve(t, 'approval-card')
  const b = resolve(t, 'subagent-spawn-approval')
  if (!a.ok || !b.ok) throw new Error('both rows must resolve')

  deepStrictEqual(a.binding.payload, { from: 'field', field: 'approval', as: 'approval' })
  deepStrictEqual(b.binding.payload, { from: 'data' })
})

test('the merged entry splits back into the component and export it was made from', () => {
  // go-envelopes carried `component` and `export` as two fields and needed
  // `dependentRequired` in its metaschema to stop them drifting. One string makes
  // the drift unrepresentable; this asserts nothing was lost by merging them.
  deepStrictEqual(parseEntry(approvalCard.entry), {
    module: 'components/chat/envelopes/ApprovalCard',
    symbol: 'ApprovalCard',
  })
})

test('a third kind can join the same renderer without touching the other two', () => {
  // The N:1 property, stated as the thing it actually buys.
  const t = defineBindingTable({
    contractDigest: 'sha256:test',
    resolverConfig: { inlinePayloadLimitBytes: 262144 },
    trust: constantTrust('core-trusted'),
    rows: [
      approvalCard,
      subagentSpawnApproval,
      { ...approvalCard, kind: 'tool-use-approval', payload: { from: 'whole' } },
    ],
  })

  const ids = t.rows.map((row) => row.rendererId)
  deepStrictEqual(ids, ['approval', 'approval', 'approval'])
  const c = resolve(t, 'tool-use-approval')
  strictEqual(c.ok, true)
  if (c.ok) deepStrictEqual(c.binding.payload, { from: 'whole' })
})
