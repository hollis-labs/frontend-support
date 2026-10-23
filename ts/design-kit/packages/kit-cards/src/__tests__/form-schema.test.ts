import { describe, expect, it } from 'vitest'
import { coerceValue, compileFormSchema, validateForm } from '../form/schema'

describe('compileFormSchema', () => {
  it('maps the supported subset to field kinds', () => {
    const { fields, issues } = compileFormSchema({
      type: 'object',
      required: ['a'],
      properties: {
        a: { type: 'string' },
        b: { type: 'integer', minimum: 1 },
        c: { type: 'number' },
        d: { type: 'boolean' },
        e: { type: 'string', enum: ['x', 'y'] },
        f: { type: 'array', items: { type: 'string', enum: ['p', 'q'] } },
        g: { type: 'string', format: 'date' },
        h: { type: 'string', format: 'textarea' },
        i: { type: 'string', format: 'secret' },
        j: { type: 'string', writeOnly: true },
      },
    })
    expect(issues).toEqual([])
    expect(fields.map((f) => f.kind)).toEqual(['text', 'integer', 'number', 'boolean', 'enum', 'multi', 'date', 'textarea', 'secret', 'secret'])
    expect(fields[0].required).toBe(true)
    expect(fields.filter((f) => f.sensitive).map((f) => f.key)).toEqual(['i', 'j'])
  })

  it('degrades an unsupported keyword to a VISIBLE fallback, naming it', () => {
    const { fields } = compileFormSchema({
      type: 'object',
      properties: { z: { oneOf: [{ type: 'string' }, { type: 'number' }] }, r: { $ref: '#/defs/r' } },
    })
    expect(fields.map((f) => f.kind)).toEqual(['fallback', 'fallback'])
    expect(fields[0].unsupported).toEqual(['oneOf'])
    expect(fields[1].unsupported).toEqual(['$ref'])
  })

  it('degrades unsupported types, formats and nested objects instead of dropping them', () => {
    const { fields } = compileFormSchema({
      type: 'object',
      properties: { n: { type: 'object' }, f: { type: 'string', format: 'email' }, a: { type: 'array', items: { type: 'object' } } },
    })
    expect(fields.map((f) => f.kind)).toEqual(['fallback', 'fallback', 'fallback'])
  })

  it('reports a non-object or malformed schema as an issue and no fields', () => {
    expect(compileFormSchema({ type: 'string' }).issues).toHaveLength(1)
    expect(compileFormSchema(null).fields).toEqual([])
    const bad = compileFormSchema({ type: 'object', required: ['ghost'], properties: {}, oneOf: [] })
    expect(bad.issues.length).toBe(2)
  })
})

describe('validateForm', () => {
  const { fields } = compileFormSchema({
    type: 'object',
    required: ['name', 'n'],
    properties: {
      name: { type: 'string', title: 'Name', minLength: 2, pattern: '^[a-z]+$' },
      n: { type: 'integer', title: 'Count', minimum: 1, maximum: 5 },
      region: { type: 'string', title: 'Region', enum: ['a', 'b'] },
      ok: { type: 'boolean' },
    },
  })

  it('requires required fields but never a boolean', () => {
    expect(Object.keys(validateForm(fields, {}))).toEqual(['name', 'n'])
  })
  it('checks length, pattern, range, integer-ness and enum membership', () => {
    const e = validateForm(fields, { name: 'A', n: 9, region: 'c' })
    expect(e.name).toMatch(/at least 2/)
    expect(e.n).toMatch(/at most 5/)
    expect(e.region).toMatch(/one of/)
    expect(validateForm(fields, { name: 'ab', n: 2.5 }).n).toMatch(/whole number/)
    expect(validateForm(fields, { name: 'ab1', n: 2 }).name).toMatch(/format/)
    expect(validateForm(fields, { name: 'ab', n: 2, region: 'a' })).toEqual({})
  })
})

describe('coerceValue', () => {
  it('coerces numbers, parses fallback JSON, and treats empty as absent', () => {
    const { fields } = compileFormSchema({ type: 'object', properties: { n: { type: 'integer' }, z: { oneOf: [] }, s: { type: 'string' } } })
    expect(coerceValue(fields[0], '4')).toBe(4)
    expect(coerceValue(fields[1], '{"a":1}')).toEqual({ a: 1 })
    expect(coerceValue(fields[1], 'plain text')).toBe('plain text')
    expect(coerceValue(fields[2], '')).toBeUndefined()
  })
})
