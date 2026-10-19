import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from '../api/client'

/**
 * The URL-building test exists because of a real finding: `buildUrl` read
 * `window.location.origin`, so calling the client outside a browser threw
 * `ReferenceError: window is not defined`. An API client is the one thing in this
 * package a consumer may legitimately call from a server, and this package's whole
 * pitch is being adoptable with nothing else — so that was a boundary defect, not a
 * quirk. Found by installing the package alone into a scratch project (CW-0126).
 */
const calls: { url: string; method: string }[] = []

function stubFetch(status = 200, body: unknown = { ok: true }) {
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET' })
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

afterEach(() => { calls.length = 0 })

describe('createApiClient', () => {
  it('prefixes baseUrl and serialises query params', async () => {
    stubFetch()
    const api = createApiClient({ baseUrl: '/api/v1' })
    await api.get('/things', { query: { page: 2, active: true } })
    expect(calls[0].url).toContain('/api/v1/things')
    expect(calls[0].url).toContain('page=2')
    expect(calls[0].url).toContain('active=true')
  })

  it('returns the parsed body', async () => {
    stubFetch(200, { item_count: 3 })
    const api = createApiClient()
    await expect(api.get('/x')).resolves.toEqual({ item_count: 3 })
  })

  it('raises ApiError carrying the status on a non-2xx', async () => {
    stubFetch(422, { error: 'nope' })
    const api = createApiClient()
    await expect(api.get('/boom')).rejects.toBeInstanceOf(ApiError)
    await expect(api.get('/boom')).rejects.toMatchObject({ status: 422 })
  })

  it('builds a URL with no `window` present — the SSR / node case', async () => {
    stubFetch()
    const saved = globalThis.window
    // @ts-expect-error -- deliberately removing the global to reproduce the finding
    delete globalThis.window
    try {
      const api = createApiClient({ baseUrl: '/api/v1' })
      await expect(api.get('/things', { query: { a: 1 } })).resolves.toBeTruthy()
      expect(calls[0].url).toBe('/api/v1/things?a=1')
    } finally {
      globalThis.window = saved
    }
  })

  it('produces the same path with a window as without one', async () => {
    stubFetch()
    const api = createApiClient({ baseUrl: '/api/v1' })
    await api.get('/things', { query: { a: 1 } })
    const withWindow = calls[0].url
    calls.length = 0
    const saved = globalThis.window
    // @ts-expect-error -- see above
    delete globalThis.window
    try {
      await createApiClient({ baseUrl: '/api/v1' }).get('/things', { query: { a: 1 } })
    } finally {
      globalThis.window = saved
    }
    expect(calls[0].url).toBe(withWindow)
  })
})
