import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ApiTokenManager } from '../components/api-token-manager'
import type { ApiTokenManagerProps } from '../components/api-token-manager'
import { NewTokenDisclosure } from '../components/new-token-disclosure'
import { ConnectedAccounts } from '../components/connected-accounts'

// jsdom 25 lacks PointerEvent; Base UI forwards checkbox activation with one.
// The packed browser fixture also exercises the real native checkbox path.
beforeAll(() => vi.stubGlobal('PointerEvent', MouseEvent))
afterAll(() => vi.unstubAllGlobals())

function tokenProps(): ApiTokenManagerProps {
  return {
    tokens: [{ id: 'token-a', name: 'Automation', scopes: ['read'], status: 'active', canRevoke: true }],
    scopeOptions: [{ id: 'read', label: 'Read' }, { id: 'write', label: 'Write' }],
    draft: { name: 'Work', scopes: ['read'] }, onDraftChange: vi.fn(), onCreate: vi.fn(), canCreate: true,
    revokeTargetId: null, onRevokeTargetChange: vi.fn(), onRevoke: vi.fn(),
  }
}

describe('ApiTokenManager', () => {
  it('emits controlled name/scope edits and creates only the selected draft', () => {
    const props = tokenProps()
    render(<ApiTokenManager {...props} />)
    fireEvent.change(screen.getByLabelText('Token name'), { target: { value: 'Changed' } })
    expect(props.onDraftChange).toHaveBeenCalledWith({ ...props.draft, name: 'Changed' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Write' }))
    expect(props.onDraftChange).toHaveBeenLastCalledWith({ ...props.draft, scopes: ['read', 'write'] })
    expect((screen.getByLabelText('Token name') as HTMLInputElement).value).toBe('Work')
    fireEvent.submit(screen.getByRole('form', { name: 'Create API token' }))
    expect(props.onCreate).toHaveBeenCalledWith(props.draft)
    expect(screen.queryByText('Save your new token')).toBeNull()
  })

  it('blocks empty/unavailable scopes, blank names, busy loads and missing create capability', () => {
    const props = tokenProps()
    const { rerender } = render(<ApiTokenManager {...props} draft={{ name: 'Work', scopes: [] }} />)
    fireEvent.submit(screen.getByRole('form', { name: 'Create API token' }))
    rerender(<ApiTokenManager {...props} draft={{ name: 'Work', scopes: ['removed'] }} />)
    fireEvent.submit(screen.getByRole('form', { name: 'Create API token' }))
    expect(screen.getByRole('alert').textContent).toMatch(/scopes are unavailable/)
    fireEvent.click(screen.getByRole('button', { name: 'Clear unavailable scopes' }))
    expect(props.onDraftChange).toHaveBeenCalledWith({ name: 'Work', scopes: [] })
    rerender(<ApiTokenManager {...props} draft={{ name: '  ', scopes: ['read'] }} />)
    fireEvent.submit(screen.getByRole('form', { name: 'Create API token' }))
    rerender(<ApiTokenManager {...props} creating />)
    fireEvent.submit(screen.getByRole('form', { name: 'Create API token' }))
    rerender(<ApiTokenManager {...props} loading />)
    fireEvent.submit(screen.getByRole('form', { name: 'Create API token' }))
    rerender(<ApiTokenManager {...props} canCreate={false} />)
    expect(screen.queryByRole('form', { name: 'Create API token' })).toBeNull()
    expect(props.onCreate).not.toHaveBeenCalled()
  })

  it('requests confirmation first, then emits revoke without claiming success or closing it', () => {
    const props = tokenProps()
    const { rerender } = render(<ApiTokenManager {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Revoke Automation' }))
    expect(props.onRevokeTargetChange).toHaveBeenCalledWith('token-a')
    expect(props.onRevoke).not.toHaveBeenCalled()
    rerender(<ApiTokenManager {...props} revokeTargetId="token-a" />)
    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }))
    expect(props.onRevoke).toHaveBeenCalledWith('token-a')
    expect(screen.getByRole('dialog')).toBeDefined()
    rerender(<ApiTokenManager {...props} revokeTargetId="token-a" revokeError="Unable to revoke" revoking />)
    expect(screen.getByRole('alert').textContent).toBe('Unable to revoke')
    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }))
    expect(props.onRevoke).toHaveBeenCalledOnce()
  })

  it('cancels confirmation without a mutation and disables unknown/unavailable token actions', () => {
    const props = tokenProps()
    const { rerender } = render(<ApiTokenManager {...props} revokeTargetId="token-a" />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onRevokeTargetChange).toHaveBeenCalledWith(null)
    expect(props.onRevoke).not.toHaveBeenCalled()
    rerender(<ApiTokenManager {...props} revokeTargetId="token-a" tokens={[{ ...props.tokens[0], status: 'future-state' }]} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Revoke Automation' })).toBeNull()
    expect(screen.getByText('future-state')).toBeDefined()
  })

  it('does not render secret-like extra metadata or claim a loading list is empty', () => {
    const props = tokenProps()
    const record = { ...props.tokens[0], secret: 'fixture-secret-must-not-render' }
    const { rerender } = render(<ApiTokenManager {...props} tokens={[record]} />)
    expect(screen.queryByText(record.secret)).toBeNull()
    rerender(<ApiTokenManager {...props} tokens={[]} loading />)
    expect(screen.queryByText('No API tokens.')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Loading tokens…')
  })
})

describe('NewTokenDisclosure', () => {
  it('renders transient text only and delegates explicit copy/dismiss without persisting it', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const onCopy = vi.fn(); const onDismiss = vi.fn()
    const { container, rerender } = render(<NewTokenDisclosure value="fixture-secret" onCopy={onCopy} onDismiss={onDismiss} />)
    expect(container.querySelector('code')?.textContent).toBe('fixture-secret')
    expect(container.querySelector('input')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Copy token' }))
    expect(onCopy).toHaveBeenCalledWith()
    fireEvent.click(screen.getByRole('button', { name: 'I have saved this token' }))
    expect(onDismiss).toHaveBeenCalledWith()
    rerender(<NewTokenDisclosure value={null} onDismiss={onDismiss} />)
    expect(container.textContent).toBe('')
    expect(storage).not.toHaveBeenCalled()
    storage.mockRestore()
  })
})

describe('ConnectedAccounts', () => {
  const accounts = [
    { id: 'mail', provider: 'Mail', status: 'disconnected', canConnect: true, canDisconnect: false },
    { id: 'calendar', provider: 'Calendar', status: 'connected', canConnect: false, canDisconnect: true, accountLabel: 'Local calendar' },
  ]
  it('reports provider IDs without owning a transport or optimistic connection state', () => {
    const onConnect = vi.fn(); const onDisconnect = vi.fn()
    render(<ConnectedAccounts accounts={accounts} onConnect={onConnect} onDisconnect={onDisconnect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Connect Mail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Calendar' }))
    expect(onConnect).toHaveBeenCalledWith('mail')
    expect(onDisconnect).toHaveBeenCalledWith('calendar')
    expect(screen.getByText('disconnected')).toBeDefined()
    expect(screen.getByText('connected')).toBeDefined()
  })

  it('keeps pending/unknown/unsupported actions unavailable and displays host errors', () => {
    render(<ConnectedAccounts accounts={[
      { ...accounts[0], status: 'connecting' },
      { ...accounts[1], status: 'future-state' },
      { ...accounts[0], id: 'other', provider: 'Other', canConnect: false },
    ]} onConnect={vi.fn()} onDisconnect={vi.fn()} error="Provider unavailable" />)
    expect(screen.getByRole('status').textContent).toBe('Connecting…')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('future-state')).toBeDefined()
    expect(screen.getByRole('alert').textContent).toBe('Provider unavailable')
  })

  it('disables host actions while loading and suppresses premature empty state', () => {
    const onConnect = vi.fn()
    const { rerender } = render(<ConnectedAccounts accounts={accounts} onConnect={onConnect} onDisconnect={vi.fn()} loading />)
    fireEvent.click(screen.getByRole('button', { name: 'Connect Mail' }))
    expect(onConnect).not.toHaveBeenCalled()
    rerender(<ConnectedAccounts accounts={[]} onConnect={onConnect} onDisconnect={vi.fn()} loading />)
    expect(screen.queryByText('No connected-account providers.')).toBeNull()
  })
})
