import type { JsonObject } from '../lib/json'

/**
 * API client scaffold — a thin, typed `fetch` wrapper. Apps build their
 * concrete client (one method per endpoint) on top of `createApiClient`.
 */

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export type QueryValue = string | number | boolean | null | undefined

export interface ApiRequestOptions {
  signal?: AbortSignal
  query?: Record<string, QueryValue>
  headers?: HeadersInit
}

export interface ApiClient {
  /** GET `path`, parsing a JSON (or text) response body. */
  get<TResponse>(path: string, options?: ApiRequestOptions): Promise<TResponse>
  /** POST `path` with an optional JSON body. */
  post<TResponse>(path: string, body?: JsonObject, options?: ApiRequestOptions): Promise<TResponse>
  /** Escape hatch for verbs/headers not covered by `get`/`post`. */
  request<TResponse>(path: string, init?: RequestInit, options?: ApiRequestOptions): Promise<TResponse>
}

export interface ApiClientOptions {
  /** Prefix prepended to every request path. Default: '' (same origin). */
  baseUrl?: string
  /** Forwarded to `fetch`. Default: 'same-origin'. */
  credentials?: RequestCredentials
  /** Headers merged into every request. */
  headers?: HeadersInit
}

function appendParam(searchParams: URLSearchParams, key: string, value: QueryValue) {
  if (value === undefined || value === null || value === '') {
    return
  }
  searchParams.set(key, String(value))
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>) {
  // `new URL` needs a base to resolve a path-relative request, but only
  // `pathname` and `search` are read back out — the origin never reaches the
  // returned value, so any valid base produces a byte-identical result.
  //
  // This read `window.location.origin`, which threw `ReferenceError: window is
  // not defined` the moment the package was exercised outside a browser. Found by
  // CW-0126's boundary test, installing this package alone into a scratch project.
  // An API client is the one thing here a consumer may legitimately call from a
  // server (SSR, a loader, a script), and it was the only file in the package with
  // a hard browser dependency at call time — the router, storage and SSE hook all
  // touch browser APIs too, but those ARE browser concerns by definition.
  const resolutionBase =
    typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost'
  const url = new URL(`${baseUrl}${path}`, resolutionBase)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      appendParam(url.searchParams, key, value)
    }
  }
  return `${url.pathname}${url.search}`
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text.length > 0 ? text : undefined
}

/** Build a request-scoped API client. */
export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = options.baseUrl ?? ''
  const credentials = options.credentials ?? 'same-origin'

  async function request<TResponse>(
    path: string,
    init?: RequestInit,
    requestOptions?: ApiRequestOptions,
  ): Promise<TResponse> {
    const response = await fetch(buildUrl(baseUrl, path, requestOptions?.query), {
      credentials,
      ...init,
      signal: requestOptions?.signal ?? init?.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
        ...init?.headers,
        ...requestOptions?.headers,
      },
    })

    const data = await parseResponseBody(response)
    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : typeof data === 'object' && data !== null && 'message' in data
            ? String((data as { message: unknown }).message)
            : response.statusText || 'Request failed'
      throw new ApiError(message, response.status, data)
    }

    return data as TResponse
  }

  return {
    request,
    get(path, requestOptions) {
      return request(path, undefined, requestOptions)
    },
    post(path, body, requestOptions) {
      return request(
        path,
        { method: 'POST', body: body ? JSON.stringify(body) : undefined },
        requestOptions,
      )
    },
  }
}
