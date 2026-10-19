import { describe, expect, it, vi } from 'vitest'
import { contributionId } from '../src/host.js'
import { createPluginLayoutStore } from '../src/layout.js'
import { orderContributions } from '../src/order.js'
import { harness } from './helpers.js'
describe('host controller', () => {
  it('reconciles once for many retainers and restores panels after strict-effect cleanup', () => {
    const h = harness(), release = h.runtime.retain(), second = h.runtime.retain()
    expect(h.panels.reconcile).toHaveBeenCalledTimes(1)
    release(); expect(h.panels.releaseScope).not.toHaveBeenCalled()
    second(); second(); expect(h.panels.releaseScope).toHaveBeenCalledTimes(1)
    h.runtime.retain()(); expect(h.panels.reconcile).toHaveBeenCalledTimes(2)
  })
  it('keeps snapshots stable and fences revoked exports immediately', () => {
    const h = harness(); h.runtime.retain()
    const snapshot = h.runtime.getSnapshot(), view = snapshot.views[0]!
    expect(h.runtime.getSnapshot()).toBe(snapshot)
    expect(h.runtime.isCurrent(view)).toBe(true)
    h.revoke(); expect(h.runtime.isCurrent(view)).toBe(false)
  })
  it('projects non-selected and unknown entries without resolving them', async () => {
    const h = harness(); h.runtime.retain()
    for (const status of ['declared_not_selected', 'unavailable', 'future']) {
      await h.runtime.sync([{ ...h.entry(), status }])
      expect(h.runtime.getSnapshot().views[0]?.availability).toBe('inactive')
      expect(h.runtime.getSnapshot().views[0]?.value).toBeUndefined()
    }
    expect(h.diagnostics).toHaveBeenCalledWith(expect.objectContaining({ reason: 'unknown-status' }))
  })
  it('has no isolation default and never renders frame-mode views in the same realm', () => {
    const h = harness(); h.runtime.retain()
    h.isolation.set({ appId: 'app', effectiveMode: 'sandboxed-frame', revision: '2' })
    const view = h.runtime.getSnapshot().views[0]!
    expect(view.availability).toBe('isolated-controller-required'); expect(h.runtime.isCurrent(view)).toBe(false)
    expect(h.panels.reconcile).toHaveBeenLastCalledWith(h.runtime.scope, [])
    h.runtime.dispose(); h.runtime.dispose()
    expect(h.runtime.getSnapshot().views).toEqual([])
    expect(() => h.runtime.retain()).toThrow('disposed')
  })
})
it('orders saved identities first, applies explicit priorities and retains new declarations', () => {
  const h = harness(); h.runtime.retain(); const view = h.runtime.getSnapshot().views[0]!
  const next = { ...view, id: contributionId({ ...view.ref, key: 'new' }), ref: { ...view.ref, key: 'new' }, priority: 1 }
  expect(orderContributions([view, next], [view.id]).map(v => v.id)).toEqual([view.id, next.id])
  expect(orderContributions([view, next]).map(v => v.id)).toEqual([next.id, view.id])
})
it('scopes layout keys and persists preferences without host context or plugin data', () => {
  const data = new Map<string, string>(), storage = { read: (key: string) => data.get(key) ?? null, write: (key: string, value: string) => { data.set(key, value) }, remove: (key: string) => { data.delete(key) } }
  const scope = { appId: 'app', environmentId: 'prod', projectId: 'one', clientId: 'browser' }
  const a = createPluginLayoutStore(storage, scope, 'rail'), b = createPluginLayoutStore(storage, { ...scope, projectId: 'two' }, 'rail')
  a.save({ order: ['gone', 'one'], visibility: { one: false }, selected: 'one' })
  a.reconcile(['one', 'new'])
  expect(a.getSnapshot().order).toEqual(['gone', 'one', 'new'])
  expect(b.getSnapshot().order).toEqual([])
  expect(a.key).not.toBe(b.key)
  const reload = createPluginLayoutStore(storage, scope, 'rail')
  expect(reload.getSnapshot()).toEqual(a.getSnapshot())
  a.reset(); expect(data.has(a.key)).toBe(false)
})
it('fences old generations even when the exported function is reused', async () => {
  const h = harness(); h.runtime.retain(); const old = h.runtime.getSnapshot().views[0]!
  await h.runtime.sync([{ ...h.entry(), owner_generation: '2' }])
  expect(h.runtime.isCurrent(old)).toBe(false)
  expect(h.runtime.isCurrent(h.runtime.getSnapshot().views[0]!)).toBe(true)
})
it('does not publish late async completion after disposal', async () => {
  const h = harness(); let complete!: () => void
  const sync = h.registry.sync.bind(h.registry)
  h.registry.sync = async input => { await new Promise<void>(done => { complete = done }); await sync(input) }
  h.runtime.retain(); const pending = h.runtime.sync([h.entry()])
  h.runtime.dispose(); const snapshot = h.runtime.getSnapshot(); complete(); await pending
  expect(h.runtime.getSnapshot()).toBe(snapshot)
  expect(snapshot.views).toEqual([])
})
it('diagnoses persistence failure while retaining in-memory preferences', () => {
  const diagnostic = vi.fn()
  const storage = { read: () => '{bad', write: () => { throw new Error('storage full') }, remove: () => {} }
  const layout = createPluginLayoutStore(storage, { appId: 'a', environmentId: 'b', clientId: 'c' }, 'rail', 1, diagnostic)
  layout.save({ order: ['one'], visibility: {} })
  expect(layout.getSnapshot().order).toEqual(['one'])
  expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ reason: 'layout-write-failed' }))
})

it('breaks mixed-kind region ties by owner/key before kind and generation', () => {
  const h = harness(); h.runtime.retain(); const view = h.runtime.getSnapshot().views[0]!
  const a = { ...view, ref: { ...view.ref, owner: 'a-owner', kind: 'widget' } }
  const z = { ...view, ref: { ...view.ref, owner: 'z-owner', kind: 'panel' } }
  expect(orderContributions([z, a]).map(item => item.ref.owner)).toEqual(['a-owner', 'z-owner'])
  const sameOwner = { ...z, ref: { ...z.ref, key: 'a-key', kind: 'widget' } }
  expect(orderContributions([z, sameOwner]).map(item => item.ref.key)).toEqual(['a-key', 'view'])
})
