import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { artifactModuleUrl } from '../../dist/isolation/bytes.js'
const sourceRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const root = process.env.CANDIDATE_CONSUMER_ROOT ?? sourceRoot
const toolsEntry = join(root, '.candidate-tools.mjs')
await writeFile(toolsEntry, "export { build } from 'vite'; export { buildFrameArtifacts, buildFrameBootstrap } from '@hollis-labs/plugin-host-ui/vite'; export { reviewFrameModule } from '@hollis-labs/plugin-host-ui/isolation';")
const { build, buildFrameArtifacts, buildFrameBootstrap, reviewFrameModule } = await import(pathToFileURL(toolsEntry).href)
const scratch = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'plugin-frame-browser-'))
let browser, server
const pinned = process.env.PINNED_MODULES === '1'
const evidenceRoot = process.env.ACCEPTANCE_EVIDENCE_ROOT
if (evidenceRoot) await mkdir(evidenceRoot, { recursive: true })
const responseHashes = [], policyDenials = [], moduleManifests = [], responseHeaders = [], probeTransfers = [], capabilityControls = []
const policyReceipt = process.env.PRODUCTION_CSP_RECEIPT ? JSON.parse(await readFile(process.env.PRODUCTION_CSP_RECEIPT, 'utf8')) : undefined
let tamper = ''
let unavailableProbe = false
const modules = new Map(), usedModuleScopes = new Set(), usedDocumentIds = new Set()
const docs = new Map(), requests = [], proofs = []
try {
  const ui = join(root, '.candidate-ui.js')
  await writeFile(ui, 'import { createElement, useState } from "react"; import { Button } from "@hollis-labs/design-components"; export function FrameButton({label}) { const [count,setCount] = useState(0); return createElement(Button,{onClick:()=>setCount(count+1)},label+":"+count) }')
  const entries = []
  for (const specifier of ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime']) {
    const module = await import(specifier)
    entries.push({ specifier, source: specifier, exports: Object.keys(module).filter(name => name !== 'default' && /^[A-Za-z_$][\w$]*$/.test(name)), defaultExport: Object.hasOwn(module, 'default') })
  }
  entries.push({ specifier: '@fixture/ui', source: ui, exports: ['FrameButton'] })
  const inventory = await buildFrameArtifacts({ entries, root })
  const bootstrap = await buildFrameBootstrap()
  const plugin = `import { createElement, useState } from 'react'; import {FrameButton} from '@fixture/ui';
export function View({label}) { return createElement(FrameButton, {label}); } View.hook=useState;
globalThis.pluginHook=useState; globalThis.pluginParentReadable=(()=>{try{return !!parent.document.body}catch{return false}})();
globalThis.pluginStorageReadable=(()=>{try{return !!localStorage.getItem('secret')}catch{return false}})();
globalThis.pluginCookieReadable=(()=>{try{return document.cookie.includes('secret')}catch{return false}})();
globalThis.pluginProof='exact-pinned-bytes'; parent.postMessage({pluginExecuted:true}, '*');`
  const fixture = { ...inventory, bootstrap, plugin, pinned }
  const clientEntry = join(root, '.candidate-client.ts')
  await writeFile(clientEntry, await readFile(join(sourceRoot, 'test/browser/client.ts')))
  const output = await build({ root, configFile: false, logLevel: 'silent', define: { 'process.env.NODE_ENV': JSON.stringify('production') }, build: { write: false, minify: false, target: 'es2022',
    lib: { entry: clientEntry, formats: ['es'] }, rollupOptions: { external: pinned ? [] : entries.map(entry => entry.specifier), output: { inlineDynamicImports: true } },
  } })
  const hostOutput = Array.isArray(output) ? output[0] : output
  const client = hostOutput.output.find(item => item.type === 'chunk').code
  if (evidenceRoot) { await writeFile(join(evidenceRoot, 'runtime-inventory.json'), JSON.stringify(fixture, null, 2)); await writeFile(join(evidenceRoot, 'host-client.js'), client) }
  const imports = Object.fromEntries(inventory.imports.map(row => [row.specifier, artifactModuleUrl(inventory.artifacts.find(artifact => artifact.id === row.artifact), 'app')]))
  server = createServer(async (req, res) => {
    requests.push({ path: req.url, method: req.method })
    if (req.url === '/control' && req.method === 'POST') { let body = ''; for await (const chunk of req) body += chunk; tamper = body; res.writeHead(204).end(); return }
    if (req.url === '/modules' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 32_000_000) { res.writeHead(413).end(); return } }
      const { artifacts, scope, imports = [], owner } = JSON.parse(body), urls = {}, admitted = new Map()
      if (usedModuleScopes.has(scope)) { res.writeHead(409).end(); return }
      for (const artifact of artifacts.filter(row => row.kind === 'module')) {
        const path = `/modules/${scope}/${artifact.sha256}/${artifact.id}.js`
        const bytes = Buffer.from(artifact.base64, 'base64')
        try { await reviewFrameModule(bytes, imports.map(entry => entry.specifier)) } catch { res.writeHead(400).end(); return }
        if (createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) { res.writeHead(400).end(); return }
        if (modules.has(path)) { res.writeHead(409).end(); return }
        admitted.set(path, bytes)
        urls[artifact.id] = `http://127.0.0.1:${server.address().port}${path}`
      }
      moduleManifests.push({scope, owner, imports, entries: artifacts.filter(row => row.kind === 'module').map(row => ({id: row.id, sha256: row.sha256, mediaType: 'text/javascript', url: urls[row.id]}))}); usedModuleScopes.add(scope); for (const [path, bytes] of admitted) modules.set(path, bytes)
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(urls)); return
    }
    if (req.url.startsWith('/modules/')) {
      if (req.method === 'DELETE') { for (const key of modules.keys()) if (key.startsWith(req.url + '/')) modules.delete(key); res.writeHead(204).end(); return }
      if (unavailableProbe && req.url.endsWith('/integrity-probe.js')) { res.writeHead(404, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*', 'Timing-Allow-Origin': '*', 'Cache-Control': 'no-store' }).end(); return }
      const bytes = modules.get(req.url)
      if (!bytes) { res.writeHead(404).end(); return }
      const body = (tamper === 'plugin' && req.url.endsWith('/plugin.js')) || (tamper === 'runtime' && req.url.endsWith('/runtime-0.js')) ? Buffer.from("parent.postMessage({tamperedExecution:true}, '*'); export const View = () => null;") : bytes
      responseHashes.push({ path: req.url, sha256: createHash('sha256').update(body).digest('hex'), tamper })
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*', 'Timing-Allow-Origin': '*', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(body); return
    }
    if (req.url === '/documents' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 2_000_000) { res.writeHead(413).end(); return } }
      const doc = JSON.parse(body); if (usedDocumentIds.has(doc.frameId)) { res.writeHead(409).end(); return } usedDocumentIds.add(doc.frameId); docs.set(doc.frameId, doc); res.writeHead(204).end(); return
    }
    if (req.url.startsWith('/frame/')) {
      const id = req.url.slice('/frame/'.length), doc = docs.get(id)
      if (req.method === 'DELETE') { docs.delete(id); res.writeHead(204).end(); return }
      if (!doc) { res.writeHead(404).end(); return }
      res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': doc.csp, 'Permissions-Policy': doc.permissionsPolicy, 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(doc.html); return
    }
    if (req.url === '/fixture') { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(fixture)); return }
    if (req.url === '/client.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(client); return }
    if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html', 'Set-Cookie': 'secret=parent; SameSite=Strict', ...(pinned ? { ...(policyReceipt ? {'Permissions-Policy':policyReceipt.permissions_policy} : {}), 'Content-Security-Policy': policyReceipt?.csp ?? "script-src 'self' 'sha256-I1swIBtbR1QnY1/IgmK00boupM7TEi+/BltRerODeSY='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.tldraw.com; font-src 'self' data: https://cdn.tldraw.com; media-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" } : {}) }).end(`<!doctype html><html><head>${pinned ? '' : `<script type="importmap">${JSON.stringify({ imports: pinned ? {} : imports }).replaceAll('<', '\\u003c')}</script>`}</head><body><button id="parent-focus">Parent focus</button><div id="main-view"></div><script type="module" src="/client.js"></script></body></html>`); return }
    if (req.url === '/changed-plugin.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }).end('throw new Error("changed URL executed")'); return }
    res.writeHead(req.url === '/self-navigation' ? 200 : 404).end(req.url === '/self-navigation' ? 'egress observed' : 'unknown route')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  if (pinned) {
    const scope = 'sealed-route-control', probeBytes = Buffer.from('export const routeProbe = true;'), artifact = {id:'route-probe', kind:'module', sha256:createHash('sha256').update(probeBytes).digest('hex'), base64:probeBytes.toString('base64')}
    const provision = () => fetch(origin + '/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope, artifacts: [artifact], owner: {hostInstance:'route-control-host', owner:'route-control', generation:'1'} }) })
    const first = await provision(); assert.equal(first.status, 200)
    const url = Object.values(await first.json())[0]
    assert.equal((await provision()).status, 409)
    assert.equal(createHash('sha256').update(Buffer.from(await (await fetch(url)).arrayBuffer())).digest('hex'), artifact.sha256)
    assert.equal((await fetch(origin + '/modules/' + scope, { method: 'DELETE' })).status, 204)
    assert.equal((await fetch(url)).status, 404)
    assert.equal((await provision()).status, 409)
    assert.equal((await fetch(origin + '/modules/unknown.js')).status, 404)
    proofs.push('sealed route replacement and reuse after release refuse; admitted bytes stay exact; unknown routes refuse')
  }
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true })
  const context = await browser.newContext({ acceptDownloads: false })
  await context.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener, wrappers = new WeakMap()
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this !== window || type !== 'message' || typeof listener !== 'function') return add.call(this, type, listener, options)
      const wrapped = function (event) {
        if (event.data?.type === (window === top ? 'ready-window' : 'bind-window')) {
          for (const mutation of ['source', 'origin', 'nonce', 'port', 'version', 'schema']) {
            const data = { ...event.data }, ports = window === top ? [] : [new MessageChannel().port1]
            let source = event.source, origin = event.origin
            if (mutation === 'source') source = window
            if (mutation === 'origin') origin = 'https://wrong-origin.invalid'
            if (mutation === 'nonce') data.nonce = '0'.repeat(64)
            if (mutation === 'port') ports.push(new MessageChannel().port1)
            if (mutation === 'version') data.bridge_version = 2
            if (mutation === 'schema') data.extra = true
            listener.call(this, new MessageEvent('message', { data, source, origin, ports }))
            globalThis.fixtureWindowRejections = (globalThis.fixtureWindowRejections ?? 0) + 1
          }
        }
        return listener.call(this, event)
      }
      wrappers.set(listener, wrapped); return add.call(this, type, wrapped, options)
    }
    EventTarget.prototype.removeEventListener = function (type, listener, options) { return remove.call(this, type, wrappers.get(listener) ?? listener, options) }
    if (window === top) { globalThis.tamperedExecutions = 0; globalThis.pluginExecutions = 0; addEventListener('message', event => { if (event.data?.tamperedExecution) globalThis.tamperedExecutions++; if (event.data?.pluginExecuted) globalThis.pluginExecutions++ }); return }
    const send = MessagePort.prototype.postMessage
    MessagePort.prototype.postMessage = function (packet, ...rest) { globalThis.fixturePort = this; globalThis.fixturePacket = packet; return send.call(this, packet, ...rest) }
  })
  const page = await context.newPage(), errors = []
  page.on('response', response => { const headers = response.headers(); responseHeaders.push({url:response.url(), status:response.status(), headers:Object.fromEntries(['content-type','content-security-policy','permissions-policy','referrer-policy','cache-control','x-content-type-options','access-control-allow-origin','timing-allow-origin','location'].filter(name => headers[name] !== undefined).map(name => [name,headers[name]]))}) }); let downloads = 0, popups = 0
  if (process.env.DEBUG_FRAME_PROOF) {
    const debug = await context.newCDPSession(page)
    await debug.send('Debugger.enable')
    await debug.send('Debugger.setPauseOnExceptions', { state: 'all' })
    debug.on('Debugger.paused', event => { console.error('CAUGHT FRAME EXCEPTION:', event.data?.description ?? event.reason); void debug.send('Debugger.resume').catch(() => {}) })
  }
  page.on('console', message => { if (process.env.DEBUG_FRAME_PROOF) console.error('BROWSER CONSOLE:', message.text()); if (/integrity|Content Security Policy|violates/iu.test(message.text())) policyDenials.push(message.text()) })
  page.on('download', () => downloads++); page.on('popup', () => popups++)
  page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:', error.message) })
  await page.goto(origin); await page.waitForFunction(() => !!globalThis.fixtureHost)
  await page.evaluate(() => localStorage.setItem('secret', 'parent'))
  const call = (method, ...args) => page.evaluate(({ method, args }) => globalThis.fixtureHost[method](...args), { method, args })
  assert.equal((await call('load')).registryResult.accepted, true)
  const graphRequestStart = requests.length
  for (const code of ['import \"./mutable.js\"', 'import \"https://outside.invalid/module.js\"', 'import(location.href)', 'import \"unreviewed\"']) assert.equal(await call('forbiddenGraph', code), 'unsupported-variant')
  assert.equal(requests.slice(graphRequestStart).some(request => request.path === '/modules' || request.path === '/documents'), false)
  proofs.push('relative, remote, computed and unreviewed bare imports refuse before delivery or executable load')
  const info = await call('info')
  assert.equal(info.frames, 0, 'verification realm must be disposed before returning adoption handles')
  assert.equal(info.views.find(v => v.key === 'first').frozen, true)
  assert.equal(info.views.find(v => v.key === 'first').callable, false)
  assert.equal(info.views.find(v => v.key === 'missing').available, 'unavailable')
  assert.equal(await call('spoofHandle'), false)
  proofs.push('frame-confirmed inert namespace; missing exports unavailable; forged handles refused')
  const first = await call('mount'), second = await call('mount', 'second')
  console.log('Initial surface states:', await call('state', first), await call('state', second))
  try { await page.waitForFunction(({ first, second }) => globalThis.fixtureHost.state(first).status === 'ready' && globalThis.fixtureHost.state(second).status === 'ready', { first, second }, { timeout: 15_000 }) } catch (error) { console.error('SURFACE FAILURE:', await call('state', first), await call('state', second), await call('info')); throw error }
  const frames = page.frames().filter(frame => frame !== page.mainFrame()), a = frames[0], b = frames[1]
  await a.getByRole('button', { name: 'verified:0' }).click(); assert.equal(await a.getByRole('button').textContent(), 'verified:1')
  assert.equal(await b.getByRole('button').textContent(), 'verified:0')
  const containment = await a.evaluate(() => ({ parent: globalThis.pluginParentReadable, storage: globalThis.pluginStorageReadable, cookie: globalThis.pluginCookieReadable, exact: globalThis.pluginProof }))
  assert.deepEqual(containment, { parent: false, storage: false, cookie: false, exact: 'exact-pinned-bytes' })
  assert.equal(requests.filter(req => req.path === '/changed-plugin.js').length, 0)
  if (pinned) {
    for (const frame of [a, b]) {
      const transfers = await frame.evaluate(() => performance.getEntriesByType('resource').filter(row => /\/integrity-(positive-)?probe\.js$/u.test(row.name)).map(row => ({url:row.name, status:row.responseStatus, decodedBodySize:row.decodedBodySize})))
      assert.equal(transfers.length, 2)
      for (const transfer of transfers) {
        assert.equal(transfer.status, 200)
        assert.equal(transfer.decodedBodySize, Buffer.byteLength('export const integrityProbe = true;'))
        if (transfer.url.endsWith('/integrity-probe.js')) assert.ok(policyDenials.some(message => message.includes(transfer.url) && message.includes('computed SHA-256 integrity')))
      }
      probeTransfers.push(...transfers)
    }
    proofs.push('same opaque realm receives complete exact-size positive and bad-SRI probe responses; native SHA-256 rejection and correct-SRI rendering verified')
    assert.equal(await a.evaluate(() => Array.from(document.scripts).some(script => !!script.nonce) || !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')), false)
    assert.equal(await a.evaluate(async () => globalThis.pluginHook === (await import('react')).useState), true)
    for (const realm of [page, a]) {
      const denied = await realm.evaluate(async () => {
        const sources = ['data:text/javascript,globalThis.cspBypass=true', URL.createObjectURL(new Blob(['globalThis.cspBypass=true'], { type: 'text/javascript' }))]
        const results = []
        for (const source of sources) { try { await import(source); results.push(false) } catch { results.push(true) } }
        URL.revokeObjectURL(sources[1]); return { results, executed: globalThis.cspBypass === true }
      })
      assert.deepEqual(denied, { results: [true, true], executed: false })
    }
    proofs.push('unchanged parent and dedicated child script CSP refuse data/blob; approved bare peer resolves one React singleton per frame')
  }
  assert.ok(await page.evaluate(() => globalThis.fixtureWindowRejections >= 6)); assert.ok(await a.evaluate(() => globalThis.fixtureWindowRejections >= 6))
  proofs.push('window bootstrap rejects wrong source/origin/nonce/port/version/schema before legitimate binding')
  proofs.push('per-frame React/design exports mount; independent realms; exact bytes with changed source URL; opaque DOM/storage/cookie denial')
  const result = await a.evaluate(() => globalThis.pluginFrame.invoke('run', { type: 'command', command: 'tools/run', arguments: {} }))
  assert.deepEqual(result, { status: 'success' }); assert.equal((await call('info')).executionCount, 1)
  assert.equal((await a.evaluate(() => globalThis.pluginFrame.invoke('undeclared', { type: 'command', command: 'tools/run', arguments: {} }))).status, 'refused')
  await call('setAllowed', false)
  assert.equal((await a.evaluate(() => globalThis.pluginFrame.invoke('run', { type: 'command', command: 'tools/run', arguments: {} }))).reason, 'denied')
  assert.equal((await call('info')).executionCount, 1); await call('setAllowed', true)
  proofs.push('permitted typed action once; undeclared/ungranted actions zero adapter effects')
  await call('setHold', true)
  await a.evaluate(() => { globalThis.waiting = globalThis.pluginFrame.invoke('run', { type: 'command', command: 'tools/run', arguments: {} }) })
  await page.waitForFunction(() => globalThis.fixtureHost.info().executionCount === 2)
  await call('changeInvocation')
  assert.equal((await a.evaluate(() => globalThis.waiting)).status, 'unknown-outcome')
  await call('complete'); await call('setHold', false)
  assert.ok((await call('info')).events.includes('adapter-aborted'))
  proofs.push('invocation change cancels adapter; late committed effect is unknown-outcome without retry')
  for (const change of ['changeScope', 'unloadTarget']) {
    await call('setHold', true)
    const count = (await call('info')).executionCount
    await a.evaluate(() => { globalThis.waiting = globalThis.pluginFrame.invoke('run', { type: 'command', command: 'tools/run', arguments: {} }) })
    await page.waitForFunction(count => globalThis.fixtureHost.info().executionCount === count + 1, count)
    await call(change)
    assert.equal((await a.evaluate(() => globalThis.waiting)).status, 'unknown-outcome')
    await call('complete'); await call('setHold', false); await call('restoreScope')
  }
  proofs.push('scope and target unload abort active calls; late effects remain uncertain')
  const modalResult = await a.evaluate(() => globalThis.pluginFrame.invoke('open', { type: 'modal', region: 'modal.body', entry: { owner_id: 'notes', local_key: 'modal-target' }, props: {} }))
  assert.equal(modalResult.status, 'success'); await page.getByRole('dialog').waitFor(); await page.getByRole('button', { name: 'Close parent modal' }).click()
  assert.equal(await page.getByRole('dialog').count(), 0)
  proofs.push('reviewed modal action opens and closes a parent-owned focus shell')
  const oldPacket = await a.evaluate(() => globalThis.fixturePacket)
  const before = requests.length
  const network = await a.evaluate(async url => {
    const results = []
    try { await fetch(url + '/blocked-fetch'); results.push('fetch-allowed') } catch { results.push('fetch-denied') }
    const image = new Image(); image.src = url + '/blocked-image'; document.body.append(image)
    const form = document.createElement('form'); form.action = url + '/blocked-form'; document.body.append(form); form.submit()
    results.push(window.open(url + '/blocked-popup') === null ? 'popup-denied' : 'popup-opened')
    try { top.location.href = url + '/blocked-top'; results.push('top-allowed') } catch { results.push('top-denied') }
    const link = document.createElement('a'); link.download = 'blocked'; link.href = 'data:text/plain,blocked'; document.body.append(link); link.click()
    return results
  }, origin)
  await page.waitForTimeout(100)
  assert.deepEqual(network, ['fetch-denied', 'popup-denied', 'top-denied'])
  assert.equal(requests.slice(before).some(req => req.path.startsWith('/blocked-')), false)
  assert.equal(page.url(), origin + '/'); assert.equal(downloads, 0); assert.equal(popups, 0)
  proofs.push('fetch/subresource/forms/popups/downloads/top-navigation denied under fixed sandbox/CSP')
  await page.locator('#parent-focus').focus(); assert.equal(await page.locator('#parent-focus').evaluate(node => node === document.activeElement), true)
  await a.getByRole('button').focus(); await page.keyboard.press('Tab')
  assert.equal(await page.locator('iframe').count(), 2)
  proofs.push('parent owns focus shell; frame retains keyboard focus without parent DOM access')
  await call('disposeSurface', first)
  assert.equal(await b.getByRole('button').textContent(), 'verified:0')
  await call('update', second, 'updated'); await b.getByRole('button', { name: 'updated:0' }).waitFor()
  proofs.push('one surface disposal preserves sibling inventory/runtime; filtered context updates independently')
  const replayTarget = await call('mount')
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', replayTarget)
  let replayFrame = page.frames().filter(frame => frame !== page.mainFrame()).at(-1)
  await replayFrame.evaluate(packet => globalThis.fixturePort.postMessage(packet), oldPacket)
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'failed', replayTarget)
  proofs.push('sibling/remount replay rejected by fresh frame/nonce/sequence pins')
  for (const mutation of ['nonce', 'version', 'schema', 'port']) {
    const index = await call('mount'); await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', index)
    replayFrame = page.frames().filter(frame => frame !== page.mainFrame()).at(-1)
    await replayFrame.evaluate(mutation => {
      const config = JSON.parse(document.getElementById('plugin-frame-config').textContent)
      const packet = { bridge_version: 1, frame_id: config.frame_id, nonce: config.nonce, seq: 100, type: 'invoke', id: '1', binding: 'run', intent: { type: 'command', command: 'tools/run', arguments: {} } }
      if (mutation === 'nonce') packet.nonce = '0'.repeat(64)
      if (mutation === 'version') packet.bridge_version = 2
      if (mutation === 'schema') packet.extra = true
      globalThis.fixturePort.postMessage(JSON.stringify(packet), mutation === 'port' ? [new MessageChannel().port1] : [])
    }, mutation)
    await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'failed', index)
  }
  assert.equal((await call('info')).executionCount, 4)
  proofs.push('wrong nonce/version/schema/transferred port revoke without adapter effects')
  await call('failCleanup', true); await call('revoke'); await call('failCleanup', false)
  assert.equal(await page.locator('iframe').count(), 0); assert.ok((await call('info')).events.includes('cleanup-incomplete'))
  proofs.push('cleanup failure is reported after authority/ports/frames are fenced')
  await call('load', 'sandboxed-frame'); const modeSurface = await call('mount')
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', modeSurface)
  assert.equal(await page.locator('iframe').count(), 1)
  await call('load', 'main-origin')
  assert.equal(await page.locator('iframe').count(), 0)
  assert.equal(await call('oldIsCurrent'), false)
  assert.equal((await call('state', modeSurface)).status, 'failed')
  if (!pinned) {
  assert.equal(await call('mainSingleton'), true)
  await call('mainRender'); await page.getByRole('button', { name: 'main:0' }).waitFor()
  proofs.push('mode replacement fences old frames before main-origin; same-realm React singleton')
  } else proofs.push('immutable-delivery mode refuses main-origin instead of a data fallback')
  await call('load', 'sandboxed-frame'); const replacement = await call('mount')
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', replacement)
  const fresh = page.frames().find(frame => frame !== page.mainFrame())
  await fresh.evaluate(url => { location.href = url + '/self-navigation' }, origin).catch(() => {})
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'failed', replacement)
  assert.ok(requests.some(req => req.path === '/self-navigation'))
  proofs.push('self-navigation egress observed, then session revoked: explicitly not universal network denial')
  if (pinned) {
    for (const target of ['plugin', 'runtime']) {
      await page.evaluate(target => fetch('/control', { method: 'POST', body: target }), target)
      await call('load', 'sandboxed-frame')
      assert.notEqual((await call('info')).views.find(view => view.key === 'first')?.available, 'available')
      assert.equal(await page.locator('iframe').count(), 0)
      assert.equal(await page.evaluate(() => globalThis.tamperedExecutions), 0)
    }
    await page.evaluate(() => fetch('/control', { method: 'POST', body: '' }))
    await call('load', 'sandboxed-frame')
    const restored = await call('mount')
    await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', restored)
    proofs.push('browser SRI refuses tampered plugin and runtime responses after provisioning; clean replay restores exact-byte execution')
  }
  await call('shutdown')
  assert.equal(await page.locator('iframe').count(), 0)
  assert.deepEqual(errors, [])
  if (pinned) {
    for (const control of ['integrity', 'mapping', 'unavailable-probe']) {
    unavailableProbe = control === 'unavailable-probe'
    const unsupported = await browser.newContext()
    await unsupported.addInitScript(control => {
      if (window === top) { globalThis.pluginExecutions = 0; addEventListener('message', event => { if (event.data?.pluginExecuted) globalThis.pluginExecutions++ }); return }
      if (control === 'mapping') {
        const parse = JSON.parse
        JSON.parse = function (...args) { const value = parse.apply(this, args); if (value?.parent_origin && value.modules) value.modules.imports = []; return value }
        return
      }
      const append = Element.prototype.append
      Element.prototype.append = function (...nodes) {
        for (const node of nodes) if (node instanceof HTMLScriptElement && node.type === 'importmap') { const value = JSON.parse(node.textContent); delete value.integrity; node.textContent = JSON.stringify(value) }
        return append.apply(this, nodes)
      }
    }, control)
    const unsupportedPage = await unsupported.newPage()
    const controlResponses = []
    unsupportedPage.on('response', response => { if (/\/integrity-(positive-)?probe\.js$/u.test(response.url())) controlResponses.push({url:response.url(), status:response.status(), headers:response.headers()}) })
    await unsupportedPage.goto(origin)
    await unsupportedPage.waitForFunction(() => !!globalThis.fixtureHost)
    const start = requests.length
    await unsupportedPage.evaluate(() => globalThis.fixtureHost.load())
    assert.equal(await unsupportedPage.evaluate(() => globalThis.pluginExecutions), 0)
    assert.equal(await unsupportedPage.locator('iframe').count(), 0)
    assert.equal(requests.slice(start).some(request => request.path.endsWith('/plugin.js')), false)
    assert.equal(await unsupportedPage.evaluate(() => globalThis.fixtureHost.info().views.some(view => view.key === 'first' && view.available === 'available')), false)
    if (control === 'unavailable-probe') {
      assert.ok(controlResponses.some(response => response.url.endsWith('/integrity-positive-probe.js') && response.status === 200))
      assert.ok(controlResponses.some(response => response.url.endsWith('/integrity-probe.js') && response.status === 404))
    }
    capabilityControls.push({control, responses:controlResponses, pluginRequested:false, pluginExecuted:false, admitted:false})
    await unsupportedPage.evaluate(() => globalThis.fixtureHost.shutdown())
    await unsupported.close()
    unavailableProbe = false
    proofs.push(control === 'unavailable-probe' ? 'unsupported-integrity plus missing negative probe refuses before requesting/executing plugin bytes' : control === 'integrity' ? 'removed-integrity capability control fails preflight before requesting/executing plugin bytes; no fallback' : 'sealed document/init graph mapping mismatch refuses before requesting/executing plugin bytes')
    }
  }
  await context.close()
  if (evidenceRoot) await writeFile(join(evidenceRoot, 'acceptance.json'), JSON.stringify({ browser: browser.version(), pinned, consumerRoot: root, productionPolicyReceipt: policyReceipt, proofs, probeTransfers, capabilityControls, moduleManifests, responseHeaders, responseHashes, requests, policyDenials, errors }, null, 2))
  for (const proof of proofs) console.log('PASS: ' + proof)
  console.log('Browser acceptance complete; expected policy-denial console errors are not application failures.')
} catch (error) { if (evidenceRoot) await writeFile(join(evidenceRoot, 'failure.json'), JSON.stringify({ error: String(error), responseHashes, policyDenials, requests }, null, 2)); console.error('BROWSER PROOF FAILED:', error); throw error }
finally { await rm(toolsEntry, { force: true }); await rm(join(root, '.candidate-ui.js'), { force: true }); await rm(join(root, '.candidate-client.ts'), { force: true }); await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await rm(scratch, { recursive: true, force: true }) }
