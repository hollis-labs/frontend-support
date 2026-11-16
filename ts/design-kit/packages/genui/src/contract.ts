import * as validators from './validators.js'
import schema from '../contract/schema/contract.schema.json'
import { ContractError, decodeJSON, freeze } from './decode'
import type { Call, Envelope, FormField, Input, JSONValue, Outcome, ReceiverResponse } from './generated'

export const SURFACE_KIND = schema.$defs.Envelope.properties.type.const
export const SURFACE_VERSION = schema.$defs.Envelope.properties.typeVersion.const
export const CATALOG_ID = schema.$defs.CreateSurface.properties.catalogId.const
export const MAX_SURFACE_BYTES = 256 * 1024
export const MAX_ACTION_BYTES = 64 * 1024
export function validates(name: keyof typeof schema.$defs, value: unknown): boolean { return validators[name](value) }
function assertSchema(name: keyof typeof schema.$defs, value: unknown): void {
  if (!validates(name, value)) throw new ContractError()
}
export function isRecord(value: unknown): value is Record<string, JSONValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Form state is draft data. These checks never authorize the eventual operation. */
export function draftErrors(fields: readonly FormField[], draft: Input): Readonly<Record<string, string>> {
  const errors: Record<string, string> = Object.create(null) as Record<string, string>
  const known = new Set(fields.map(field => field.key))
  for (const key of Object.keys(draft)) if (!known.has(key)) errors[key] = 'This field is not editable.'
  for (const field of fields) {
    const v = Object.hasOwn(draft, field.key) ? draft[field.key] : undefined
    if (v === undefined) { if (field.required) errors[field.key] = 'A value is required.'; continue }
    if (field.type === 'checkbox') {
      if (typeof v !== 'boolean') errors[field.key] = 'Choose yes or no.'
    } else if (field.type === 'integer') {
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || Object.is(v, -0)) errors[field.key] = 'Enter a whole number.'
      else if (field.min !== undefined && v < field.min) errors[field.key] = `Use a value of at least ${field.min}.`
      else if (field.max !== undefined && v > field.max) errors[field.key] = `Use a value no greater than ${field.max}.`
    } else if (typeof v !== 'string') errors[field.key] = 'Enter text.'
    else if (field.required && v === '') errors[field.key] = 'A value is required.'
    else if (Array.from(v).length > (field.maxLength ?? 16384)) errors[field.key] = 'The text is too long.'
  }
  return errors
}

export function parseEnvelope(raw: string | Uint8Array): Envelope {
  const value = decodeJSON(raw, MAX_SURFACE_BYTES)
  assertSchema('Envelope', value)
  const envelope = value as Envelope
  const surface = envelope.data.createSurface
  if (envelope.id !== surface.surfaceId) throw new ContractError()
  const root = surface.components[0]
  if (root.component !== 'GenuiForm' && surface.dataModel.draft !== undefined) throw new ContractError()
  const names = { GenuiApproval: 'approval', GenuiForm: 'form', GenuiListDetail: 'list_detail' }
  if (surface.metadata.extensions.genui_pattern.id !== names[root.component]) throw new ContractError()
  if (root.component === 'GenuiForm') {
    const keys = root.props.fields.map(field => field.key)
    if (new Set(keys).size !== keys.length) throw new ContractError()
    for (const field of root.props.fields) {
      if (field.type !== 'integer' && (field.min !== undefined || field.max !== undefined)) throw new ContractError()
      if (field.type !== 'text' && field.type !== 'textarea' && field.maxLength !== undefined) throw new ContractError()
      if (field.min !== undefined && field.max !== undefined && field.min > field.max) throw new ContractError()
    }
    if (Object.hasOwn(root.props.submit.callFunction.args.input, 'draft')) throw new ContractError()
    const draft = surface.dataModel.draft ?? {}
    const fields = root.props.fields.map(field => ({ ...field, required: false }))
    if (Object.keys(draftErrors(fields, draft)).length) throw new ContractError()
  } else if (root.component === 'GenuiListDetail') {
    const ids = root.props.items.map(item => item.id)
    if (new Set(ids).size !== ids.length || (root.props.selectedId !== undefined && !ids.includes(root.props.selectedId)) || (root.props.detail !== undefined && root.props.selectedId === undefined)) throw new ContractError()
  }
  const choices = root.component === 'GenuiApproval' ? root.props.choices : root.component === 'GenuiForm' ? [root.props.submit] : []
  for (const choice of choices) if (choice.callFunction.args.genui_action.confirmation !== undefined) throw new ContractError()
  return freeze(envelope)
}

export function parseCall(raw: string | Uint8Array): Call {
  const value = decodeJSON(raw, MAX_ACTION_BYTES)
  assertSchema('Call', value)
  return freeze(value as Call)
}

export function parseOutcome(raw: string | Uint8Array): Outcome {
  const value = decodeJSON(raw, MAX_ACTION_BYTES)
  assertSchema('Outcome', value)
  let current = value as Outcome
  let depth = 0
  while (current.status === 'conflict') { if (++depth > 2) throw new ContractError(); current = current.recorded }
  return freeze(value as Outcome)
}

export function isTerminal(outcome: Outcome): boolean {
  return !['accepted', 'needs_confirmation', 'stale'].includes(outcome.status)
}

export function serializeCall(call: Call): string {
  assertSerializable(call)
  // Validate before serialization so unsupported values cannot silently normalize.
  const raw = JSON.stringify(call)
  parseCall(raw)
  return raw
}

/** Reject JavaScript-only values rather than normalizing them with JSON.stringify. */
export function assertSerializable(value: unknown, depth = 0): void {
  if (depth > 32) throw new ContractError()
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new ContractError()
    return
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) throw new ContractError()
    for (let i = 0; i < value.length; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(i))
      if (!descriptor?.enumerable || !('value' in descriptor)) throw new ContractError()
      assertSerializable(descriptor.value, depth + 1)
    }
    return
  }
  if (typeof value !== 'object' || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new ContractError()
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new ContractError()
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new ContractError()
    assertSerializable(descriptor.value, depth + 1)
  }
}

export type ResponseObservation =
  | { kind: 'known'; functionCallId: string; outcome: Outcome; terminal: boolean }
  | { kind: 'unknown'; functionCallId: string; status: string }
  | { kind: 'protocol_error'; functionCallId: string }

/** Unknown future statuses are preserved as unresolved, never mapped to success/failure. */
export function parseResponse(raw: string | Uint8Array, expectedFunctionCallId?: string): ResponseObservation {
  const value = decodeJSON(raw, MAX_ACTION_BYTES)
  assertSchema('ReceiverResponse', value)
  const response = (value as ReceiverResponse).agentFunctionResponse
  if (expectedFunctionCallId !== undefined && response.functionCallId !== expectedFunctionCallId) throw new ContractError()
  if ('error' in response) return freeze({ kind: 'protocol_error', functionCallId: response.functionCallId })
  if (!validates('Outcome', response.value)) return freeze({ kind: 'unknown', functionCallId: response.functionCallId, status: response.value.status })
  const outcome = parseOutcome(JSON.stringify(response.value))
  return freeze({ kind: 'known', functionCallId: response.functionCallId, outcome, terminal: isTerminal(outcome) })
}

/** Decode the host's read-only recovery wrapper before ordinary JSON parsing can lose evidence. */
export function parseRecovery(raw: string | Uint8Array, expectedFunctionCallId?: string): { response: string; request?: string } {
  // Two bounded native messages plus the fixed wrapper. Its sole extra nesting
  // level is removed before each native parser enforces the canonical depth.
  const value = decodeJSON(raw, MAX_ACTION_BYTES * 2 + 256, 33)
  if (!isRecord(value) || !Object.hasOwn(value, 'response') || Object.keys(value).some(key => key !== 'response' && key !== 'request')) throw new ContractError()
  const response = JSON.stringify(value.response)
  const observation = parseResponse(response, expectedFunctionCallId)
  if (!Object.hasOwn(value, 'request')) return freeze({ response })
  const request = JSON.stringify(value.request)
  const call = parseCall(request)
  if (call.callAgentFunction.functionCallId !== observation.functionCallId || call.callAgentFunction.callFunction.args.genui_action.confirmation !== undefined) throw new ContractError()
  return freeze({ response, request })
}
