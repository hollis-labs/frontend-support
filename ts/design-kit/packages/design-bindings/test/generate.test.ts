/**
 * The generator — deterministic output, and explicit unresolved entries instead of a default renderer.
 */
import { test } from 'node:test'
import { strictEqual, deepStrictEqual, ok } from 'node:assert/strict'

import {
  generateBindingTable,
  serializeBindingTable,
  tableVersionOf,
  type CatalogRow,
  type HostProfile,
} from '../src/index.ts'

const row = (kind: string, rendererId: string, rendererClass: CatalogRow['rendererClass'] = 'declarative'): CatalogRow => ({
  kind,
  version: '1',
  rendererId,
  rendererClass,
  entry: `kit#${rendererId}`,
  payload: { from: 'data' },
  requestedIsolation: 'host-primitive',
  fallback: { kind: 'none' },
})

const rows = [
  row('page.list', 'list-page'),
  row('page.form', 'form-page', 'react-component'),
  row('card.info', 'info'),
]
const catalog = { contractDigest: 'sha-test', rows }
const profile: HostProfile = {
  id: 'p',
  origins: ['host', 'agent'],
  isolation: { declarative: 'host-primitive', 'react-component': 'main-origin' },
  resolverConfig: { inlinePayloadLimitBytes: 1024 },
}

test('same catalog and profile yield a byte-identical table, whatever the input order', () => {
  const a = serializeBindingTable(generateBindingTable({ catalog, profile }))
  const b = serializeBindingTable(generateBindingTable({ catalog: { ...catalog, rows: [...rows].reverse() }, profile }))
  strictEqual(a, b)
  ok(a.endsWith('}\n'))
})

test('the version changes when anything in the table changes', () => {
  const a = generateBindingTable({ catalog, profile })
  const b = generateBindingTable({ catalog, profile: { ...profile, resolverConfig: { inlinePayloadLimitBytes: 2048 } } })
  ok(a.version.startsWith('bt1-'))
  ok(a.version !== b.version)
  strictEqual(tableVersionOf(a), a.version)
})

test('a react-component row on main-origin serves host content only', () => {
  const t = generateBindingTable({ catalog, profile })
  const form = t.rows.find((r) => r.key === 'page.form@1')
  deepStrictEqual(form?.origins, ['host'])
  deepStrictEqual(t.rows.find((r) => r.key === 'page.list@1')?.origins, ['agent', 'host'])
})

test('an unknown kind or version is unresolved, not defaulted', () => {
  const t = generateBindingTable({
    catalog,
    profile,
    demand: [{ kind: 'page.list', version: '1' }, { kind: 'hologram', version: '1' }, { kind: 'page.list', version: '9' }],
  })
  deepStrictEqual(t.rows.map((r) => r.key), ['page.list@1'])
  deepStrictEqual(t.unresolved.map((u) => [u.key, u.code]), [['hologram@1', 'unknown-kind'], ['page.list@9', 'unknown-version']])
})

test('an origin the profile does not permit is unresolved', () => {
  const hostOnly = { ...profile, origins: ['host'] as const }
  const t = generateBindingTable({ catalog, profile: hostOnly, demand: [{ kind: 'card.info', version: '1', origin: 'agent' }] })
  deepStrictEqual(t.rows, [])
  strictEqual(t.unresolved[0]?.code, 'origin-not-permitted')
  const ambient = generateBindingTable({ catalog, profile, demand: [{ kind: 'page.form', version: '1', origin: 'agent' }] })
  strictEqual(ambient.unresolved[0]?.code, 'origin-not-permitted')
})

test('a class the profile grants nothing to is unavailable, and a quarantined renderer is quarantined', () => {
  const t = generateBindingTable({
    catalog: { ...catalog, rows: [...rows, row('x.frame', 'frame', 'sandboxed-frame')] },
    profile: { ...profile, quarantine: { info: 'withdrawn' } },
  })
  ok('unavailable' in (t.rows.find((r) => r.key === 'x.frame@1')?.decision ?? {}))
  deepStrictEqual(t.rows.find((r) => r.key === 'card.info@1')?.decision, { quarantine: 'withdrawn' })
})
