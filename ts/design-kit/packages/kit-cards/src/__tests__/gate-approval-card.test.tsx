import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GateApprovalCard, type GateApprovalState } from '../cards/gate-approval-card'

const base = {
  enabled: true,
  ticketId: 'hitl-item-1',
  ticketRevision: 7,
  operationDigest: 'sha256:exact-operation',
  title: 'Run the prepared operation',
  risk: 'low' as const,
  options: [
    { id: 'provider-allow-once', label: 'Allow once', kind: 'allow' as const },
    { id: 'provider-deny', label: 'Deny', kind: 'deny' as const },
  ],
  onSelect: vi.fn(),
  onDismiss: vi.fn(),
}

describe('GateApprovalCard', () => {
  it('ships off: renders nothing and cannot submit', () => {
    const onSelect = vi.fn()
    const { container } = render(<GateApprovalCard {...base} enabled={undefined} state={{ kind: 'pending' }} onSelect={onSelect} />)
    expect(container.textContent).toBe('')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('submits the exact native option and operation digest; dismissal does not select', async () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()
    render(<GateApprovalCard {...base} state={{ kind: 'pending' }} onSelect={onSelect} onDismiss={onDismiss} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Allow once' })) })
    expect(onSelect).toHaveBeenCalledWith({ ticketId: 'hitl-item-1', ticketRevision: 7, operationDigest: 'sha256:exact-operation', optionId: 'provider-allow-once' })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Dismiss' })) })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  for (const [name, state, expected] of [
    ['approved', { kind: 'approved', scope: 'once', decisionId: 'd-1', receiptId: 'r-1' }, /Approved · once · Decision d-1 · Receipt r-1/],
    ['denied', { kind: 'denied', decisionId: 'd-2' }, /Denied · Decision d-2/],
    ['expired', { kind: 'expired' }, /Expired/],
    ['unknown', { kind: 'unknown' }, /Unknown state/],
  ] as const) {
    it(`${name} is read-only and renders its authoritative state`, () => {
      const { container } = render(<GateApprovalCard {...base} state={state as GateApprovalState} />)
      expect(container.textContent).toMatch(expected)
      expect([...container.querySelectorAll('button')].filter((button) => !button.disabled)).toHaveLength(0)
    })
  }

  it('stale is locked and can reload for authoritative reconciliation', async () => {
    const onReconcile = vi.fn()
    const onSelect = vi.fn()
    render(<GateApprovalCard {...base} state={{ kind: 'stale' }} onReconcile={onReconcile} onSelect={onSelect} />)
    expect((screen.getByRole('button', { name: 'Allow once' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Reload, keep my answers/ })) })
    expect(onReconcile).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('locks a pending interaction with no native choices', () => {
    const { container } = render(<GateApprovalCard {...base} state={{ kind: 'pending' }} options={[]} />)
    expect(container.textContent).toMatch(/gate-missing-options/)
    expect([...container.querySelectorAll('button')].filter((button) => !button.disabled)).toHaveLength(0)
  })

  it('locks high-risk approval when the host omits the confirmation phrase', async () => {
    const onSelect = vi.fn()
    const { container } = render(<GateApprovalCard {...base} risk="high" state={{ kind: 'pending' }} onSelect={onSelect} />)
    expect(container.textContent).toMatch(/requires a confirmation phrase/i)
    expect([...container.querySelectorAll('button')].filter((button) => !button.disabled)).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Allow once' })).toBeNull()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('requires the exact host phrase before high-risk allow', async () => {
    const onSelect = vi.fn()
    render(<GateApprovalCard {...base} risk="high" confirmPhrase="APPROVE-7" state={{ kind: 'pending' }} onSelect={onSelect} />)
    const allow = screen.getByRole('button', { name: 'Allow once' }) as HTMLButtonElement
    expect(allow.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'APPROVE-7' } })
    expect(allow.disabled).toBe(false)
    await act(async () => { fireEvent.click(allow) })
    expect(onSelect).toHaveBeenCalledWith({ ticketId: 'hitl-item-1', ticketRevision: 7, operationDigest: 'sha256:exact-operation', optionId: 'provider-allow-once' })
  })
})
