/** Policy is host-owned. No directive strings or plugin-supplied origins are accepted. */
export interface FrameCspPolicy { readonly bootstrapSha256: string; readonly documentNonce: string; readonly moduleUrls?: readonly string[] }
export type FrameCspResult = { accepted: true; value: string } | { accepted: false; reason: 'policy-unavailable' }
export function buildFrameCsp(policy: FrameCspPolicy): FrameCspResult {
  if (!policy || !/^[A-Za-z0-9+/]{43}=$/u.test(policy.bootstrapSha256) || !/^[A-Za-z0-9+/]{43}=$/u.test(policy.documentNonce) ||
    Object.keys(policy).some(k => k !== 'bootstrapSha256' && k !== 'documentNonce' && k !== 'moduleUrls')) return { accepted: false, reason: 'policy-unavailable' }
  if (policy.moduleUrls && (!policy.moduleUrls.length || policy.moduleUrls.some(value => {
    try { const url = new URL(value); return !['http:', 'https:'].includes(url.protocol) || url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '' || url.href !== value || /[\s;'<>]/u.test(value) } catch { return true }
  }))) return { accepted: false, reason: 'policy-unavailable' }
  const scripts = policy.moduleUrls ? policy.moduleUrls.join(' ') : 'data:'
  const directives = {
    'default-src': "'none'", 'script-src': `'sha256-${policy.bootstrapSha256}' 'nonce-${policy.documentNonce}' ${scripts}`,
    'style-src': "'unsafe-inline'", 'img-src': 'data:', 'font-src': 'data:', 'media-src': 'data:',
    'connect-src': "'none'", 'frame-src': "'none'", 'child-src': "'none'", 'worker-src': "'none'", 'manifest-src': "'none'",
    'object-src': "'none'", 'base-uri': "'none'", 'form-action': "'none'",
  }
  return { accepted: true, value: Object.entries(directives).map(([name, value]) => `${name} ${value}`).join('; ') }
}
export const FRAME_SANDBOX = 'allow-scripts'
export const FRAME_PERMISSIONS = "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; payment 'none'; fullscreen 'none'; usb 'none'; serial 'none'; hid 'none'; display-capture 'none'"
