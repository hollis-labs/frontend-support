import { describe, expect, it } from 'vitest'
import {
  createRefreshRegistry,
  defaultRefreshRegistry,
  refreshPolledData,
} from '../hooks/use-poll'

/**
 * The registry replaced a bare module-level `Set` during the extraction, per the
 * CW-0116 triage. These pin the two things that change matters for — isolation
 * between registries, and the default still refreshing everything — plus the
 * mutation-during-iteration case the old `Set` would have thrown on.
 */
describe('createRefreshRegistry', () => {
  it('fires every subscriber', () => {
    const r = createRefreshRegistry()
    let a = 0
    let b = 0
    r.subscribe(() => { a++ })
    r.subscribe(() => { b++ })
    r.refresh()
    expect([a, b]).toEqual([1, 1])
  })

  it('unsubscribes', () => {
    const r = createRefreshRegistry()
    let n = 0
    const off = r.subscribe(() => { n++ })
    r.refresh()
    off()
    r.refresh()
    expect(n).toBe(1)
    expect(r.size).toBe(0)
  })

  it('isolates registries from each other — the point of the change', () => {
    const one = createRefreshRegistry()
    const two = createRefreshRegistry()
    let a = 0
    let b = 0
    one.subscribe(() => { a++ })
    two.subscribe(() => { b++ })
    one.refresh()
    expect([a, b]).toEqual([1, 0])
  })

  it('survives a listener that unsubscribes during refresh', () => {
    const r = createRefreshRegistry()
    let n = 0
    const off = r.subscribe(() => { n++; off() })
    r.subscribe(() => { n++ })
    expect(() => r.refresh()).not.toThrow()
    expect(n).toBe(2)
    expect(r.size).toBe(1)
  })

  it('tracks size', () => {
    const r = createRefreshRegistry()
    expect(r.size).toBe(0)
    const off = r.subscribe(() => {})
    expect(r.size).toBe(1)
    off()
    expect(r.size).toBe(0)
  })
})

describe('refreshPolledData', () => {
  it('drives the default registry, so the old API still works', () => {
    let n = 0
    const off = defaultRefreshRegistry.subscribe(() => { n++ })
    refreshPolledData()
    off()
    expect(n).toBe(1)
  })
})
