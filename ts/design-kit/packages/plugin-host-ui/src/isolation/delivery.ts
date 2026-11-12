import { base64Bytes, verifyArtifact } from './bytes.js'
import type { FrameOwner } from './controller.js'
import type { BridgeArtifact, BridgeImport } from './protocol.js'

/** Host-owned immutable response store. Never an adapter for sourceUrl. */
export interface FrameModuleDelivery {
  provision(artifacts: readonly BridgeArtifact[], scope: string, imports: readonly BridgeImport[], owner: Readonly<FrameOwner>): Promise<{
    readonly urls: Readonly<Record<string, string>>
    release(): void
  }>
}
export interface FrameModuleManifestEntry {
  readonly id: string
  readonly sha256: string
  readonly mediaType: 'text/javascript'
  readonly url: string
}
export interface FrameModuleLocations {
  readonly imports: readonly BridgeImport[]
  readonly manifest: readonly FrameModuleManifestEntry[]
  readonly urls: Readonly<Record<string, string>>
  readonly integrity: Readonly<Record<string, string>>
}
/** Pins canonical same-origin response URLs to the verified module inventory. */
export async function admitFrameModuleLocations(artifacts: readonly BridgeArtifact[], urls: Readonly<Record<string, string>>, origin: string, imports: readonly BridgeImport[] = []): Promise<FrameModuleLocations> {
  const modules = artifacts.filter(artifact => artifact.kind === 'module')
  if (Object.keys(urls).length !== modules.length) throw new Error('policy-unavailable')
  const pinned: Record<string, string> = Object.create(null), integrity: Record<string, string> = Object.create(null)
  const manifest: FrameModuleManifestEntry[] = []
  const specifiers = new Set<string>()
  const mapping = imports.map(entry => {
    if (!entry.specifier || specifiers.has(entry.specifier) || !modules.some(artifact => artifact.id === entry.artifact)) throw new Error('policy-unavailable')
    specifiers.add(entry.specifier)
    return Object.freeze({ specifier: entry.specifier, artifact: entry.artifact })
  })
  const parent = new URL(origin)
  if (!['http:', 'https:'].includes(parent.protocol) || parent.origin !== origin) throw new Error('policy-unavailable')
  for (const artifact of modules) {
    await verifyArtifact(artifact)
    if (!Object.hasOwn(urls, artifact.id)) throw new Error('policy-unavailable')
    const url = new URL(urls[artifact.id])
    if (url.origin !== origin || url.username || url.password || url.search || url.hash || url.href !== urls[artifact.id] || !url.pathname.includes(artifact.sha256) || Object.hasOwn(integrity, url.href)) throw new Error('policy-unavailable')
    manifest.push(Object.freeze({ id: artifact.id, sha256: artifact.sha256, mediaType: 'text/javascript', url: url.href }))
    pinned[artifact.id] = url.href
    integrity[url.href] = `sha256-${base64Bytes(Uint8Array.from(artifact.sha256.match(/../gu)!, hex => parseInt(hex, 16)))}`
  }
  return Object.freeze({ imports: Object.freeze(mapping), manifest: Object.freeze(manifest), urls: Object.freeze(pinned), integrity: Object.freeze(integrity) })
}
