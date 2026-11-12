import { inspectSettingsGroup, type GroupProfile, type SettingsGroup, type SettingsScalar } from '@hollis-labs/kit-settings'
export interface PluginSettingsCapabilities {
  id: string
  label: string
  can_read: boolean
  can_validate: boolean
  can_update: boolean
  can_reset: boolean
  permissions: Readonly<Record<string, { editable: boolean; read_only_reason?: string; restart_required: boolean; apply_target?: string }>>
  /** Host field names that plugin declarations must never claim. */
  reserved_keys?: readonly string[]
}
export type PluginSettingsProjection = { status: 'supported'; origin: 'plugin' | 'app-isolation'; group: SettingsGroup; profile: GroupProfile }
  | { status: 'unsupported-schema'; reason: string }
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim()
const scalar = (v: unknown): v is SettingsScalar => typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v)
const unsupported = (reason: string): PluginSettingsProjection => ({ status: 'unsupported-schema', reason })
const runtimeKeys = new Set(['key', 'type', 'label', 'description', 'default', 'required', 'options', 'enum', 'component', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'examples'])
const manifestKeys = new Set([...runtimeKeys, 'env'])
/** Normalize the actual runtime list or manifest config {fields,secrets}; no guessed string fallback. */
export function projectPluginSettings(input: unknown, capabilities: PluginSettingsCapabilities): PluginSettingsProjection {
  return project(input, capabilities, 'plugin')
}
function project(input: unknown, caps: PluginSettingsCapabilities, origin: 'plugin' | 'app-isolation'): PluginSettingsProjection {
  if (!record(caps) || !text(caps.id) || !text(caps.label) || !record(caps.permissions)) return unsupported('Missing explicit group identity or field permissions.')
  const declarations: Record<string, unknown>[] = []
  if (Array.isArray(input)) {
    for (const field of input) {
      if (!record(field) || Object.keys(field).some(key => !runtimeKeys.has(key))) return unsupported('Unsupported runtime field declaration.')
      declarations.push(field)
    }
  } else if (record(input) && Object.keys(input).every(key => ['fields', 'secrets'].includes(key))) {
    for (const [key, field] of Object.entries(input.fields ?? {})) {
      if (!record(input.fields) || !record(field) || Object.keys(field).some(key => !manifestKeys.has(key))) return unsupported('Unsupported manifest field declaration.')
      declarations.push({ ...field, key })
    }
    if (input.fields !== undefined && !record(input.fields) || input.secrets !== undefined && !record(input.secrets)) return unsupported('Unsupported manifest config shape.')
    for (const [key, secret] of Object.entries(input.secrets ?? {})) {
      if (!record(secret) || Object.keys(secret).some(name => !['label', 'description', 'required', 'env'].includes(name))) return unsupported('Unsupported secret declaration.')
      declarations.push({ ...secret, key, type: 'secret' })
    }
  } else return unsupported('Expected runtime fields or manifest config fields/secrets.')
  if (declarations.length === 0) return unsupported('No supported settings fields.')
  const properties: Record<string, Record<string, unknown>> = Object.create(null)
  const fields: Record<string, Record<string, unknown>> = Object.create(null)
  const required: string[] = []
  for (const field of declarations) {
    const key = field.key
    if (!text(key) || Object.hasOwn(properties, key) || origin === 'plugin' && caps.reserved_keys?.includes(key)) return unsupported('Duplicate, reserved or missing field identity.')
    if (field.component !== undefined && field.component !== '' || field.required !== undefined && typeof field.required !== 'boolean') return unsupported('Custom components and invalid required declarations are unsupported.')
    const secret = field.type === 'secret'
    if (secret && !['string', 'secret'].includes(String(field.type))) return unsupported('Secret declarations must be strings.')
    const mapped = secret ? 'string' : ({ bool: 'boolean', boolean: 'boolean', int: 'integer', integer: 'integer', number: 'number', string: 'string', select: 'select' } as Record<string, string>)[String(field.type)]
    if (!mapped) return unsupported('Unsupported scalar field type.')
    const permission = Object.hasOwn(caps.permissions, key) ? caps.permissions[key] : undefined
    if (!permission) return unsupported('Missing explicit field permissions.')
    if (!permission.restart_required && permission.apply_target !== undefined) return unsupported('Invalid restart declaration.')
    const schema: Record<string, unknown> = { type: mapped, title: typeof field.label === 'string' && field.label ? field.label : key }
    if (field.description !== undefined) schema.description = field.description
    if (secret) schema.writeOnly = true
    else {
      for (const annotation of ['default', 'examples', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern']) if (Object.hasOwn(field, annotation)) schema[annotation] = field[annotation]
      const choices = field.enum ?? field.options
      if (mapped === 'select' || choices !== undefined) {
        if (!Array.isArray(choices) || !choices.length || choices.some(value => !scalar(value)) || new Set(choices).size !== choices.length) return unsupported('Invalid scalar enum.')
        const type = typeof choices[0]
        if (choices.some(value => typeof value !== type)) return unsupported('Mixed scalar enum types are unsupported.')
        if (mapped === 'select') schema.type = type
        schema.enum = [...choices]
      }
    }
    if (!permission.editable) schema.readOnly = true
    if (Array.isArray(schema.enum)) schema.enum = Object.freeze(schema.enum)
    if (Array.isArray(schema.examples)) schema.examples = Object.freeze([...schema.examples])
    properties[key] = Object.freeze(schema)
    fields[key] = Object.freeze({ ...permission, secret })
    if (field.required) required.push(key)
  }
  if (Object.keys(caps.permissions).some(key => !Object.hasOwn(fields, key))) return unsupported('Field permissions must match declared fields.')
  const group: SettingsGroup = { id: caps.id, label: caps.label, schema: Object.freeze({ type: 'object', additionalProperties: false, properties: Object.freeze(properties), required: Object.freeze(required) }), fields: Object.freeze(fields),
    capabilities: Object.freeze({ can_read: caps.can_read, can_validate: caps.can_validate, can_update: caps.can_update, can_reset: caps.can_reset }) }
  const profile = inspectSettingsGroup(group)
  return typeof profile === 'string' ? unsupported(profile) : Object.freeze({ status: 'supported', origin, group: Object.freeze(group), profile: Object.freeze({ ...profile, fields: Object.freeze(profile.fields.map(field => Object.freeze(field))) }) })
}
/** Separate host-owned group. Plugin projection cannot produce this origin. No default is chosen. */
export function projectAppIsolationSettings(key: string, capabilities: PluginSettingsCapabilities): PluginSettingsProjection {
  return project([{ key, label: 'App isolation mode', type: 'select', required: true, options: ['sandboxed-frame', 'main-origin'] }], capabilities, 'app-isolation')
}
