import { vi } from 'vitest'

export interface Call { readonly method: string; readonly url: string; readonly headers: Record<string, string>; readonly body: unknown }
type Reply = { status: number; body?: unknown } | ((call: Call) => { status: number; body?: unknown })

/** A scripted fetch keyed by "METHOD /path". Unscripted calls fail the test loudly. */
export function fakeFetch(routes: Record<string, Reply | Reply[]>) {
  const calls: Call[] = []
  const queues = new Map<string, Reply[]>()
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const call: Call = { method, url, headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) }
    calls.push(call)
    const key = `${method} ${url}`
    const route = routes[key]
    if (route === undefined) throw new Error(`unscripted request ${key}`)
    const queue = queues.get(key) ?? (Array.isArray(route) ? [...route] : [route])
    queues.set(key, queue)
    const reply = queue.length > 1 ? queue.shift()! : queue[0]!
    const { status, body } = typeof reply === 'function' ? reply(call) : reply
    return new Response(status === 204 || body === undefined ? null : JSON.stringify(body), { status })
  })
  return { fetch: impl as unknown as typeof fetch, calls }
}
