import { parsePluginAction, type ActionRefusalReason, type PluginActionIntent, type PluginJsonValue, type PluginJsonObject } from '../actions-contract.js'

export const BRIDGE_VERSION = 1 as const
export const BRIDGE_LIMITS = Object.freeze({ controlBytes: 64 * 1024, contextBytes: 64 * 1024, initBytes: 32 * 1024 * 1024,
  artifactBytes: 8 * 1024 * 1024, aggregateArtifactBytes: 16 * 1024 * 1024, depth: 32, pending: 32,
  invokesPerSecond: 20, burst: 40, callMs: 30_000, handshakeMs: 10_000, drainMs: 2_000 })
export type BridgeLimits = { readonly [K in keyof typeof BRIDGE_LIMITS]: number }
export const ACTION_REASONS = Object.freeze({
  'unsupported-action': true, 'invalid-metadata': true, 'stale-owner': true, 'absent-scope': true,
  'unresolved-command-target': true, 'unresolved-modal-target': true, denied: true, 'invalid-arguments': true,
  'unregistered-route': true, cancelled: true, 'host-failed': true,
} satisfies Record<ActionRefusalReason, true>)
export const BRIDGE_REASONS = Object.freeze({
  'invalid-message': true, 'rate-limited': true, 'payload-too-large': true, 'protocol-mismatch': true,
  'handshake-failed': true, 'stale-frame': true, disposed: true, 'policy-unavailable': true,
})
export type BridgeReason = keyof typeof BRIDGE_REASONS | ActionRefusalReason
export const FAILURE_CODES = Object.freeze({
  'protocol-mismatch': true, 'handshake-failed': true, 'policy-unavailable': true, 'digest-mismatch': true,
  'invalid-message': true, 'payload-too-large': true, 'unsupported-variant': true, 'missing-export': true,
  'import-failed': true, 'mount-failed': true, 'secure-randomness-unavailable': true,
})
export type FrameFailureCode = keyof typeof FAILURE_CODES
export interface BridgeArtifact { readonly id: string; readonly kind: 'module' | 'style'; readonly sha256: string; readonly base64: string }
export interface BridgeImport { readonly specifier: string; readonly artifact: string }
export interface BridgeBinding { readonly id: string; readonly intent: PluginActionIntent }
export type BridgeOutcome = { readonly status: 'success' }
  | { readonly status: 'refused'; readonly reason: BridgeReason; readonly action_reason?: ActionRefusalReason; readonly text?: string }
  | { readonly status: 'cancelled' | 'timeout' | 'unknown-outcome' }
export interface BridgeEnvelope { readonly bridge_version: 1; readonly frame_id: string; readonly nonce: string; readonly seq: number }
export type BridgeMessage = BridgeEnvelope & (
  { type: 'bound' | 'ready' }
  | { type: 'init'; artifacts: readonly BridgeArtifact[]; imports: readonly BridgeImport[]; context: PluginJsonObject; bindings: readonly BridgeBinding[] }
  | { type: 'initialized'; exports: readonly string[] }
  | { type: 'mount'; export: string; props: PluginJsonObject; context_revision: string }
  | { type: 'invoke'; id: string; binding: string; intent: PluginActionIntent }
  | { type: 'result'; id: string; outcome: BridgeOutcome }
  | { type: 'cancel'; id: string }
  | { type: 'context'; revision: string; value: PluginJsonObject }
  | { type: 'dispose'; reason: BridgeReason }
  | { type: 'failed'; code: FrameFailureCode }
)
/** Every schema is closed; required/optional key arrays are frozen with their table. */
export const BRIDGE_FIELDS = freeze({ bound: [], ready: [], init: ['artifacts', 'imports', 'context', 'bindings'], initialized: ['exports'], mount: ['export', 'props', 'context_revision'], invoke: ['id', 'binding', 'intent'], result: ['id', 'outcome'], cancel: ['id'], context: ['revision', 'value'], dispose: ['reason'], failed: ['code'] } satisfies Record<BridgeMessage['type'], readonly string[]>)
export const BRIDGE_DTOS = freeze({
  envelope: { required: ['bridge_version', 'frame_id', 'nonce', 'seq', 'type'], optional: [] },
  window: { required: ['bridge_version', 'frame_id', 'nonce', 'type'], optional: [] },
  artifact: { required: ['id', 'kind', 'sha256', 'base64'], optional: [] },
  imports: { required: ['specifier', 'artifact'], optional: [] },
  binding: { required: ['id', 'intent'], optional: [] },
  terminalOutcome: { required: ['status'], optional: [] },
  refusedOutcome: { required: ['status', 'reason'], optional: ['action_reason', 'text'] },
})
export interface WindowMessage { readonly bridge_version: 1; readonly frame_id: string; readonly nonce: string; readonly type: 'ready-window' | 'bind-window' }
export type BridgeParse<T> = { accepted: true; message: T } | { accepted: false; reason: 'invalid-message' | 'payload-too-large' | 'protocol-mismatch' }
const encoder = new TextEncoder()
export const utf8Bytes = (value: string) => encoder.encode(value).byteLength
const badKeys = new Set(['__proto__', 'prototype', 'constructor'])
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
function exact(v: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) {
  return required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k))
}
const text = (v: unknown, max = 256): v is string => typeof v === 'string' && v.length > 0 && utf8Bytes(v) <= max
const nonce = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v)
const id = (v: unknown): v is string => typeof v === 'string' && /^[1-9][0-9]{0,19}$/u.test(v)
const code = (v: unknown, table: object): v is string => typeof v === 'string' && Object.hasOwn(table, v)
const reason = (v: unknown): v is BridgeReason => code(v, BRIDGE_REASONS) || code(v, ACTION_REASONS)
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value) }
  return value
}
/** Bounded JSON decoder, rejecting duplicate and prototype keys before object construction. */
export function decodeBridgeJson(raw: string, depthLimit: number = BRIDGE_LIMITS.depth): PluginJsonValue {
  let at = 0
  function ws() { while (/[\x20\t\r\n]/u.test(raw[at] ?? '') && at < raw.length) at++ }
  function string(): string {
    const start = at++
    while (at < raw.length) {
      const c = raw[at++]
      if (c === '\\') { at++; continue }
      if (c === '"') return JSON.parse(raw.slice(start, at)) as string
    }
    throw new Error('Invalid JSON')
  }
  function value(depth: number): PluginJsonValue {
    ws(); if (depth > depthLimit) throw new Error('Depth exceeded')
    const c = raw[at]
    if (c === '"') return string()
    if (c === '{') {
      at++; ws(); const fields: [string, PluginJsonValue][] = [], keys = new Set<string>()
      if (raw[at] !== '}') for (;;) {
        ws(); if (raw[at] !== '"') throw new Error('Invalid key')
        const key = string(); if (badKeys.has(key) || keys.has(key)) throw new Error('Invalid key'); keys.add(key)
        ws(); if (raw[at++] !== ':') throw new Error('Invalid object')
        fields.push([key, value(depth + 1)]); ws()
        if (raw[at] !== ',') break
        at++
      }
      if (raw[at++] !== '}') throw new Error('Invalid object')
      return Object.fromEntries(fields)
    }
    if (c === '[') {
      at++; ws(); const list: PluginJsonValue[] = []
      if (raw[at] !== ']') for (;;) { list.push(value(depth + 1)); ws(); if (raw[at] !== ',') break; at++ }
      if (raw[at++] !== ']') throw new Error('Invalid array'); return list
    }
    for (const [token, result] of [['true', true], ['false', false], ['null', null]] as const) {
      if (raw.startsWith(token, at)) { at += token.length; return result }
    }
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(raw.slice(at))
    if (!match) throw new Error('Invalid value')
    at += match[0].length; const number = Number(match[0])
    if (!Number.isFinite(number)) throw new Error('Nonfinite number')
    return number
  }
  const parsed = value(0); ws(); if (at !== raw.length) throw new Error('Trailing data')
  return parsed
}
function jsonObject(v: unknown, limits: BridgeLimits): v is PluginJsonObject { return object(v) && utf8Bytes(JSON.stringify(v)) <= limits.contextBytes }
function outcome(v: unknown): v is BridgeOutcome {
  if (!object(v)) return false
  if (v.status === 'success' || ['cancelled', 'timeout', 'unknown-outcome'].includes(String(v.status))) return exact(v, BRIDGE_DTOS.terminalOutcome.required)
  return v.status === 'refused' && exact(v, BRIDGE_DTOS.refusedOutcome.required, BRIDGE_DTOS.refusedOutcome.optional) && reason(v.reason) &&
    (!Object.hasOwn(v, 'action_reason') || code(v.action_reason, ACTION_REASONS)) &&
    (!Object.hasOwn(v, 'text') || text(v.text, 1024))
}
function init(v: Record<string, unknown>, limits: BridgeLimits): boolean {
  if (!Array.isArray(v.artifacts) || !v.artifacts.length || !Array.isArray(v.imports) || !Array.isArray(v.bindings) || !jsonObject(v.context, limits)) return false
  let total = 0
  const artifacts = new Map<string, 'module' | 'style'>(), specifiers = new Set<string>(), bindings = new Set<string>()
  for (const a of v.artifacts) {
    if (!object(a) || !exact(a, BRIDGE_DTOS.artifact.required) || !text(a.id) || artifacts.has(a.id) || (a.kind !== 'module' && a.kind !== 'style') ||
      typeof a.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(a.sha256) || typeof a.base64 !== 'string' ||
      a.base64.length > 4 * Math.ceil(limits.artifactBytes / 3) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(a.base64)) return false
    const bytes = a.base64.length / 4 * 3 - (a.base64.endsWith('==') ? 2 : a.base64.endsWith('=') ? 1 : 0)
    if (bytes > limits.artifactBytes || (total += bytes) > limits.aggregateArtifactBytes) return false
    artifacts.set(a.id, a.kind)
  }
  for (const i of v.imports) {
    if (!object(i) || !exact(i, BRIDGE_DTOS.imports.required) || !text(i.specifier) || !text(i.artifact) || artifacts.get(i.artifact) !== 'module' || specifiers.has(i.specifier) ||
      /^(?:[./]|[a-z][a-z0-9+.-]*:)/iu.test(i.specifier) || /[\s\\?#]/u.test(i.specifier)) return false
    specifiers.add(i.specifier)
  }
  for (const b of v.bindings) {
    if (!object(b) || !exact(b, BRIDGE_DTOS.binding.required) || !text(b.id) || bindings.has(b.id) || !parsePluginAction(b.intent).accepted) return false
    bindings.add(b.id)
  }
  return true
}
export function parseWindowMessage(raw: unknown): BridgeParse<WindowMessage> {
  try {
    if (!object(raw) || (Object.getPrototypeOf(raw) !== Object.prototype && Object.getPrototypeOf(raw) !== null) || !exact(raw, BRIDGE_DTOS.window.required) || !text(raw.frame_id) || !nonce(raw.nonce) || !['ready-window', 'bind-window'].includes(String(raw.type))) return { accepted: false, reason: 'invalid-message' }
    if (raw.bridge_version !== BRIDGE_VERSION) return { accepted: false, reason: 'protocol-mismatch' }
    return { accepted: true, message: Object.freeze({ bridge_version: 1, frame_id: raw.frame_id, nonce: raw.nonce, type: raw.type as WindowMessage['type'] }) }
  } catch { return { accepted: false, reason: 'invalid-message' } }
}
/** Read only the top-level discriminator without allocating the artifact payload. */
function isInitEnvelope(raw: string): boolean {
  let depth = 0
  for (let at = 0; at < raw.length; at++) {
    const c = raw[at]
    if (c === '{' || c === '[') { if (++depth > BRIDGE_LIMITS.depth + 1) return false }
    else if (c === '}' || c === ']') depth--
    else if (c === '"') {
      const start = at++
      for (; at < raw.length; at++) { if (raw[at] === '\\') at++; else if (raw[at] === '"') break }
      if (depth === 1 && at - start <= 32) {
        const token = JSON.parse(raw.slice(start, at + 1)) as string
        if (token === 'type') {
          const tail = raw.slice(at + 1, at + 40)
          if (/^\s*:\s*"init"\s*[,}]/u.test(tail)) return true
        }
      }
    }
  }
  return false
}
/** Only JSON strings enter the port. Size is checked before decoding or allocating artifacts. */
export function parseBridgeMessage(raw: unknown, limits: BridgeLimits = BRIDGE_LIMITS): BridgeParse<BridgeMessage> {
  try {
    for (const key of Object.keys(BRIDGE_LIMITS) as (keyof BridgeLimits)[]) if (!Number.isSafeInteger(limits[key]) || limits[key] < 1 || limits[key] > BRIDGE_LIMITS[key]) return { accepted: false, reason: 'invalid-message' }
    if (typeof raw !== 'string') return { accepted: false, reason: 'invalid-message' }
    const size = utf8Bytes(raw)
    if (size > limits.initBytes) return { accepted: false, reason: 'payload-too-large' }
    // An oversized control message is rejected before parsing its JSON tree.
    if (size > limits.controlBytes && !isInitEnvelope(raw)) return { accepted: false, reason: 'payload-too-large' }
    const v = decodeBridgeJson(raw, limits.depth)
    if (!object(v) || !text(v.frame_id) || !nonce(v.nonce) || !Number.isSafeInteger(v.seq) || (v.seq as number) < 1) return { accepted: false, reason: 'invalid-message' }
    if (v.bridge_version !== 1) return { accepted: false, reason: 'protocol-mismatch' }
    if (!code(v.type, BRIDGE_FIELDS) || !exact(v, [...BRIDGE_DTOS.envelope.required, ...BRIDGE_FIELDS[v.type as BridgeMessage['type']]])) return { accepted: false, reason: 'invalid-message' }
    if (v.type !== 'init' && size > limits.controlBytes) return { accepted: false, reason: 'payload-too-large' }
    let valid = false
    switch (v.type) {
      case 'bound': case 'ready': valid = true; break
      case 'init': valid = init(v, limits); break
      case 'initialized': valid = Array.isArray(v.exports) && v.exports.length <= 256 && v.exports.every(e => text(e)) && new Set(v.exports).size === v.exports.length; break
      case 'mount': valid = text(v.export) && jsonObject(v.props, limits) && text(v.context_revision); break
      case 'invoke': valid = id(v.id) && text(v.binding) && parsePluginAction(v.intent).accepted; break
      case 'result': valid = id(v.id) && outcome(v.outcome); break
      case 'cancel': valid = id(v.id); break
      case 'context': valid = text(v.revision) && jsonObject(v.value, limits); break
      case 'dispose': valid = reason(v.reason); break
      case 'failed': valid = code(v.code, FAILURE_CODES); break
    }
    return valid ? { accepted: true, message: freeze(v) as unknown as BridgeMessage } : { accepted: false, reason: 'invalid-message' }
  } catch { return { accepted: false, reason: 'invalid-message' } }
}
/** Canonical sender validates the complete closed envelope before sending. */
export function encodeBridgeMessage(message: BridgeMessage): string {
  const { type, ...rest } = message
  const raw = JSON.stringify({ type, ...rest })
  if (!parseBridgeMessage(raw).accepted) throw new Error('Invalid bridge message')
  return raw
}
