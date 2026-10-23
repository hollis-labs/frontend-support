import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardSlot, createCardRegistry } from '../registry'

const Note = () => <p>drawn</p>
const grantExceptCore = ({ requestedTrust }: { requestedTrust: string }) =>
  requestedTrust === 'core-trusted' ? null : (requestedTrust as 'portfolio-trusted')

describe('card registry', () => {
  it('resolves an exact (kind, version)', () => {
    const r = createCardRegistry({ grantTrust: grantExceptCore })
    r.register('sample.note', '1', Note, { type: 'object' })
    const res = r.resolve({ kind: 'sample.note', version: '1' })
    expect(res.ok && res.entry.schema).toEqual({ type: 'object' })
  })

  it('degrades unknown kinds and unknown versions, never to nothing', () => {
    const r = createCardRegistry({ grantTrust: grantExceptCore })
    r.register('sample.note', '1', Note, {})
    expect(r.resolve({ kind: 'sample.zzz', version: '1' })).toMatchObject({ ok: false, code: 'unclassified' })
    expect(r.resolve({ kind: 'sample.note', version: '3' })).toMatchObject({ ok: false, code: 'unavailable' })
  })

  it('quarantines a refused trust claim and never downgrades it', () => {
    const r = createCardRegistry({ grantTrust: grantExceptCore })
    r.register('sample.claim', '1', Note, {}, { requestedTrust: 'core-trusted' })
    expect(r.resolve({ kind: 'sample.claim', version: '1' })).toMatchObject({ ok: false, code: 'quarantined' })
    expect(r.list()[0].grantedTrust).toBeNull()
  })

  it('refuses everything by default: a host that grants nothing serves nothing', () => {
    const r = createCardRegistry()
    r.register('sample.note', '1', Note, {})
    expect(r.resolve({ kind: 'sample.note', version: '1' })).toMatchObject({ ok: false, code: 'quarantined' })
  })

  it('keeps agent-originated content off renderers with ambient host authority', () => {
    const r = createCardRegistry({ grantTrust: ({ requestedTrust }) => requestedTrust })
    r.register('sample.note', '1', Note, {}, { requestedTrust: 'portfolio-trusted' })
    r.register('sample.safe', '1', Note, {}, { requestedTrust: 'declarative', rendererClass: 'declarative' })
    expect(r.resolve({ kind: 'sample.note', version: '1', origin: 'agent' })).toMatchObject({ ok: false, code: 'quarantined' })
    expect(r.resolve({ kind: 'sample.note', version: '1', origin: 'host' }).ok).toBe(true)
    expect(r.resolve({ kind: 'sample.safe', version: '1', origin: 'agent' }).ok).toBe(true)
  })

  it('rejects a grant that does not permit the renderer class', () => {
    const r = createCardRegistry({ grantTrust: () => 'declarative' })
    r.register('sample.note', '1', Note, {}) // react-component is not allowed under `declarative`
    expect(r.resolve({ kind: 'sample.note', version: '1' })).toMatchObject({ ok: false, code: 'quarantined' })
  })

  it('throws on a duplicate (kind, version) instead of choosing by call order', () => {
    const r = createCardRegistry({ grantTrust: grantExceptCore })
    r.register('sample.note', '1', Note, {})
    expect(() => r.register('sample.note', '1', Note, {})).toThrow(/already registered/)
  })

  it('has no module-level state: two registries are independent', () => {
    const a = createCardRegistry({ grantTrust: grantExceptCore })
    const b = createCardRegistry({ grantTrust: grantExceptCore })
    a.register('sample.note', '1', Note, {})
    expect(b.list()).toEqual([])
  })
})

describe('CardSlot', () => {
  it('draws the component, a miss card, or the boundary — never blank', () => {
    const r = createCardRegistry({ grantTrust: grantExceptCore })
    r.register('sample.note', '1', Note, {})
    r.register('sample.boom', '1', () => { throw new Error('kaboom') }, {})
    const quiet = console.error
    console.error = () => {}
    try {
      const { rerender } = render(<CardSlot registry={r} kind="sample.note" version="1" props={{}} />)
      expect(screen.getByText('drawn')).toBeTruthy()
      rerender(<CardSlot registry={r} kind="sample.nope" version="1" props={{}} />)
      expect(screen.getByText('sample.nope')).toBeTruthy()
      rerender(<CardSlot registry={r} kind="sample.boom" version="1" props={{}} />)
      expect(screen.getByText('kaboom')).toBeTruthy()
    } finally {
      console.error = quiet
    }
  })
})
