import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ApiTokenManager } from '../components/api-token-manager'
import { EMPTY_API_TOKEN_DRAFT } from '../components/api-token-constants'
import type { ApiTokenStatus } from '../components/api-token-constants'
import type { ApiTokenDraft, ApiTokenManagerProps } from '../components/api-token-manager'
import { NewTokenDisclosure } from '../components/new-token-disclosure'
import { ConnectedAccounts } from '../components/connected-accounts'

// jsdom 25 lacks PointerEvent; Base UI forwards checkbox activation with one.
// The packed browser fixture also exercises the real native checkbox path.
beforeAll(() => vi.stubGlobal('PointerEvent', MouseEvent))
afterAll(() => vi.unstubAllGlobals())

const NOW = Date.parse('2026-11-12T12:00:00Z')
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString()
const DAY = 86_400_000

function tokenProps(): ApiTokenManagerProps {
  return {
    tokens: [{ id: 'token-a', name: 'Automation', scopes: ['read'], status: 'active', createdAt: iso(12 * DAY), lastUsedAt: iso(2 * 3_600_000), canRevoke: true }],
    scopeOptions: [{ id: 'read', label: 'Read' }, { id: 'write', label: 'Write' }],
    draft: { name: 'Work', scopes: ['read'], expiry: '90d' }, onDraftChange: vi.fn(), onCreate: vi.fn(), canCreate: true,
    createOpen: true, onCreateOpenChange: vi.fn(), now: NOW,
    revokeTargetId: null, onRevokeTargetChange: vi.fn(), onRevoke: vi.fn(),
  }
}

const createButton = () => within(screen.getByRole('dialog')).getByRole('button', { name: /Create token|Creating token…/ })

describe('ApiTokenManager', () => {
  it('opens the create dialog from the header action', () => {
    const props = tokenProps()
    render(<ApiTokenManager {...props} createOpen={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create token' }))
    expect(props.onCreateOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('emits controlled name/scope/expiry edits and creates only the selected draft', () => {
    const props = tokenProps()
    render(<ApiTokenManager {...props} />)
    expect(screen.getByRole('dialog', { name: 'Create API token' })).toBeDefined()
    fireEvent.change(screen.getByLabelText('Token name'), { target: { value: 'Changed' } })
    expect(props.onDraftChange).toHaveBeenCalledWith({ ...props.draft, name: 'Changed' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Write' }))
    expect(props.onDraftChange).toHaveBeenLastCalledWith({ ...props.draft, scopes: ['read', 'write'] })
    fireEvent.change(screen.getByLabelText('Expires'), { target: { value: '30d' } })
    expect(props.onDraftChange).toHaveBeenLastCalledWith({ ...props.draft, expiry: '30d' })
    expect((screen.getByLabelText('Token name') as HTMLInputElement).value).toBe('Work')
    fireEvent.click(createButton())
    expect(props.onCreate).toHaveBeenCalledWith(props.draft)
    expect(screen.queryByText('Copy your key now')).toBeNull()
  })

  it('defaults to 90 days and labels no-expiry as discouraged', () => {
    expect(EMPTY_API_TOKEN_DRAFT.expiry).toBe('90d')
    const props = tokenProps()
    const { rerender } = render(<ApiTokenManager {...props} />)
    expect((screen.getByLabelText('Expires') as HTMLSelectElement).value).toBe('90d')
    expect(screen.getByRole('option', { name: 'No expiry (discouraged)' })).toBeDefined()
    expect(screen.getByText('Keys without expiry are discouraged.')).toBeDefined()
    rerender(<ApiTokenManager {...props} draft={{ ...props.draft, expiry: 'never' }} />)
    fireEvent.click(createButton())
    expect(props.onCreate).toHaveBeenCalledWith({ ...props.draft, expiry: 'never' })
  })

  it('blocks empty/unavailable scopes, blank names, invalid expiry and busy loads', () => {
    const props = tokenProps()
    const { rerender } = render(<ApiTokenManager {...props} draft={{ ...props.draft, scopes: [] }} />)
    expect((createButton() as HTMLButtonElement).disabled).toBe(true)
    rerender(<ApiTokenManager {...props} draft={{ ...props.draft, scopes: ['removed'] }} />)
    expect(screen.getByRole('alert').textContent).toMatch(/scopes are unavailable/)
    fireEvent.click(screen.getByRole('button', { name: 'Clear unavailable scopes' }))
    expect(props.onDraftChange).toHaveBeenCalledWith({ ...props.draft, scopes: [] })
    rerender(<ApiTokenManager {...props} draft={{ ...props.draft, name: '  ' }} />)
    expect((createButton() as HTMLButtonElement).disabled).toBe(true)
    rerender(<ApiTokenManager {...props} draft={{ ...props.draft, expiry: '5y' as ApiTokenDraft['expiry'] }} />)
    expect((createButton() as HTMLButtonElement).disabled).toBe(true)
    rerender(<ApiTokenManager {...props} creating />)
    expect((createButton() as HTMLButtonElement).disabled).toBe(true)
    rerender(<ApiTokenManager {...props} loading />)
    expect((createButton() as HTMLButtonElement).disabled).toBe(true)
    expect(props.onCreate).not.toHaveBeenCalled()
  })

  it('shows why creation is denied instead of a missing button', () => {
    const props = tokenProps()
    const { rerender } = render(<ApiTokenManager {...props} canCreate={false} />)
    const button = screen.getByRole('button', { name: 'Create token' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(button.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText('You do not have permission to create API tokens.')).toBeDefined()
    rerender(<ApiTokenManager {...props} canCreate={false} createDeniedReason="Ask an admin for the keys:write role." />)
    expect(screen.getByText('Ask an admin for the keys:write role.')).toBeDefined()
  })

  it('renders created, last-used and expiry on the second line', () => {
    const props = tokenProps()
    const tokens: ApiTokenManagerProps['tokens'] = [
      props.tokens[0],
      { id: 'b', name: 'Laptop', scopes: ['read', 'write'], status: 'expiring', createdAt: iso(90 * DAY), expiresAt: new Date(NOW + 3 * DAY).toISOString(), canRevoke: true },
      { id: 'c', name: 'Old', scopes: [], status: 'expired', createdAt: iso(400 * DAY), expiresAt: iso(10 * DAY), lastUsedAt: iso(20 * DAY), canRevoke: false },
      { id: 'd', name: 'Gone', scopes: ['read'], status: 'revoked', createdAt: 'not a date', canRevoke: false },
    ]
    render(<ApiTokenManager {...props} createOpen={false} tokens={tokens} />)
    expect(screen.getByText('read · Created 12 days ago · Used 2 hours ago')).toBeDefined()
    expect(screen.getByText('read, write · Created 3 months ago · Never used')).toBeDefined()
    expect(screen.getByText('Expires in 3 days')).toBeDefined()
    expect(screen.getByText('No scopes · Created 1 year ago · Used 20 days ago · Expired 10 days ago')).toBeDefined()
    expect(screen.getByText('read · Created unknown · Never used')).toBeDefined()
    expect(screen.getByText('Active')).toBeDefined()
    expect(screen.getByText('Expired')).toBeDefined()
    expect(screen.getByText('Revoked')).toBeDefined()
  })

  it('offers revoke only for active and expiring tokens', () => {
    const props = tokenProps()
    const base = props.tokens[0]
    render(<ApiTokenManager {...props} createOpen={false} tokens={[
      { ...base, id: '1', name: 'A', status: 'active' }, { ...base, id: '2', name: 'B', status: 'expiring', expiresAt: iso(-DAY) },
      { ...base, id: '3', name: 'C', status: 'revoked' }, { ...base, id: '4', name: 'D', status: 'expired' },
    ]} />)
    expect(screen.getAllByRole('button', { name: /^Revoke / }).map((b) => b.getAttribute('aria-label'))).toEqual(['Revoke A', 'Revoke B'])
  })

  it('shows why revoke is denied and does not act on it', () => {
    const props = tokenProps()
    const { rerender } = render(<ApiTokenManager {...props} createOpen={false} tokens={[{ ...props.tokens[0], canRevoke: false }]} />)
    const button = screen.getByRole('button', { name: 'Revoke Automation' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByText('You do not have permission to revoke this token.')).toBeDefined()
    expect(button.getAttribute('aria-describedby')).toBeTruthy()
    rerender(<ApiTokenManager {...props} createOpen={false} tokens={[{ ...props.tokens[0], canRevoke: false, revokeDeniedReason: 'Owned by another user.' }]} />)
    expect(screen.getByText('Owned by another user.')).toBeDefined()
    rerender(<ApiTokenManager {...props} createOpen={false} revokeTargetId="token-a" tokens={[{ ...props.tokens[0], canRevoke: false }]} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('requests confirmation first, then emits revoke without claiming success or closing it', () => {
    const props = tokenProps()
    const { rerender } = render(<ApiTokenManager {...props} createOpen={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Revoke Automation' }))
    expect(props.onRevokeTargetChange).toHaveBeenCalledWith('token-a')
    expect(props.onRevoke).not.toHaveBeenCalled()
    rerender(<ApiTokenManager {...props} createOpen={false} revokeTargetId="token-a" />)
    expect(screen.getByRole('dialog', { name: 'Revoke “Automation”?' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }))
    expect(props.onRevoke).toHaveBeenCalledWith('token-a')
    expect(screen.getByRole('dialog')).toBeDefined()
    rerender(<ApiTokenManager {...props} createOpen={false} revokeTargetId="token-a" revokeError="Unable to revoke" revoking />)
    expect(screen.getByRole('alert').textContent).toBe('Unable to revoke')
    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }))
    expect(props.onRevoke).toHaveBeenCalledOnce()
  })

  it('cancels confirmation without a mutation', () => {
    const props = tokenProps()
    render(<ApiTokenManager {...props} createOpen={false} revokeTargetId="token-a" />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onRevokeTargetChange).toHaveBeenCalledWith(null)
    expect(props.onRevoke).not.toHaveBeenCalled()
  })

  it('renders an unknown status as Unknown with no action and never the raw value', () => {
    const props = tokenProps()
    const future = { ...props.tokens[0], status: 'future-state' as unknown as ApiTokenStatus }
    render(<ApiTokenManager {...props} createOpen={false} revokeTargetId="token-a" tokens={[future]} />)
    expect(screen.getByText('Unknown')).toBeDefined()
    expect(screen.queryByText('future-state')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Revoke Automation' })).toBeNull()
  })

  it('does not render secret-like extra metadata or claim a loading list is empty', () => {
    const props = tokenProps()
    const record = { ...props.tokens[0], secret: 'fixture-secret-must-not-render', prefix: 'fixture-prefix-must-not-render' }
    const { rerender, container } = render(<ApiTokenManager {...props} createOpen={false} tokens={[record]} />)
    expect(container.textContent).not.toContain('must-not-render')
    rerender(<ApiTokenManager {...props} createOpen={false} tokens={[]} loading />)
    expect(screen.queryByText('No API tokens.')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Loading tokens…')
  })

  it('returns focus to the trigger when the create dialog closes', async () => {
    const props = tokenProps()
    function Host() {
      const [open, setOpen] = useState(false)
      return <ApiTokenManager {...props} createOpen={open} onCreateOpenChange={setOpen} />
    }
    render(<Host />)
    const trigger = screen.getByRole('button', { name: 'Create token' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Create API token' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

describe('NewTokenDisclosure', () => {
  it('renders transient text in a dialog and delegates explicit copy/dismiss without persisting it', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const onCopy = vi.fn(); const onDismiss = vi.fn()
    const { rerender } = render(<NewTokenDisclosure value="fixture-secret" onCopy={onCopy} onDismiss={onDismiss} />)
    const dialog = screen.getByRole('dialog', { name: 'Copy your key now' })
    expect(dialog.querySelector('code')?.textContent).toBe('fixture-secret')
    expect(dialog.querySelector('input')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(onCopy).toHaveBeenCalledWith()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDismiss).toHaveBeenCalledWith()
    rerender(<NewTokenDisclosure value={null} onDismiss={onDismiss} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.textContent).not.toContain('fixture-secret')
    expect(storage).not.toHaveBeenCalled()
    storage.mockRestore()
  })

  it('announces the copy confirmation without announcing the value', () => {
    const props = { value: 'fixture-secret', onCopy: vi.fn(), onDismiss: vi.fn() }
    const { rerender } = render(<NewTokenDisclosure {...props} />)
    expect(screen.getByRole('status').textContent).toBe('')
    rerender(<NewTokenDisclosure {...props} copied />)
    expect(screen.getByRole('status').textContent).toBe('Key copied to clipboard.')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeDefined()
  })

  it('omits the copy action when the host provides none', () => {
    render(<NewTokenDisclosure value="fixture-secret" onDismiss={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull()
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

  it('does not claim an empty list while a load error is shown', () => {
    const { rerender } = render(<ApiTokenManager {...tokenProps()} createOpen={false} tokens={[]} error="Could not load tokens." />)
    expect(screen.queryByText('No API tokens.')).toBeNull()
    rerender(<ApiTokenManager {...tokenProps()} createOpen={false} tokens={[]} />)
    expect(screen.getByText('No API tokens.')).toBeDefined()
    rerender(<ConnectedAccounts accounts={[]} onConnect={vi.fn()} onDisconnect={vi.fn()} error="Provider unavailable" />)
    expect(screen.queryByText('No connected-account providers.')).toBeNull()
  })
})
