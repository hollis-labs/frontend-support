import { buildFrameCsp, FRAME_PERMISSIONS } from './csp.js'
import { sha256Bytes, base64Bytes } from './bytes.js'
import type { FrameModuleLocations } from './delivery.js'
import { createFrameNonce } from './controller.js'
export interface FrameDocument { readonly frameId: string; readonly html: string; readonly csp: string; readonly permissionsPolicy: string }
export interface FrameDocumentDelivery {
  /** Host serves this exact document/response policy, or pre-admits inherited srcdoc policy. */
  provision(document: FrameDocument): Promise<{ src: string; srcdoc?: never; policyAdmitted: true; release(): void } | { srcdoc: string; src?: never; policyAdmitted: true; release(): void }>
}
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
export async function createFrameDocument(bootstrap: string, options: { frameId: string; nonce: string; parentOrigin: string; modules?: FrameModuleLocations }): Promise<FrameDocument> {
  if (/<\/script/iu.test(bootstrap) || !options.parentOrigin || options.parentOrigin === 'null' || options.parentOrigin === '*') throw new Error('policy-unavailable')
  const hash = await sha256Bytes(new TextEncoder().encode(bootstrap))
  const hashBase64 = base64Bytes(Uint8Array.from(hash.match(/../gu)!, hex => parseInt(hex, 16)))
  const documentNonce = base64Bytes(Uint8Array.from(createFrameNonce().match(/../gu)!, hex => parseInt(hex, 16)))
  const policy = buildFrameCsp({ bootstrapSha256: hashBase64, documentNonce, ...(options.modules ? { moduleUrls: Object.values(options.modules.urls) } : {}) })
  if (!policy.accepted) throw new Error(policy.reason)
  const config = JSON.stringify({ bridge_version: 1, frame_id: options.frameId, nonce: options.nonce, parent_origin: options.parentOrigin, ...(options.modules ? { modules: options.modules } : {}) }).replaceAll('<', '\\u003c')
  return Object.freeze({ frameId: options.frameId, csp: policy.value, permissionsPolicy: FRAME_PERMISSIONS.split(';').map(field => `${field.trim().split(' ')[0]}=()`).join(', '),
    html: `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escape(policy.value)}"><script id="plugin-frame-config" type="application/json">${config}</script><script nonce="${documentNonce}">${bootstrap}</script></head><body></body></html>` })
}
