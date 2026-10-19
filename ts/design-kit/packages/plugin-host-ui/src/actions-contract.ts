import type { ContributionRef, HostScope, Observable } from './host.js'
export type PluginJsonValue = null | boolean | number | string | readonly PluginJsonValue[] | { readonly [key: string]: PluginJsonValue }
export type PluginJsonObject = Readonly<Record<string, PluginJsonValue>>
export type PluginActionIntent = { type: 'command'; command: string; arguments: PluginJsonObject }
  | { type: 'navigate'; route: string; parameters: PluginJsonObject }
  | { type: 'modal'; region: string; entry: { owner_id: string; local_key: string }; props: PluginJsonObject }
export type ActionRefusalReason = 'unsupported-action' | 'invalid-metadata' | 'stale-owner' | 'absent-scope' | 'unresolved-command-target' | 'unresolved-modal-target' | 'denied' | 'invalid-arguments' | 'unregistered-route' | 'cancelled' | 'host-failed'
export type ActionResult = { status: 'success' } | { status: 'refused'; reason: ActionRefusalReason }
export interface ActionContext {
  contribution: ContributionRef
  scope: HostScope
  /** Verified host context, never declaration arguments or caller-supplied identity. */
  invocation: Readonly<Record<string, unknown>>
  /** Compiled by the host gateway; never a plugin-supplied generation or export. */
  target?: ContributionRef
}
/** Host-compiled allowlist. Requests never supply a resolver or a source lease. */
export interface PluginActionBindingResolver {
  resolve(source: ContributionRef, binding: string, requested: PluginActionIntent): PluginActionIntent | undefined
}
export interface PluginActionsAdapter {
  bindings?: PluginActionBindingResolver
  scope: Observable<HostScope | undefined>
  invocation: Observable<Readonly<Record<string, unknown>>>
  /** Resolve route/typed arguments/effect/capability/caller policy on every invocation. */
  validate(intent: PluginActionIntent, context: ActionContext, signal: AbortSignal): Promise<ActionResult>
  command(intent: Extract<PluginActionIntent, { type: 'command' }>, context: ActionContext, signal: AbortSignal): Promise<ActionResult>
  navigate(intent: Extract<PluginActionIntent, { type: 'navigate' }>, context: ActionContext, signal: AbortSignal): Promise<ActionResult>
  modal(intent: Extract<PluginActionIntent, { type: 'modal' }>, context: ActionContext, signal: AbortSignal): Promise<ActionResult>
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
const nonblank = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const local = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_.-]+$/u.test(v)
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
function json(value: unknown, parents = new Set<object>()): PluginJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))) return value
  if (typeof value !== 'object' || value === null || parents.has(value)) throw new Error('Invalid action data')
  parents.add(value)
  try {
    if (Array.isArray(value)) {
      if (Object.keys(value).length !== value.length || !Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index)).every(Boolean)) throw new Error('Invalid action data')
      return Object.freeze(value.map(item => json(item, parents)))
    }
    if (!object(value)) throw new Error('Invalid action data')
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, json(item, parents)])))
  } finally { parents.delete(value) }
}
function jsonObject(value: unknown): PluginJsonObject { if (!object(value)) throw new Error('Invalid action data'); return json(value) as PluginJsonObject }
export type ParsedPluginAction = { accepted: true; intent: PluginActionIntent } | { accepted: false; reason: 'unsupported-action' | 'invalid-metadata' }
/** Parsed-value checks only. Raw-token checks belong to upstream decoding. */
export function parsePluginAction(value: unknown): ParsedPluginAction {
  try {
    if (!object(value)) return { accepted: false, reason: 'invalid-metadata' }
    if (!Object.hasOwn(value, 'type') || (typeof value.type !== 'string' || !['command', 'navigate', 'modal'].includes(value.type))) return { accepted: false, reason: 'unsupported-action' }
    if (value.type === 'command' && exact(value, ['type', 'command', 'arguments']) && typeof value.command === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(value.command))
      return { accepted: true, intent: Object.freeze({ type: 'command', command: value.command, arguments: jsonObject(value.arguments) }) }
    if (value.type === 'navigate' && exact(value, ['type', 'route', 'parameters']) && nonblank(value.route))
      return { accepted: true, intent: Object.freeze({ type: 'navigate', route: value.route, parameters: jsonObject(value.parameters) }) }
    if (value.type === 'modal' && exact(value, ['type', 'region', 'entry', 'props']) && nonblank(value.region) && object(value.entry) && exact(value.entry, ['owner_id', 'local_key']) && local(value.entry.owner_id) && local(value.entry.local_key))
      return { accepted: true, intent: Object.freeze({ type: 'modal', region: value.region, entry: Object.freeze({ owner_id: value.entry.owner_id, local_key: value.entry.local_key }), props: jsonObject(value.props) }) }
  } catch { /* Never expose untrusted values or exceptions in refusal diagnostics. */ }
  return { accepted: false, reason: 'invalid-metadata' }
}
/** Stable parsed-value comparison, independent of object property insertion order. */
export function actionFingerprint(value: unknown): string {
  const sorted = (input: unknown): unknown => Array.isArray(input) ? input.map(sorted) : object(input) ? Object.fromEntries(Object.keys(input).sort().map(key => [key, sorted(input[key])])) : input
  return JSON.stringify(sorted(value))
}
