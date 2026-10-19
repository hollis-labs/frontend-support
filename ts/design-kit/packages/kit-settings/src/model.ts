/** Presentation projections, not wire or transport types. Hosts adapt the approved manifest. */
export type SettingsScalar = string | number | boolean
export interface SettingsGroup {
  readonly id: string
  readonly label: string
  readonly schema: unknown
  readonly fields: unknown
  readonly capabilities: unknown
}
export interface SettingsValue {
  readonly present: boolean
  readonly value?: SettingsScalar
  readonly secret_present?: boolean
  readonly editable: boolean
  readonly has_override: boolean
  readonly read_only_reason?: string
}
export type SettingsValues = Readonly<Record<string, SettingsValue>>
/** Text is reserved for numeric editing: incomplete text is never emitted as a scalar. */
export type SettingsEdit = { readonly kind: 'value'; readonly value: SettingsScalar }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'unset' }
export type SettingsDraft = Readonly<Record<string, SettingsEdit>>
/** Intent only. The host supplies revisions, ETags and backend revalidation. */
export interface SettingsChanges {
  readonly set: Readonly<Record<string, SettingsScalar>>
  readonly unset: readonly string[]
}
export interface SettingsError { readonly path: string; readonly code: string; readonly message: string }
export interface SettingsValidation { readonly valid: boolean; readonly errors: readonly SettingsError[] }
export interface SettingsState {
  readonly values: SettingsValues
  readonly draft: SettingsDraft
  readonly busy?: boolean
  readonly validation?: SettingsValidation
  readonly error?: string
  readonly notice?: string
}
export interface FieldSchema {
  readonly type: 'string' | 'number' | 'integer' | 'boolean'
  readonly title?: string
  readonly description?: string
  readonly enum?: readonly SettingsScalar[]
  readonly minimum?: number
  readonly maximum?: number
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
}
export interface Field {
  readonly key: string
  readonly schema: FieldSchema
  readonly required: boolean
  readonly editable: boolean
  readonly secret: boolean
  readonly reason?: string
}
export interface GroupProfile {
  readonly fields: readonly Field[]
  readonly canRead: boolean
  readonly canUpdate: boolean
  readonly canValidate: boolean
  readonly canReset: boolean
}
const own = (o: object, key: string) => Object.hasOwn(o, key)
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const scalar = (v: unknown, type: FieldSchema['type']): v is SettingsScalar => type === 'integer'
  ? typeof v === 'number' && Number.isSafeInteger(v)
  : type === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof v === type
const supported = new Set(['type', 'title', 'description', 'default', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'readOnly', 'writeOnly', 'format', 'examples', '$comment'])

/** Fail closed for unsupported assertions or contradictory field declarations. */
export function inspectSettingsGroup(group: SettingsGroup): GroupProfile | string {
  const { schema, fields, capabilities: caps } = group
  if (!record(schema) || schema.type !== 'object' || schema.additionalProperties !== false || !record(schema.properties) || !record(fields) || !record(caps)) return 'Unsupported settings group: expected a flat object schema and explicit field capabilities.'
  if (Object.keys(schema).some(k => !['$schema', '$id', '$comment', 'type', 'title', 'description', 'properties', 'additionalProperties', 'required'].includes(k))) return 'Unsupported settings schema assertion.'
  const required = schema.required ?? []
  if (!Array.isArray(required) || required.some(k => typeof k !== 'string' || !own(schema.properties as object, k)) || new Set(required).size !== required.length) return 'Invalid required field list.'
  const keys = Object.keys(schema.properties)
  if (Object.keys(fields).length !== keys.length || keys.some(k => !own(fields, k))) return 'Field declarations must match schema properties.'
  if (['can_read', 'can_validate', 'can_update', 'can_reset'].some(k => typeof caps[k] !== 'boolean')) return 'Missing explicit settings capabilities.'
  if ((caps.can_update || caps.can_reset) && (!caps.can_read || !caps.can_validate)) return 'Writable groups require read and validation capabilities.'
  const result: Field[] = []
  for (const key of keys) {
    const s = schema.properties[key], f = fields[key]
    if (!record(s) || !record(f) || !['string', 'boolean', 'integer', 'number'].includes(String(s.type)) || Object.keys(s).some(k => !supported.has(k))) return 'Unsupported field schema: only flat scalars and enums are available.'
    if (typeof f.editable !== 'boolean' || typeof f.secret !== 'boolean' || typeof f.restart_required !== 'boolean' || (f.restart_required && !nonempty(f.apply_target))) return 'Invalid field declaration.'
    if ((!f.editable && (s.readOnly !== true || !nonempty(f.read_only_reason))) || (f.editable && s.readOnly === true) || (s.readOnly !== undefined && typeof s.readOnly !== 'boolean') || (s.writeOnly !== undefined && typeof s.writeOnly !== 'boolean')) return 'Conflicting field editability declaration.'
    if (f.secret ? s.type !== 'string' || s.writeOnly !== true || ['default', 'examples', 'enum'].some(k => own(s, k)) : s.writeOnly === true) return 'Invalid secret field declaration.'
    for (const annotation of ['title', 'description', 'format', '$comment']) if (own(s, annotation) && typeof s[annotation] !== 'string') return 'Invalid field annotation.'
    const type = s.type as FieldSchema['type']
    if (own(s, 'enum') && (!Array.isArray(s.enum) || s.enum.length === 0 || s.enum.some(v => !scalar(v, type)) || new Set(s.enum).size !== s.enum.length)) return 'Invalid scalar enum.'
    for (const limit of ['minimum', 'maximum']) if (own(s, limit) && (!['integer', 'number'].includes(type) || typeof s[limit] !== 'number' || !Number.isFinite(s[limit]))) return 'Invalid numeric constraint.'
    for (const limit of ['minLength', 'maxLength']) if (own(s, limit) && (type !== 'string' || !Number.isSafeInteger(s[limit]) || (s[limit] as number) < 0)) return 'Invalid string constraint.'
    if (own(s, 'pattern')) {
      if (type !== 'string' || typeof s.pattern !== 'string') return 'Invalid string pattern.'
      try { new RegExp(s.pattern, 'u') } catch { return 'Unsupported string pattern.' }
    }
    if ((typeof s.minimum === 'number' && typeof s.maximum === 'number' && s.minimum > s.maximum) || (typeof s.minLength === 'number' && typeof s.maxLength === 'number' && s.minLength > s.maxLength)) return 'Contradictory field constraints.'
    result.push({ key, schema: s as unknown as FieldSchema, required: required.includes(key), editable: f.editable, secret: f.secret, reason: typeof f.read_only_reason === 'string' ? f.read_only_reason : undefined })
  }
  if (!result.some(f => f.editable) && (caps.can_update || caps.can_reset)) return 'Read-only groups cannot advertise mutations.'
  return { fields: result, canRead: caps.can_read as boolean, canUpdate: caps.can_update as boolean, canValidate: caps.can_validate as boolean, canReset: caps.can_reset as boolean }
}
export const settingsPath = (key: string) => '/' + key.replaceAll('~', '~0').replaceAll('/', '~1')
export function snapshotProblem(profile: GroupProfile, values: SettingsValues): string | undefined {
  for (const f of profile.fields) {
    const v = values[f.key]
    if (!v || typeof v.present !== 'boolean' || typeof v.editable !== 'boolean' || typeof v.has_override !== 'boolean' || (!f.editable && v.editable) || (!v.editable && !nonempty(v.read_only_reason))) return 'Settings snapshot has missing or conflicting permissions.'
    if (f.secret ? own(v, 'value') || v.secret_present !== v.present : (own(v, 'secret_present') || (v.present ? !own(v, 'value') || !scalar(v.value, f.schema.type) : own(v, 'value')))) return 'Settings snapshot does not match the field schema.'
  }
}
export function evaluateSettings(profile: GroupProfile, values: SettingsValues, draft: SettingsDraft): { changes: SettingsChanges; dirty: boolean; errors: readonly SettingsError[] } {
  const errors: SettingsError[] = []
  const set: Record<string, SettingsScalar> = Object.create(null)
  const unset: string[] = []
  const add = (key: string, message: string) => errors.push({ path: settingsPath(key), code: 'local', message })
  for (const key of Object.keys(draft)) if (!profile.fields.some(f => f.key === key)) add(key, 'Unknown settings field.')
  for (const f of profile.fields) {
    const v = values[f.key], edit = own(draft, f.key) ? draft[f.key] : undefined
    if (!v) { add(f.key, 'Missing settings snapshot.'); continue }
    if (edit && (!f.editable || !v.editable || (edit.kind === 'unset' ? !profile.canReset : !profile.canUpdate))) { add(f.key, 'This field cannot be changed.'); continue }
    if (edit?.kind === 'unset') {
      if (!profile.canReset || !v.has_override) add(f.key, 'This override cannot be removed.')
      else unset.push(f.key)
      // The fallback is backend-owned. Required/constraint validation needs its resolved value.
      continue
    }
    let value: unknown = edit?.kind === 'value' ? edit.value : f.secret ? undefined : v.value
    if (edit?.kind === 'text') {
      if (!['integer', 'number'].includes(f.schema.type) || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(edit.text)) { add(f.key, 'Enter a complete number.'); continue }
      value = Number(edit.text)
    }
    const present = !!edit || v.present
    if (!present) { if (f.required) add(f.key, 'A value is required.'); continue }
    if (f.secret && !edit) continue // Existing secrets are never reconstructed or inspected.
    if (!scalar(value, f.schema.type)) { add(f.key, `Enter a valid ${f.schema.type}.`); continue }
    const s = f.schema
    if (s.enum && !s.enum.includes(value)) add(f.key, 'Choose a listed value.')
    if (typeof value === 'number' && ((s.minimum !== undefined && value < s.minimum) || (s.maximum !== undefined && value > s.maximum))) add(f.key, 'Number is outside the allowed range.')
    if (typeof value === 'string') {
      const length = [...value].length
      if ((s.minLength !== undefined && length < s.minLength) || (s.maxLength !== undefined && length > s.maxLength)) add(f.key, 'Text length is outside the allowed range.')
      if (s.pattern && !new RegExp(s.pattern, 'u').test(value)) add(f.key, 'Text does not match the required pattern.')
    }
    if (edit && (f.secret || !v.present || value !== v.value)) set[f.key] = value
  }
  return { changes: { set, unset }, dirty: Object.keys(set).length > 0 || unset.length > 0 || (errors.length > 0 && Object.keys(draft).length > 0), errors }
}
