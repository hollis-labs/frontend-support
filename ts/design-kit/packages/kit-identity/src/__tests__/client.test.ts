import { describe, expect, it, vi } from 'vitest'
import { IdentityError, createIdentityClient, errorMessage, parseRetryAfter, retryAfterText } from '../client'
import { fakeFetch } from './fake'

describe('identity client', () => {
  it('maps a flat error body to IdentityError and shows only its message', async () => {
    const { fetch } = fakeFetch({ 'POST /api/login': { status: 429, body: { code: 'rate_limited', message: 'too many attempts; wait a few minutes', details: { x: 1 } } } })
    const error = await createIdentityClient({ fetch }).login({ username: 'a', password: 'b' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(IdentityError)
    expect(error).toMatchObject({ status: 429, code: 'rate_limited', details: { x: 1 } })
    expect(errorMessage(error)).toBe('too many attempts; wait a few minutes')
  })

  it('reads Retry-After on a 429 and says when to try again', async () => {
    const { fetch } = fakeFetch({ 'POST /api/login': { status: 429, headers: { 'Retry-After': '30' }, body: { code: 'rate_limited', message: 'too many attempts' } } })
    const error = await createIdentityClient({ fetch }).login({ username: 'a', password: 'b' }).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 429, retryAfter: 30 })
    expect(errorMessage(error)).toMatch(/^too many attempts\. Try again in 1 minute \(at .+\)\.$/)
  })

  it('parses Retry-After as seconds or an HTTP date, and words it in seconds or minutes', () => {
    const now = Date.parse('2026-11-13T12:00:00Z')
    expect(parseRetryAfter('120', now)).toBe(120)
    expect(parseRetryAfter('Fri, 13 Nov 2026 12:02:30 GMT', now)).toBe(150)
    expect(parseRetryAfter('Fri, 13 Nov 2026 11:00:00 GMT', now)).toBe(0)
    expect(parseRetryAfter(null, now)).toBeUndefined()
    expect(parseRetryAfter('soon', now)).toBeUndefined()
    expect(retryAfterText(1, now)).toMatch(/^Try again in 1 minute \(at .+\)\.$/)
    expect(retryAfterText(60, now)).toMatch(/^Try again in 1 minute \(/)
    expect(retryAfterText(150, now)).toMatch(/^Try again in 3 minutes \(at .+\)\.$/)
    expect(retryAfterText(0, now)).toBe('Try again now.')
  })

  it('keeps the plain message on a 429 without Retry-After', async () => {
    const { fetch } = fakeFetch({ 'POST /api/login': { status: 429, body: { code: 'rate_limited', message: 'too many attempts.' } } })
    const error = await createIdentityClient({ fetch }).login({ username: 'a', password: 'b' }).catch((e: unknown) => e)
    expect((error as IdentityError).retryAfter).toBeUndefined()
    expect(errorMessage(error)).toBe('too many attempts.')
  })

  it('falls back to a generic message for a missing or non-JSON body, and never echoes it', async () => {
    const { fetch } = fakeFetch({ 'GET /api/identity/keys': { status: 500, body: undefined } })
    const error = await createIdentityClient({ fetch }).listKeys().catch((e: unknown) => e)
    expect(errorMessage(error)).toBe('The request could not be completed.')
    expect((error as IdentityError).code).toBe('unknown')
  })

  it('reports a network failure without throwing a raw error', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('boom http://secret-host')) as unknown as typeof globalThis.fetch
    const error = await createIdentityClient({ fetch }).setupState().catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0, code: 'network' })
    expect(errorMessage(error)).not.toContain('secret-host')
  })

  it('resolves 204 to undefined', async () => {
    const { fetch } = fakeFetch({ 'PUT /api/password': { status: 204 } })
    await expect(createIdentityClient({ fetch }).changePassword({ current_password: 'a', new_password: 'b' })).resolves.toBeUndefined()
  })

  it('sends X-Requested-With, same-origin credentials and JSON on writes', async () => {
    const { fetch, calls } = fakeFetch({ 'POST /api/identity/keys': { status: 201, body: { key: 'key_x', credential: { id: 'k' } } }, 'DELETE /api/identity/keys/k%201': { status: 204 } })
    const spy = vi.mocked(fetch)
    const client = createIdentityClient({ fetch })
    await client.createKey({ name: 'n', scopes: ['a.read'] })
    await client.revokeKey('k 1')
    expect(calls.map((c) => c.method)).toEqual(['POST', 'DELETE'])
    for (const call of calls) expect(call.headers['X-Requested-With']).toBe('XMLHttpRequest')
    expect(calls[0]!.headers['Content-Type']).toBe('application/json')
    expect(spy.mock.calls[0]![1]).toMatchObject({ credentials: 'same-origin' })
  })

  it('treats invalid_login as a credential error, and any other 401 as a session end', async () => {
    const onUnauthorized = vi.fn()
    const { fetch } = fakeFetch({
      'PUT /api/password': { status: 401, body: { code: 'invalid_login', message: 'the current password is not right' } },
      'GET /api/identity/keys': { status: 401, body: { code: 'unauthorized', message: 'verified caller identity required' } },
    })
    const client = createIdentityClient({ fetch, onUnauthorized })
    await expect(client.changePassword({ current_password: 'x', new_password: 'y' })).rejects.toMatchObject({ code: 'invalid_login' })
    expect(onUnauthorized).not.toHaveBeenCalled()
    await expect(client.listKeys()).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('the boot probe answers false on 401 without signalling an expired session', async () => {
    const onUnauthorized = vi.fn()
    const { fetch } = fakeFetch({ 'GET /api/identity/sessions': { status: 401, body: { code: 'unauthorized', message: 'x' } } })
    await expect(createIdentityClient({ fetch, onUnauthorized }).hasSession()).resolves.toBe(false)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reads the profile, answers null on 401 without signalling an expired session, and rejects a missing route', async () => {
    const onUnauthorized = vi.fn()
    const ok = fakeFetch({ 'GET /api/identity/profile': { status: 200, body: { id: 'u1', username: 'owner', display_name: 'Owner', email: '', scopes: null } } })
    await expect(createIdentityClient({ fetch: ok.fetch }).readProfile()).resolves.toMatchObject({ username: 'owner', scopes: [] })
    const out = fakeFetch({ 'GET /api/identity/profile': { status: 401, body: { code: 'unauthorized', message: 'x' } } })
    await expect(createIdentityClient({ fetch: out.fetch, onUnauthorized }).readProfile()).resolves.toBeNull()
    expect(onUnauthorized).not.toHaveBeenCalled()
    const old = fakeFetch({ 'GET /api/identity/profile': { status: 403, body: { code: 'route_not_mapped', message: 'x' } } })
    await expect(createIdentityClient({ fetch: old.fetch }).readProfile()).rejects.toMatchObject({ status: 403, code: 'route_not_mapped' })
  })

  it('reads an empty key list sent as null', async () => {
    const { fetch } = fakeFetch({ 'GET /api/identity/keys': { status: 200, body: { keys: null } } })
    await expect(createIdentityClient({ fetch }).listKeys()).resolves.toEqual([])
  })

  it('reads setup_over_http: false as offline, and an absent field as over HTTP', async () => {
    const offline = fakeFetch({ 'GET /api/setup': { status: 200, body: { setup_required: true, setup_over_http: false } } })
    await expect(createIdentityClient({ fetch: offline.fetch }).setupState()).resolves.toEqual({ required: true, overHttp: false })
    const legacy = fakeFetch({ 'GET /api/setup': { status: 200, body: { setup_required: true } } })
    await expect(createIdentityClient({ fetch: legacy.fetch }).setupState()).resolves.toEqual({ required: true, overHttp: true })
  })

  it('uses a flat body `error` string when there is no `message`', async () => {
    const { fetch } = fakeFetch({ 'POST /api/identity/keys': { status: 400, body: { error: 'name already in use' } } })
    const error = await createIdentityClient({ fetch }).createKey({ name: 'x', scopes: [] }).catch((e: unknown) => e)
    expect(errorMessage(error)).toBe('name already in use')
  })

  it('honours baseUrl, identityBase and path overrides', async () => {
    const { fetch, calls } = fakeFetch({ 'GET https://x.test/auth/setup': { status: 200, body: { setup_required: true } }, 'GET https://x.test/id/keys': { status: 200, body: { keys: [] } } })
    const client = createIdentityClient({ fetch, baseUrl: 'https://x.test', identityBase: '/id', paths: { setup: '/auth/setup' } })
    await expect(client.setupState()).resolves.toEqual({ required: true, overHttp: true })
    await client.listKeys()
    expect(calls).toHaveLength(2)
  })

  it('reads the profile under identityBase unless paths.profile is given', async () => {
    const profile = { status: 200, body: { id: 'u1', username: 'owner', display_name: '', email: '', scopes: [] } }
    const derived = fakeFetch({ 'GET /id/profile': profile })
    await createIdentityClient({ fetch: derived.fetch, identityBase: '/id' }).readProfile()
    const explicit = fakeFetch({ 'GET /me': profile })
    await createIdentityClient({ fetch: explicit.fetch, identityBase: '/id', paths: { profile: '/me' } }).readProfile()
    expect([...derived.calls, ...explicit.calls].map((call) => call.url)).toEqual(['/id/profile', '/me'])
  })
})
