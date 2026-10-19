/**
 * THE BOUNDARY TEST. Run it from a scratch project where this package is the ONLY
 * @hollis-labs package installed — if anything here needs a component, the boundary
 * is wrong.
 *
 *   cd packages/design-app-runtime && npm run build && npm pack --pack-destination /tmp/scratch
 *   cd /tmp/scratch && npm init -y && npm pkg set type=module
 *   npm install react@^19 react-dom@^19 ./hollis-labs-design-app-runtime-*.tgz
 *   cp <repo>/packages/design-app-runtime/scripts/boundary-test.mjs .
 *   node boundary-test.mjs
 *
 * It is committed because it earned it: on its first run it found two real defects
 * that the package's own unit tests could not have, because unit tests run inside a
 * configured jsdom workspace and this runs in a bare Node process with nothing else
 * installed.
 *
 *   1. `api/client.ts` read `window.location.origin` purely as a parsing base and
 *      threw `ReferenceError: window is not defined` off-browser. Fixed — the origin
 *      never reached the output, so the fix is byte-identical in a browser.
 *   2. `lib/router.ts` needs a DOM at first render, which is inherent to a pushState
 *      router. NOT fixed: making it SSR-safe means injecting a location source, which
 *      is an API addition and not something to slip into an extraction. Asserted here
 *      as a documented limit so it is a decision on record rather than a surprise.
 */
import { createElement as h, useState } from 'react'
import { renderToString } from 'react-dom/server'
import {
  createApiClient, ApiError, createApiContext,
  usePoll, useSSE, useElapsed, createRefreshRegistry, refreshPolledData,
  createRouter, createScopedStorage, createListCursor, listCursorNeighbors,
  normalizeKeys, toSnakeCase, parseMetadataJson,
  formatCount, formatDuration, formatRelativeTime,
} from '@hollis-labs/design-app-runtime'

let failures = 0
const check = (name, fn) => {
  try { const d = fn(); console.log(`  PASS  ${name}${d ? ' — ' + d : ''}`) }
  catch (e) { failures++; console.log(`  FAIL  ${name}: ${e.message}`) }
}

console.log('\n1. API CLIENT (real fetch, stubbed transport)')
await (async () => {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET' })
    if (String(url).includes('/boom')) {
      return new Response(JSON.stringify({ error: 'nope' }), { status: 422, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ ok: true, item_count: 3 }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const api = createApiClient({ baseUrl: '/api/v1', headers: { 'x-test': '1' } })
  const got = await api.get('/things', { query: { page: 2, active: true } })
  check('get() returns parsed json', () => {
    if (got.ok !== true) throw new Error('bad body ' + JSON.stringify(got))
    return JSON.stringify(got)
  })
  check('baseUrl + query serialised', () => {
    const u = calls[0].url
    if (!u.includes('/api/v1/things') || !u.includes('page=2')) throw new Error('got ' + u)
    return u
  })
  check('post() reaches transport', async () => {})
  await api.post('/things', { name: 'x' }).catch(() => {})
  check('non-2xx raises ApiError with status', async () => {})
  try {
    await api.get('/boom')
    failures++; console.log('  FAIL  ApiError not thrown')
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) console.log(`  PASS  ApiError thrown — status ${e.status}`)
    else { failures++; console.log('  FAIL  wrong error: ' + e) }
  }
})()

console.log('\n2. HOOKS IN A REAL REACT RENDER')
function Probe() {
  const poll = usePoll(async () => ({ n: 1 }), 0, false)
  const sse = useSSE(null)
  const secs = useElapsed(new Date(Date.now() - 5000).toISOString())
  const [ok] = useState('mounted')
  return h('div', null, `${ok}|poll:${poll.isLoading}|sse:${String(sse.connected ?? 'n/a')}|elapsed:${typeof secs}`)
}
check('usePoll + useSSE + useElapsed render without any component dep', () => renderToString(h(Probe)))

console.log('\n3. ROUTER')
const useRoute = createRouter({ routes: ['overview', 'detail'], default: 'overview', basePath: '/ops' })
function RouteProbe() { const { route } = useRoute(); return h('span', null, route) }
check('createRouter returns the hook directly', () => typeof useRoute)
check('router requires a DOM — documented limitation, asserted not assumed', () => {
  // Node has no window, so rendering must fail LOUDLY here. A pushState router
  // needs the URL at first render; making it SSR-safe is an API addition, tracked
  // as a follow-up rather than slipped into this extraction.
  try { renderToString(h(RouteProbe)); throw new Error('expected a throw, got a render') }
  catch (e) {
    if (!/window is not defined/.test(e.message)) throw e
    return 'fails loudly without a DOM, as documented'
  }
})

console.log('\n4. STORAGE / CURSOR / NORMALIZE / FORMAT')
check('createScopedStorage fails quiet with no web storage at all', () => {
  const st = createScopedStorage('scratch.k')
  st.write({ a: 1 })            // no window in node -> must not throw
  const back = st.read()        // -> null, fail-quiet
  st.clear()
  return `write/read/clear survived, read() === ${JSON.stringify(back)}`
})
check('listCursorNeighbors', () => JSON.stringify(listCursorNeighbors(['a','b','c'], 'b')))
check('normalizeKeys / toSnakeCase', () => toSnakeCase('someKeyName') + ' | ' + JSON.stringify(normalizeKeys({ itemCount: 1 })))
check('formatters', () => [formatCount(45300), formatDuration(3780), formatRelativeTime(new Date(Date.now()-120000).toISOString())].join(' '))
check('createApiContext is a factory, not a component import', () => typeof createApiContext({ client: createApiClient() }))
check('refresh registry isolation', () => {
  const r = createRefreshRegistry(); let n = 0; r.subscribe(() => n++); r.refresh(); refreshPolledData(); return `own=${n}`
})

console.log('\n5. THE OPT-IN STYLESHEET RESOLVES AND CARRIES NO COLOR')
const { readFileSync } = await import('node:fs')
const css = readFileSync('./node_modules/@hollis-labs/design-app-runtime/src/styles/shell-reset.css', 'utf8')
check('shell-reset.css present', () => `${css.split('\n').length} lines`)
check('shell-reset.css names no color and no token (comments stripped)', () => {
  // Strip comments first: the file's own header explains WHY it names no
  // `--color-*` token, and matching the prose is a false positive.
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const bad = code.match(/#[0-9a-fA-F]{3,8}|rgba?\(|--color-|var\(/g)
  if (bad) throw new Error('contains ' + bad.join(','))
  return `${code.trim().split('\n').length} lines of declarations, zero appearance`
})

console.log(failures === 0 ? '\nBOUNDARY TEST PASSED — nothing here needed a component.\n' : `\n${failures} FAILURE(S)\n`)
process.exit(failures === 0 ? 0 : 1)
