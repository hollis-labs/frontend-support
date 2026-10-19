import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountProfile } from '../components/account-profile'
import { AccountPreferences } from '../components/account-preferences'
import { WhoamiBadge } from '../components/whoami-badge'

const value = { displayName: 'Local user', email: 'local@example.test' }

describe('AccountProfile', () => {
  it('reports edited values without owning the draft or changing identity', () => {
    const onValueChange = vi.fn()
    render(<AccountProfile value={value} onValueChange={onValueChange} onSave={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'New name' } })
    expect(onValueChange).toHaveBeenCalledWith({ ...value, displayName: 'New name' })
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe(value.displayName)
    fireEvent.change(screen.getByLabelText('Email (optional)'), { target: { value: 'new@example.test' } })
    expect(onValueChange).toHaveBeenLastCalledWith({ ...value, email: 'new@example.test' })
    expect(screen.queryByText('Verified')).toBeNull()
  })

  it('emits save intent without inventing success, and preserves host error/draft', () => {
    const onSave = vi.fn()
    const { rerender } = render(<AccountProfile value={value} onValueChange={vi.fn()} onSave={onSave} />)
    fireEvent.submit(screen.getByRole('form', { name: 'Profile' }))
    expect(onSave).toHaveBeenCalledWith(value)
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<AccountProfile value={value} onValueChange={vi.fn()} onSave={onSave} saving error="Unable to save" />)
    fireEvent.submit(screen.getByRole('form', { name: 'Profile' }))
    expect(onSave).toHaveBeenCalledOnce()
    expect((screen.getByLabelText('Display name') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toBe('Unable to save')
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe(value.displayName)
  })

  it('blocks blank/read-only saves and accepts only host-asserted success', () => {
    const onSave = vi.fn()
    const { rerender } = render(<AccountProfile value={{ ...value, displayName: '  ' }} onValueChange={vi.fn()} onSave={onSave} />)
    fireEvent.submit(screen.getByRole('form', { name: 'Profile' }))
    expect(onSave).not.toHaveBeenCalled()
    rerender(<AccountProfile value={value} onValueChange={vi.fn()} onSave={onSave} readOnly notice="Profile saved" />)
    expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull()
    fireEvent.submit(screen.getByRole('form', { name: 'Profile' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toBe('Profile saved')
  })
})

describe('AccountPreferences', () => {
  it('renders host-controlled fields and delegates save without a schema protocol', () => {
    const onSave = vi.fn()
    render(<AccountPreferences onSave={onSave}><label>Theme<select value="dark" onChange={vi.fn()}><option value="dark">Dark</option></select></label></AccountPreferences>)
    expect((screen.getByLabelText('Theme') as HTMLSelectElement).value).toBe('dark')
    fireEvent.submit(screen.getByRole('form', { name: 'Preferences' }))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('blocks saving while busy, read-only, or host validation disallows it', () => {
    const onSave = vi.fn()
    const { rerender } = render(<AccountPreferences onSave={onSave} saving><input aria-label="Host field" /></AccountPreferences>)
    fireEvent.submit(screen.getByRole('form', { name: 'Preferences' }))
    expect(screen.getByLabelText('Host field').closest('fieldset')?.disabled).toBe(true)
    rerender(<AccountPreferences onSave={onSave} canSave={false}>{null}</AccountPreferences>)
    fireEvent.submit(screen.getByRole('form', { name: 'Preferences' }))
    rerender(<AccountPreferences onSave={onSave} readOnly>{null}</AccountPreferences>)
    fireEvent.submit(screen.getByRole('form', { name: 'Preferences' }))
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('WhoamiBadge', () => {
  it('distinguishes local identity from host-verified identity', () => {
    const { rerender } = render(<WhoamiBadge identity={{ state: 'identified', displayName: 'Local user', assurance: 'local', source: 'This app' }} />)
    expect(screen.getByText('Local')).toBeDefined()
    expect(screen.queryByText('Verified')).toBeNull()
    rerender(<WhoamiBadge identity={{ state: 'identified', displayName: 'Local user', assurance: 'verified' }} />)
    expect(screen.getByText('Verified')).toBeDefined()
  })

  it('does not invent identity while loading, unknown or failed', () => {
    const { rerender } = render(<WhoamiBadge identity={{ state: 'loading' }} />)
    expect(screen.getByRole('status').textContent).toBe('Loading identity…')
    rerender(<WhoamiBadge identity={{ state: 'unknown' }} />)
    expect(screen.getByText('Identity unavailable')).toBeDefined()
    rerender(<WhoamiBadge identity={{ state: 'error', message: 'Identity provider unavailable' }} />)
    expect(screen.getByRole('alert').textContent).toBe('Identity provider unavailable')
    expect(screen.queryByText('Verified')).toBeNull()
  })
})
