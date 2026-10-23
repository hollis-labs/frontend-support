/**
 * The JSON-Schema SUBSET a form card understands, and the compile step that reads it.
 *
 * REUSE CHECK. `kit-settings` already has a schema reader (`inspectSettingsGroup`),
 * but it is private to that package, flat-only, and fused to a stored-model
 * dirty/save engine; a form card is one-shot and ephemeral. Wrapping it would couple
 * two lifecycles. So this is its own small layer, deliberately shaped like the
 * settings one (same keyword vocabulary, `writeOnly` for secrets) so a later
 * downward extraction into a shared package is mechanical. That extraction is a
 * recorded follow-up, not done here.
 *
 * SUPPORTED: an object schema with `properties` / `required`; per property `type`
 * (string | number | integer | boolean | array-of-enum), `title`, `description`,
 * `default`, `enum`, `minimum`, `maximum`, `minLength`, `maxLength`, `pattern`,
 * `format` (`date`, `textarea`, `secret`), `writeOnly`, `readOnly`, `items.enum`.
 *
 * NOT SUPPORTED: `$ref`, `oneOf`/`anyOf`/`allOf`, `if`/`then`, nested objects,
 * `additionalProperties` schemas, anything else. A property with an unsupported
 * keyword is NEVER silently dropped or half-rendered: it compiles to a `fallback`
 * field — a visible text box taking raw JSON — carrying the keyword names so the
 * card can say what it could not honour.
 *
 * SECRET is reserved: `format: 'secret'` or `writeOnly: true` on a string. The card
 * masks it, never echoes it, and delivers it to the host by reference only.
 */

export type FormFieldKind = 'text' | 'textarea' | 'number' | 'integer' | 'boolean' | 'enum' | 'multi' | 'date' | 'secret' | 'fallback'

export interface FormField {
  readonly key: string
  readonly kind: FormFieldKind
  readonly title: string
  readonly description?: string
  readonly required: boolean
  readonly readOnly: boolean
  /** Sensitive fields are redacted from receipts and logs. Secrets always are. */
  readonly sensitive: boolean
  readonly options?: readonly (string | number)[]
  readonly default?: unknown
  readonly minimum?: number
  readonly maximum?: number
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
  /** Keywords present on the property that this subset does not honour. */
  readonly unsupported: readonly string[]
}

export interface CompiledForm {
  readonly fields: readonly FormField[]
  /** Schema-level problems. Non-empty means the form must not be submittable. */
  readonly issues: readonly string[]
}

const KNOWN = new Set([
  'type', 'title', 'description', 'default', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength',
  'pattern', 'format', 'writeOnly', 'readOnly', 'items', 'examples', '$comment',
])
const TOP_KNOWN = new Set(['$schema', '$id', '$comment', 'type', 'title', 'description', 'properties', 'required', 'additionalProperties'])

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isScalarList = (v: unknown): v is (string | number)[] =>
  Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' || typeof x === 'number')

function compileProperty(key: string, raw: unknown, required: boolean): FormField {
  const base = { key, required, readOnly: false, sensitive: false, unsupported: [] as string[] }
  if (!isRecord(raw)) {
    return { ...base, kind: 'fallback', title: key, unsupported: ['schema'] }
  }
  const unsupported = Object.keys(raw).filter((k) => !KNOWN.has(k))
  const title = typeof raw.title === 'string' && raw.title ? raw.title : key
  const common = {
    key,
    title,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    required,
    readOnly: raw.readOnly === true,
    sensitive: raw.writeOnly === true || raw.format === 'secret',
    default: raw.default,
    minimum: typeof raw.minimum === 'number' ? raw.minimum : undefined,
    maximum: typeof raw.maximum === 'number' ? raw.maximum : undefined,
    minLength: typeof raw.minLength === 'number' ? raw.minLength : undefined,
    maxLength: typeof raw.maxLength === 'number' ? raw.maxLength : undefined,
    pattern: typeof raw.pattern === 'string' ? raw.pattern : undefined,
    unsupported,
  }
  const fallback = (extra: string[] = []): FormField => ({ ...common, kind: 'fallback', unsupported: [...unsupported, ...extra] })
  if (unsupported.length > 0) return fallback()

  switch (raw.type) {
    case 'string': {
      if (raw.enum !== undefined) {
        return isScalarList(raw.enum) ? { ...common, kind: 'enum', options: raw.enum } : fallback(['enum'])
      }
      if (raw.format === 'secret' || raw.writeOnly === true) return { ...common, kind: 'secret', sensitive: true }
      if (raw.format === 'date') return { ...common, kind: 'date' }
      if (raw.format === 'textarea') return { ...common, kind: 'textarea' }
      if (raw.format !== undefined) return fallback([`format:${String(raw.format)}`])
      return { ...common, kind: 'text' }
    }
    case 'number':
    case 'integer':
      if (raw.enum !== undefined) return isScalarList(raw.enum) ? { ...common, kind: 'enum', options: raw.enum } : fallback(['enum'])
      return { ...common, kind: raw.type }
    case 'boolean':
      return { ...common, kind: 'boolean' }
    case 'array': {
      const items = raw.items
      if (isRecord(items) && isScalarList(items.enum) && Object.keys(items).every((k) => k === 'type' || k === 'enum')) {
        return { ...common, kind: 'multi', options: items.enum }
      }
      return fallback(['items'])
    }
    default:
      return fallback(['type'])
  }
}

export function compileFormSchema(schema: unknown): CompiledForm {
  if (!isRecord(schema) || schema.type !== 'object' || !isRecord(schema.properties)) {
    return { fields: [], issues: ['Unsupported form schema: expected an object schema with properties.'] }
  }
  const issues: string[] = []
  const extra = Object.keys(schema).filter((k) => !TOP_KNOWN.has(k))
  if (extra.length) issues.push(`Unsupported schema keyword(s) at the top level: ${extra.join(', ')}.`)
  const requiredList = Array.isArray(schema.required) ? schema.required.filter((k): k is string => typeof k === 'string') : []
  const keys = Object.keys(schema.properties)
  for (const r of requiredList) if (!keys.includes(r)) issues.push(`Required field "${r}" has no property.`)
  return {
    fields: keys.map((key) => compileProperty(key, (schema.properties as Record<string, unknown>)[key], requiredList.includes(key))),
    issues,
  }
}

export type FormValues = Readonly<Record<string, unknown>>
export type FormErrors = Readonly<Record<string, string>>

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

/** Validate a field's current value. Returns an error sentence or null. */
export function validateField(field: FormField, value: unknown): string | null {
  if (field.kind === 'boolean') return null
  if (isEmpty(value)) return field.required ? `${field.title} is required.` : null
  switch (field.kind) {
    case 'text':
    case 'textarea':
    case 'secret':
    case 'date': {
      const s = String(value)
      if (field.minLength != null && s.length < field.minLength) return `${field.title} must be at least ${field.minLength} characters.`
      if (field.maxLength != null && s.length > field.maxLength) return `${field.title} must be at most ${field.maxLength} characters.`
      if (field.pattern) {
        try {
          if (!new RegExp(field.pattern).test(s)) return `${field.title} is not in the expected format.`
        } catch {
          return `${field.title} has a pattern this form cannot check.`
        }
      }
      if (field.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${field.title} must be a date (YYYY-MM-DD).`
      return null
    }
    case 'number':
    case 'integer': {
      const n = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(n)) return `${field.title} must be a number.`
      if (field.kind === 'integer' && !Number.isInteger(n)) return `${field.title} must be a whole number.`
      if (field.minimum != null && n < field.minimum) return `${field.title} must be at least ${field.minimum}.`
      if (field.maximum != null && n > field.maximum) return `${field.title} must be at most ${field.maximum}.`
      return null
    }
    case 'enum':
      return field.options?.some((o) => String(o) === String(value)) ? null : `${field.title} must be one of the listed options.`
    case 'multi':
      return Array.isArray(value) && value.every((v) => field.options?.some((o) => String(o) === String(v))) ? null : `${field.title} has an option that is not listed.`
    case 'fallback':
      if (typeof value !== 'string') return null
      try {
        JSON.parse(value)
        return null
      } catch {
        return null // plain text is an accepted fallback answer
      }
  }
}

export function validateForm(fields: readonly FormField[], values: FormValues): FormErrors {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    if (f.readOnly) continue
    const e = validateField(f, values[f.key])
    if (e) errors[f.key] = e
  }
  return errors
}

/** Coerce raw control values into the typed answer. Fallback fields parse as JSON when they can. */
export function coerceValue(field: FormField, value: unknown): unknown {
  if (isEmpty(value) && field.kind !== 'boolean') return undefined
  switch (field.kind) {
    case 'number':
    case 'integer':
      return typeof value === 'number' ? value : Number(value)
    case 'boolean':
      return value === true
    case 'fallback':
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      return value
    default:
      return value
  }
}
