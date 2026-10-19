// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { expect, it, vi } from 'vitest'
import { createPluginFrameBrowser, base64Bytes, sha256Bytes, verifyArtifact, reviewFrameModule, createFrameDocument } from '../src/isolation.js'
import { store } from './helpers.js'
import type { AppIsolationSnapshot } from '../src/host.js'
// jsdom's ArrayBuffer realm differs from Node's WebCrypto realm. Preserve real hashing.
vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto), subtle: { digest: (algorithm: string, data: ArrayBuffer) => webcrypto.subtle.digest(algorithm, Buffer.from(new Uint8Array(data))) } })
const bytes = new TextEncoder().encode('export function View() { return null }')
it('refuses relative, URL, computed and unreviewed graphs while permitting declared bare peers', async () => {
  for (const code of ['import "./x.js"', 'export * from "https://host.test/x"', 'import(location.href)', 'import "unreviewed"', 'import.meta.url']) await expect(reviewFrameModule(new TextEncoder().encode(code), ['react'])).rejects.toThrow()
  await expect(reviewFrameModule(new TextEncoder().encode('import React from "react"; export const View = React.createElement'), ['react'])).resolves.toBeUndefined()
})
it('verifies exact bytes and refuses altered digests and noncanonical base64', async () => {
  const artifact = { id: 'plugin', kind: 'module' as const, sha256: await sha256Bytes(bytes), base64: base64Bytes(bytes) }
  expect([...await verifyArtifact(artifact)]).toEqual([...bytes])
  await expect(verifyArtifact({ ...artifact, sha256: '0'.repeat(64) })).rejects.toThrow('digest-mismatch')
  await expect(verifyArtifact({ ...artifact, base64: 'YR==' })).rejects.toThrow('invalid-message')
})
it('preflights digest and mode before any frame delivery or source URL fetch', async () => {
  const provision = vi.fn(), review = vi.fn(), isolation = store<AppIsolationSnapshot>({ appId: 'app', effectiveMode: 'sandboxed-frame', revision: '1' })
  const controller = createPluginFrameBrowser({ document, appId: 'app', isolation, bootstrap: '', delivery: { provision }, review,
    subscribeLeases: () => () => {}, isActive: () => false, isOwnerActive: () => false, host: () => { throw new Error('not adopted') }, bindings: () => [], props: () => ({}), diagnostics: vi.fn() })
  const bundle = { owner: 'notes', generation: '1', hostInstance: 'host', digest: `sha256:${'0'.repeat(64)}`, bytes, sourceUrl: 'https://never-fetch.test/plugin.js', signal: new AbortController().signal }
  await expect(controller.importModule(bundle)).rejects.toThrow('digest-mismatch')
  expect(provision).not.toHaveBeenCalled(); expect(review).not.toHaveBeenCalled()
  isolation.set({ appId: 'wrong-app', effectiveMode: 'main-origin', revision: '2' })
  await expect(controller.importModule(bundle)).rejects.toThrow('missing-effective-mode')
  controller.dispose()
})
it('assembles a document with fixed bootstrap bytes, distinct cryptographic nonces and no plugin configuration', async () => {
  const doc = await createFrameDocument('globalThis.bootstrap = true;', { frameId: 'frame', nonce: 'ab'.repeat(32), parentOrigin: 'https://host.test' })
  expect(doc.csp).toContain("connect-src 'none'")
  expect(doc.html).toContain('globalThis.bootstrap = true;')
  expect(doc.html).toContain('"parent_origin":"https://host.test"')
  await expect(createFrameDocument('</script>', { frameId: 'frame', nonce: 'ab'.repeat(32), parentOrigin: 'https://host.test' })).rejects.toThrow('policy-unavailable')
})
it('admits only verified digest-bound same-origin module responses and derives browser SRI', async () => {
  const { admitFrameModuleLocations } = await import('../src/isolation.js')
  const sha256 = await sha256Bytes(bytes), artifact = { id: 'plugin', kind: 'module' as const, sha256, base64: base64Bytes(bytes) }
  const url = `https://host.test/modules/${sha256}/plugin.js`
  const imports = [{ specifier: 'reviewed-peer', artifact: 'plugin' }]
  const locations = await admitFrameModuleLocations([artifact], { plugin: url }, 'https://host.test', imports)
  expect(locations.imports).toEqual(imports)
  expect(Object.isFrozen(locations.imports[0])).toBe(true)
  await expect(admitFrameModuleLocations([artifact], { plugin: url }, 'https://host.test', [{ specifier: 'reviewed-peer', artifact: 'missing' }])).rejects.toThrow('policy-unavailable')
  await expect(admitFrameModuleLocations([artifact], { plugin: url }, 'https://host.test', [...imports, ...imports])).rejects.toThrow('policy-unavailable')
  expect(locations.urls.plugin).toBe(url)
  expect(locations.integrity[url]).toMatch(/^sha256-[A-Za-z0-9+/]{43}=$/u)
  for (const invalid of [`https://evil.test/${sha256}`, `data:text/javascript,${sha256}`, `${url}?mutable=1`, `${url}#other`, 'https://host.test/source.js']) {
    await expect(admitFrameModuleLocations([artifact], { plugin: invalid }, 'https://host.test')).rejects.toThrow('policy-unavailable')
  }
  await expect(admitFrameModuleLocations([{ ...artifact, base64: base64Bytes(new TextEncoder().encode('tampered')) }], { plugin: url }, 'https://host.test')).rejects.toThrow('digest-mismatch')
  const doc = await createFrameDocument('globalThis.bootstrap = true;', { frameId: 'frame', nonce: 'ab'.repeat(32), parentOrigin: 'https://host.test', modules: locations })
  expect(doc.csp).toContain(url)
  expect(doc.csp.split(';').find(field => field.trim().startsWith('script-src'))).not.toContain('data:')
})
it('releases both provisioned stores when a dedicated frame URL is malformed', async () => {
  const digest = `sha256:${await sha256Bytes(bytes)}`
  const artifact = { id: 'runtime', kind: 'module' as const, sha256: digest.slice(7), base64: base64Bytes(bytes) }
  const releaseDocument = vi.fn(), releaseModules = vi.fn()
  const controller = createPluginFrameBrowser({ document, appId: 'app', isolation: store<AppIsolationSnapshot>({ appId: 'app', effectiveMode: 'sandboxed-frame', revision: '1' }), bootstrap: 'globalThis.bootstrap = true;',
    moduleDelivery: { async provision(artifacts) { return { urls: Object.fromEntries(artifacts.filter(row => row.kind === 'module').map(row => [row.id, `${location.origin}/modules/${row.sha256}/${row.id}.js`])), release: releaseModules } } },
    delivery: { async provision() { return { src: 'malformed-url', policyAdmitted: true, release: releaseDocument } } },
    review: bundle => ({ owner: { owner: bundle.owner, generation: bundle.generation, hostInstance: bundle.hostInstance }, digest: bundle.digest, mode: 'sandboxed-frame', exports: ['View'], artifacts: [artifact], imports: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'].map(specifier => ({ specifier, artifact: 'runtime' })) }),
    subscribeLeases: () => () => {}, isActive: () => true, isOwnerActive: () => true, host: () => { throw new Error('not adopted') }, bindings: () => [], props: () => ({}), diagnostics: vi.fn() })
  await expect(controller.importModule({ owner: 'notes', generation: '1', hostInstance: 'host', digest, bytes, sourceUrl: '/never-fetch.js', signal: new AbortController().signal })).rejects.toThrow()
  expect(releaseDocument).toHaveBeenCalledOnce(); expect(releaseModules).toHaveBeenCalledOnce()
  expect(document.querySelector('iframe')).toBeNull()
  controller.dispose()
})
