import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ApiKeysPage, AccountSecurityPage, IDENTITY_PAGES, IDENTITY_ROUTES, IdentityGate, PairingCodesPage } from '../index'
import { IdentityProvider, useIdentity } from '../client'
import { deviceLabel, relativeWhen } from '../components/device'
import { fakeFetch } from './fake'

// jsdom 25 lacks PointerEvent; Base UI forwards checkbox activation with one.
beforeAll(() => vi.stubGlobal('PointerEvent', MouseEvent))
afterEach(cleanup)

const PROFILE = { id: 'u1', username: 'owner', display_name: 'Owner', email: '', scopes: ['*'] }
const SECRET = ['key', 'VALUE', '0123456789'].join('_')
const CODE = ['pair', 'VALUE', '0123456789'].join('_')

function mount(routes: Parameters<typeof fakeFetch>[0], ui: React.ReactNode) {
  const fake = fakeFetch(routes)
  render(<IdentityProvider options={{ fetch: fake.fetch }}><IdentityGate>{ui}</IdentityGate></IdentityProvider>)
  return fake
}
const signedIn = { 'GET /api/setup': { status: 200, body: { setup_required: false } }, 'GET /api/identity/profile': { status: 200, body: PROFILE } }
const signedOut = { status: 401, body: { code: 'unauthorized', message: 'x' } }

async function signIn() {
  fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'owner' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('IdentityGate', () => {
  it('shows a loading page, then setup when no owner exists, with no form flash', async () => {
    mount({ 'GET /api/setup': { status: 200, body: { setup_required: true } } }, <p>shell</p>)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy()
    expect(screen.queryByLabelText('Username')).toBeNull()
    expect(await screen.findByRole('heading', { name: 'Set up your account' })).toBeTruthy()
    expect(screen.queryByText('shell')).toBeNull()
  })

  it('shows a plain no-owner screen with no form when setup_over_http is false', async () => {
    const { calls } = mount({ 'GET /api/setup': { status: 200, body: { setup_required: true, setup_over_http: false } } }, <p>shell</p>)
    expect(await screen.findByRole('heading', { name: 'No owner yet' })).toBeTruthy()
    expect(document.body.textContent).toContain('identity setup')
    expect(document.querySelector('form')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText('shell')).toBeNull()
    expect(calls).toHaveLength(1)
  })

  it('shows the form when both setup_required and setup_over_http are true', async () => {
    mount({ 'GET /api/setup': { status: 200, body: { setup_required: true, setup_over_http: true } } }, <p>shell</p>)
    expect(await screen.findByRole('heading', { name: 'Set up your account' })).toBeTruthy()
    expect(screen.getByLabelText('Username')).toBeTruthy()
  })

  it('treats 403 setup_offline from POST as the same no-owner screen, not an error', async () => {
    mount({ 'GET /api/setup': { status: 200, body: { setup_required: true } }, 'POST /api/setup': { status: 403, body: { code: 'setup_offline', message: 'run the app identity setup command on the host' } } }, <p>shell</p>)
    for (const [label, value] of [['Display name', 'Owner'], ['Username', 'owner'], ['Password', 'correct horse battery'], ['Confirm password', 'correct horse battery']] as const) {
      fireEvent.change(await screen.findByLabelText(label), { target: { value } })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'No owner yet' })).toBeTruthy()
    expect(document.querySelector('form')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('blocks setup on a password mismatch and sends no request', async () => {
    const { calls } = mount({ 'GET /api/setup': { status: 200, body: { setup_required: true } } }, <p>shell</p>)
    fireEvent.change(await screen.findByLabelText('Password'), { target: { value: 'correct horse battery' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } })
    expect(screen.getByRole('alert').textContent).toContain('do not match')
    expect((screen.getByRole('button', { name: 'Create account' }) as HTMLButtonElement).disabled).toBe(true)
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('switches to sign-in with a notice on 409 setup_closed', async () => {
    mount({ 'GET /api/setup': { status: 200, body: { setup_required: true } }, 'POST /api/setup': { status: 409, body: { code: 'setup_closed', message: 'setup is already done' } } }, <p>shell</p>)
    for (const [label, value] of [['Display name', 'Owner'], ['Username', 'owner'], ['Password', 'correct horse battery'], ['Confirm password', 'correct horse battery']] as const) {
      fireEvent.change(await screen.findByLabelText(label), { target: { value } })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Setup is already complete')
  })

  it('keeps invalid_login on the form (not expired) and mounts the shell after sign-in', async () => {
    mount({
      'GET /api/setup': { status: 200, body: { setup_required: false } },
      'GET /api/identity/profile': signedOut,
      'POST /api/login': [{ status: 401, body: { code: 'invalid_login', message: 'invalid username or password' } }, { status: 200, body: PROFILE }],
    }, <p>shell</p>)
    await signIn()
    expect((await screen.findByRole('alert')).textContent).toBe('invalid username or password')
    expect(screen.queryByText('Session expired')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('shell')).toBeTruthy()
  })

  it('moves keyboard focus to the error after each failed sign-in', async () => {
    const failed = { status: 401, body: { code: 'invalid_login', message: 'invalid username or password' } }
    mount({ 'GET /api/setup': { status: 200, body: { setup_required: false } }, 'GET /api/identity/profile': signedOut, 'POST /api/login': [failed, failed] }, <p>shell</p>)
    await signIn()
    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(document.activeElement).toBe(alert))
    expect(alert.className).toContain('focus-visible:ring-ring')
    screen.getByLabelText('Password').focus()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')))
  })

  it('autocomplete attributes suit password managers', async () => {
    mount({ ...signedIn, 'GET /api/identity/profile': signedOut }, <p>shell</p>)
    expect((await screen.findByLabelText('Username')).getAttribute('autocomplete')).toBe('username')
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password')
  })
})

describe('AccountSecurityPage', () => {
  it('a wrong current password shows the server message and does NOT drop to session expired', async () => {
    mount({ ...signedIn, 'PUT /api/password': { status: 401, body: { code: 'invalid_login', message: 'the current password is not right' } } }, <AccountSecurityPage />)
    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'wrong wrong wrong' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'another long pass 1' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'another long pass 1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect((await screen.findByRole('alert')).textContent).toBe('the current password is not right')
    expect(screen.getByRole('heading', { name: 'Change password' })).toBeTruthy()
    expect(screen.queryByText('Session expired')).toBeNull()
  })

  it('announces success and clears the fields', async () => {
    mount({ ...signedIn, 'PUT /api/password': { status: 204 } }, <AccountSecurityPage />)
    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'correct horse battery' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'another long pass 1' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'another long pass 1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect((await screen.findByRole('status')).textContent).toBe('Password updated. Your other sessions were signed out.')
    expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe('')
  })

  it('a mid-session 401 drops to the sign-in screen with the expired state', async () => {
    mount({ ...signedIn, 'PUT /api/password': { status: 401, body: { code: 'unauthorized', message: 'x' } } }, <AccountSecurityPage />)
    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'correct horse battery' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'another long pass 1' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'another long pass 1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByRole('heading', { name: 'Session expired' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy()
  })
})

describe('ApiKeysPage', () => {
  const keys = (list: unknown) => ({ ...signedIn, 'GET /api/identity/keys': { status: 200, body: { keys: list } } })

  it('renders the denied state and no create control for a non-admin', async () => {
    mount({ ...signedIn, 'GET /api/identity/keys': { status: 403, body: { code: 'scope_required', message: 'required scope: app.admin' } } }, <ApiKeysPage />)
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /create/i })).toBeNull()
  })

  it('shows the empty state for a null list', async () => {
    mount(keys(null), <ApiKeysPage />)
    expect(await screen.findByText('No access keys.')).toBeTruthy()
  })

  it('discloses the key once and leaves no value in the DOM after dismiss', async () => {
    const fake = mount({ ...keys([]), 'POST /api/identity/keys': { status: 201, body: { key: SECRET, credential: { id: 'k1', name: 'ci', scopes: ['app.read'], created_at: '2026-11-12T00:00:00Z' } } } }, <ApiKeysPage scopeSuggestions={['app.read']} />)
    await screen.findByText('No access keys.')
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }))
    fireEvent.change(await screen.findByLabelText('Key name'), { target: { value: 'ci' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'app.read' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' }).at(-1)!)
    expect(await screen.findByText(SECRET)).toBeTruthy()
    expect(fake.calls.find((c) => c.method === 'POST')!.body).toEqual({ name: 'ci', scopes: ['app.read'], ttl_hours: 2160 })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(document.body.textContent).not.toContain(SECRET))
    expect(JSON.stringify({ ...localStorage })).not.toContain(SECRET)
  })

  it('lets an owner with no suggestions type a scope into the create dialog and creates with it', async () => {
    const fake = mount({ ...keys([]), 'POST /api/identity/keys': { status: 201, body: { key: SECRET, credential: { id: 'k1', name: 'ci', scopes: ['app.read'], created_at: '2026-11-12T00:00:00Z' } } } }, <ApiKeysPage />)
    await screen.findByText('No access keys.')
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }))
    fireEvent.change(await screen.findByLabelText('Key name'), { target: { value: 'ci' } })
    fireEvent.change(screen.getByLabelText('Add a scope'), { target: { value: 'app.read' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect((screen.getByRole('checkbox', { name: 'app.read' }) as HTMLInputElement).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' }).at(-1)!)
    await screen.findByText(SECRET)
    expect((fake.calls.find((c) => c.method === 'POST')!.body as { scopes: string[] }).scopes).toEqual(['app.read'])
  })

  it('a 403 on create becomes the denied state', async () => {
    mount({ ...keys([]), 'POST /api/identity/keys': { status: 403, body: { code: 'scope_required', message: 'required scope' } } }, <ApiKeysPage scopeSuggestions={['app.read']} />)
    await screen.findByText('No access keys.')
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }))
    fireEvent.change(await screen.findByLabelText('Key name'), { target: { value: 'ci' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'app.read' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' }).at(-1)!)
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeTruthy()
  })

  it('a failed create keeps the dialog open and announces the error inside it', async () => {
    mount({ ...keys([]), 'POST /api/identity/keys': { status: 500, body: { code: 'internal', message: 'could not create the key' } } }, <ApiKeysPage scopeSuggestions={['app.read']} />)
    await screen.findByText('No access keys.')
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }))
    fireEvent.change(await screen.findByLabelText('Key name'), { target: { value: 'ci' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'app.read' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Create key' }).at(-1)!)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('could not create the key')
    expect(screen.getByLabelText('Key name')).toBeTruthy()
  })

  it('revokes with a confirm and refreshes the list', async () => {
    const row = { id: 'k1', name: 'ci', scopes: ['app.read'], created_at: '2026-11-12T00:00:00Z' }
    const fake = mount({ ...signedIn, 'GET /api/identity/keys': [{ status: 200, body: { keys: [row] } }, { status: 200, body: { keys: null } }], 'DELETE /api/identity/keys/k1': { status: 204 } }, <ApiKeysPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke ci' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke key' }))
    expect(await screen.findByText('No access keys.')).toBeTruthy()
    expect(fake.calls.some((c) => c.method === 'DELETE')).toBe(true)
  })
})

describe('PairingCodesPage', () => {
  it('shows the explanation and button (no list), discloses the code once, and clears it on dismiss', async () => {
    const fake = mount({ ...signedIn, 'POST /api/identity/pairing-codes': { status: 201, body: { code: CODE, expires_at: '2026-11-12T13:12:08Z' } } }, <PairingCodesPage scopeSuggestions={['app.read']} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Generate pairing code' }))
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'phone' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'app.read' }))
    fireEvent.click(screen.getByRole('button', { name: 'Generate code' }))
    expect(await screen.findByText(CODE)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Copy your pairing code now' })).toBeTruthy()
    expect(fake.calls.find((c) => c.method === 'POST')!.body).toEqual({ name: 'phone', scopes: ['app.read'], ttl_minutes: 10 })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(document.body.textContent).not.toContain(CODE))
  })

  it('words the expiry relative to now', async () => {
    const soon = new Date(Date.now() + 10 * 60_000 + 30_000).toISOString()
    mount({ ...signedIn, 'POST /api/identity/pairing-codes': { status: 201, body: { code: CODE, expires_at: soon } } }, <PairingCodesPage scopeSuggestions={['app.read']} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Generate pairing code' }))
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'phone' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'app.read' }))
    fireEvent.click(screen.getByRole('button', { name: 'Generate code' }))
    expect(await screen.findByText(/It expires in 10 minutes \(at .+\) and works once\./)).toBeTruthy()
  })

  it('shows the denied state when the server says 403', async () => {
    mount({ ...signedIn, 'POST /api/identity/pairing-codes': { status: 403, body: { code: 'scope_required', message: 'x' } } }, <PairingCodesPage scopeSuggestions={['app.read']} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Generate pairing code' }))
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'phone' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'app.read' }))
    fireEvent.click(screen.getByRole('button', { name: 'Generate code' }))
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Generate pairing code' })).toBeNull()
  })
})

describe('identity badge', () => {
  const Probe = () => <output data-testid="badge">{JSON.stringify(useIdentity().badge)}</output>
  const badgeFor = async (profile: object) => {
    mount({
      'GET /api/setup': { status: 200, body: { setup_required: false } },
      'GET /api/identity/profile': signedOut,
      'POST /api/login': { status: 200, body: profile },
    }, <Probe />)
    await signIn()
    return JSON.parse((await screen.findByTestId('badge')).textContent ?? '{}')
  }
  it('drops the source when it repeats the display name', async () => {
    const badge = await badgeFor({ ...PROFILE, display_name: 'owner' })
    expect(badge.displayName).toBe('owner')
    expect(badge.source).toBeUndefined()
  })
  it('keeps the username as source when it differs from the display name', async () => {
    expect((await badgeFor({ ...PROFILE, display_name: 'Ada L' })).source).toBe('owner')
  })
})

describe('IDENTITY_ROUTES', () => {
  it('has a page for every route, keys and pairing require the admin capability, and no route points at sign-in', () => {
    expect(Object.keys(IDENTITY_PAGES).sort()).toEqual(Object.keys(IDENTITY_ROUTES).sort())
    expect(IDENTITY_ROUTES.keys.requires).toBe('{app}.admin')
    expect(IDENTITY_ROUTES.pairing.requires).toBe('{app}.admin')
    expect(IDENTITY_ROUTES.account.requires).toBeNull()
    expect(Object.values(IDENTITY_ROUTES).map((route) => route.path)).toEqual(['/identity/account', '/identity/keys', '/identity/pairing', '/identity/sessions', '/identity/sign-out'])
  })
})

describe('identity badge', () => {
  it('reads the profile back after a reload (CW-20261113-0023)', async () => {
    const Scopes = () => <output data-testid="scopes">{JSON.stringify(useIdentity().scopes)}</output>
    const { Probe } = await import('./probe')
    const fake = mount(signedIn, <><Probe /><Scopes /></>)
    expect((await screen.findByTestId('badge')).textContent).toBe('identified')
    expect(screen.getByTestId('scopes').textContent).toBe('["*"]')
    expect(fake.calls.map((call) => `${call.method} ${call.url}`)).toEqual(['GET /api/setup', 'GET /api/identity/profile'])
  })

  it('a 401 on the profile read is signed out, not expired', async () => {
    mount({ ...signedIn, 'GET /api/identity/profile': signedOut }, <p>shell</p>)
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(screen.queryByText(/session expired/i)).toBeNull()
  })

  it.each([
    ['403 route_not_mapped', { status: 403, body: { code: 'route_not_mapped', message: 'x' } }],
    ['404', { status: 404 }],
  ])('falls back to the session probe when the host has no profile route (%s), badge unknown', async (_, reply) => {
    const { Probe } = await import('./probe')
    const fake = mount({ ...signedIn, 'GET /api/identity/profile': reply, 'GET /api/identity/sessions': { status: 200, body: { sessions: [] } } }, <Probe />)
    expect((await screen.findByTestId('badge')).textContent).toBe('unknown')
    expect(fake.calls.map((call) => call.url)).toContain('/api/identity/sessions')
  })

  it('a failed profile read is a boot error', async () => {
    mount({ ...signedIn, 'GET /api/identity/profile': { status: 500, body: { code: 'internal', message: 'boom' } } }, <p>shell</p>)
    expect(await screen.findByText('boom')).toBeTruthy()
  })
})

describe('device label', () => {
  it('shortens a User-Agent and falls back to Unknown device', () => {
    expect(deviceLabel('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36')).toBe('Chrome on Linux')
    expect(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15')).toBe('Safari on macOS')
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0')).toBe('Firefox on Windows')
    expect(deviceLabel('')).toBe('Unknown device')
    expect(deviceLabel(undefined)).toBe('Unknown device')
    expect(relativeWhen('2026-11-12T10:00:00Z', Date.parse('2026-11-12T10:02:30Z'))).toBe('2 minutes ago')
    expect(relativeWhen('2026-11-12T10:00:30Z', Date.parse('2026-11-12T10:00:00Z'))).toBe('in under a minute')
  })
})
