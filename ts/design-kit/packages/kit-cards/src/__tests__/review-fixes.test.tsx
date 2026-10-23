import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createCardEngine, type CardRule } from '../engine'
import { compileFormSchema } from '../form/schema'
import { ApprovalCard, FormCard } from '..'

afterEach(cleanup)

const rule: CardRule = { id: 'r', match: { kind: 'test' }, surface: 'inline', dedupeBy: ['kind', 'subject'] }
const make = () => createCardEngine({ rules: [rule], now: () => 0 })

describe('review: engine revision fences and dedupe policy', () => {
  it('held revisions never regress', () => {
    const e = make()
    e.ingest({ id: 'a', kind: 'test', revision: 1 })
    e.setEditing('a', true)
    e.ingest({ id: 'a', kind: 'test', revision: 3 })
    e.ingest({ id: 'a', kind: 'test', revision: 2 })
    e.applyPending('a')
    expect(e.get('a')?.input.revision).toBe(3)
  })

  it('server-state revisions fence later stale state', () => {
    const e = make()
    e.ingest({ id: 'a', kind: 'test', revision: 1 })
    e.applyServerState('a', 'approved', { revision: 5 })
    e.applyServerState('a', 'pending', { revision: 2 })
    expect(e.get('a')?.status).toBe('approved')
  })

  it('a server revision also fences a later stale ingest', () => {
    const e = make()
    e.ingest({ id: 'a', kind: 'test', revision: 1 })
    e.applyServerState('a', 'approved', { revision: 5 })
    e.ingest({ id: 'a', kind: 'test', revision: 3 })
    expect(e.get('a')?.input.revision).toBe(1)
    expect(e.get('a')?.status).toBe('approved')
  })

  it('an older held edit cannot roll back a newer server resolution', () => {
    const e = createCardEngine({ rules: [{ id: 'r', match: { kind: 'test' }, surface: 'inline' }], now: () => 0 })
    e.ingest({ id: 'a', kind: 'test', revision: 1 })
    e.setEditing('a', true)
    e.ingest({ id: 'a', kind: 'test', revision: 3 })
    e.applyServerState('a', 'approved', { revision: 5 })
    expect(e.get('a')?.updatedAvailable).toBe(false)
    e.applyPending('a')
    expect(e.get('a')?.status).toBe('approved')
    expect(e.get('a')?.input.revision).not.toBe(3)
  })

  it('an old held update cannot replace a newer applied input', () => {
    const e = createCardEngine({ rules: [{ id: 'r', match: { kind: 'test' }, surface: 'inline' }], now: () => 0 })
    e.ingest({ id: 'a', kind: 'test', revision: 1 })
    e.setEditing('a', true)
    e.ingest({ id: 'a', kind: 'test', revision: 3 })
    e.setEditing('a', false)
    e.ingest({ id: 'a', kind: 'test', revision: 4 })
    e.applyPending('a')
    expect(e.get('a')?.input.revision).toBe(4)
  })

  it('a still-current held edit is applied', () => {
    const e = createCardEngine({ rules: [{ id: 'r', match: { kind: 'test' }, surface: 'inline' }], now: () => 0 })
    e.ingest({ id: 'a', kind: 'test', revision: 1 })
    e.setEditing('a', true)
    e.ingest({ id: 'a', kind: 'test', revision: 3 })
    e.applyPending('a')
    expect(e.get('a')?.input.revision).toBe(3)
  })

  it('editing preserves plain dedupe rather than superseding', () => {
    const e = make()
    e.ingest({ id: 'a', kind: 'test', subject: 's' })
    e.setEditing('a', true)
    e.ingest({ id: 'b', kind: 'test', subject: 's' })
    e.applyPending('a')
    expect(e.snapshot().order).toEqual(['a'])
    expect(e.get('a')?.status).toBeNull()
  })

  it('editing still supersedes when the rule says supersedes', () => {
    const e = createCardEngine({ rules: [{ ...rule, supersedes: 'dedupe-key' }], now: () => 0 })
    e.ingest({ id: 'a', kind: 'test', subject: 's' })
    e.setEditing('a', true)
    e.ingest({ id: 'b', kind: 'test', subject: 's' })
    e.applyPending('a')
    expect(e.snapshot().order).toEqual(['a', 'b'])
    expect(e.get('a')?.status).toBe('superseded')
  })
})

describe('review: secret declarations', () => {
  it('cannot silently become unmasked raw outcome fields', () => {
    for (const extra of [{ oneOf: [{ type: 'string' }] }, { enum: ['synthetic-secret'] }]) {
      const c = compileFormSchema({ type: 'object', properties: { credential: { type: 'string', writeOnly: true, ...extra } } })
      expect(c.issues.length > 0 || c.fields[0].kind === 'secret').toBe(true)
      expect(c.fields[0].kind).toBe('secret')
    }
  })

  it('a secret with an unsupported shape fails closed', () => {
    const c = compileFormSchema({ type: 'object', properties: { credential: { type: 'string', writeOnly: true, oneOf: [{ type: 'string' }] }, n: { type: 'number', format: 'secret' } } })
    expect(c.issues).toHaveLength(2)
  })

  it('writeOnly enum values never reach an outcome as plaintext', async () => {
    const sample = ['synthetic', 'sample'].join('-')
    const respond = vi.fn()
    const storeSecret = vi.fn(async () => 'reference-only')
    render(<FormCard title="Example" schema={{ type: 'object', properties: { credential: { type: 'string', writeOnly: true, enum: [sample] } } }} defaultValues={{ credential: sample }} storeSecret={storeSecret} onRespond={respond} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit' })) })
    expect(JSON.stringify(respond.mock.calls)).not.toContain(sample)
    expect(storeSecret).toHaveBeenCalled()
  })
})

describe('review: validation links', () => {
  it('focus an actionable multi-select control', async () => {
    const { container } = render(<FormCard title="Example" schema={{ type: 'object', properties: { choices: { type: 'array', title: 'Choices', items: { type: 'string', enum: ['a', 'b'] } } }, required: ['choices'] }} onRespond={() => {}} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit' })) })
    const link = screen.getByRole('link', { name: /Choices is required/ })
    await act(async () => { fireEvent.click(link) })
    const fieldset = container.querySelector('fieldset')!
    expect(fieldset.contains(document.activeElement), 'error link left focus on the summary').toBe(true)
    expect(document.activeElement).not.toBe(fieldset)
  })
})

describe('designer polish', () => {
  it('a notice action is described by the notice, so the reason is heard', () => {
    render(<ApprovalCard title="T" risk="low" elevation={{ reason: 'Confirm identity first.', action: <button type="button">Elevate</button> }} onRespond={() => {}} />)
    const button = screen.getByRole('button', { name: 'Elevate' })
    const id = button.getAttribute('aria-describedby')!
    expect(document.getElementById(id)!.textContent).toMatch(/Read-only\. Confirm identity first/)
  })

  it('a terminal form is a read-only summary: no fields, secret by reference', () => {
    render(<FormCard title="F" priorStatus="failed" schema={{ type: 'object', properties: { name: { type: 'string', title: 'Name' }, key: { type: 'string', title: 'Key', format: 'secret' } } }} defaultValues={{ name: 'svc', key: ['synthetic', 'sample'].join('-') }} onRespond={() => {}} />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.querySelector('input')).toBeNull()
    expect(screen.getByText('svc')).toBeTruthy()
    expect(screen.getByText(/Provided by reference/)).toBeTruthy()
    expect(document.body.textContent).not.toContain('synthetic-sample')
  })
})
