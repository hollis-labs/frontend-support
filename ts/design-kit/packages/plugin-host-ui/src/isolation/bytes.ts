import { BRIDGE_LIMITS, type BridgeArtifact } from './protocol.js'
export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}
export function base64Bytes(bytes: Uint8Array): string {
  let binary = ''
  for (let at = 0; at < bytes.length; at += 8192) binary += String.fromCharCode(...bytes.subarray(at, at + 8192))
  return btoa(binary)
}
export function decodeArtifact(artifact: BridgeArtifact): Uint8Array {
  if (artifact.base64.length > 4 * Math.ceil(BRIDGE_LIMITS.artifactBytes / 3)) throw new Error('payload-too-large')
  const binary = atob(artifact.base64), bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  if (bytes.length > BRIDGE_LIMITS.artifactBytes || base64Bytes(bytes) !== artifact.base64) throw new Error('invalid-message')
  return bytes
}
export async function verifyArtifact(artifact: BridgeArtifact): Promise<Uint8Array> {
  const bytes = decodeArtifact(artifact)
  if (await sha256Bytes(bytes) !== artifact.sha256) throw new Error('digest-mismatch')
  return bytes
}
/** The digest/owner suffix separates generations without changing execution bytes. */
export function artifactModuleUrl(artifact: BridgeArtifact, scope: string): string {
  return `data:text/javascript;base64,${artifact.base64}#${encodeURIComponent(JSON.stringify([scope, artifact.sha256]))}`
}
