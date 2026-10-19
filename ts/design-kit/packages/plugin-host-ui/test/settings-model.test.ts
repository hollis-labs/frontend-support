import { expect, it } from 'vitest'
import { evaluateSettings } from '@hollis-labs/kit-settings'
import { projectPluginSettings, projectAppIsolationSettings } from '../src/settings-model.js'
import { capabilities } from './settings-helpers.js'
it('normalizes both runtime and manifest field paths into strict scalar schemas', () => {
  const runtime = projectPluginSettings([{ key: 'enabled', type: 'bool' }, { key: 'count', type: 'int' }, { key: 'ratio', type: 'number' }, { key: 'name', type: 'string' }, { key: 'mode', type: 'select', options: [true, false] }], capabilities(['enabled', 'count', 'ratio', 'name', 'mode']))
  const manifest = projectPluginSettings({ fields: { enabled: { type: 'boolean' }, count: { type: 'integer' }, ratio: { type: 'number' }, name: { type: 'string' }, mode: { type: 'select', options: [true, false] } } }, capabilities(['enabled', 'count', 'ratio', 'name', 'mode']))
  expect(runtime.status).toBe('supported'); expect(manifest.status).toBe('supported')
  if (runtime.status !== 'supported' || manifest.status !== 'supported') return
  expect(runtime.profile.fields.map(field => field.schema.type)).toEqual(['boolean', 'integer', 'number', 'string', 'boolean'])
  expect(manifest.group.schema).toEqual(runtime.group.schema)
  expect(runtime.group.schema).toMatchObject({ type: 'object', additionalProperties: false, required: [] })
})
it('evaluates number edits as finite numbers and refuses incomplete/non-finite text', () => {
  const p = projectPluginSettings([{ key: 'ratio', type: 'number' }], capabilities(['ratio']))
  if (p.status !== 'supported') throw new Error('Projection failed')
  const values = { ratio: { present: true, editable: true, has_override: true, value: 1 } }
  expect(evaluateSettings(p.profile, values, { ratio: { kind: 'text', text: '2.5' } }).changes.set.ratio).toBe(2.5)
  for (const text of ['-', 'Infinity', '1e999']) expect(evaluateSettings(p.profile, values, { ratio: { kind: 'text', text } }).errors.length).toBeGreaterThan(0)
})
it('projects secrets as write-only presence fields without unsafe annotations', () => {
  const p = projectPluginSettings([{ key: 'token', type: 'secret', default: 'do-not-copy', examples: ['do-not-copy'], enum: ['do-not-copy'], required: true }], capabilities(['token']))
  expect(p.status).toBe('supported')
  if (p.status !== 'supported') return
  const schema = p.group.schema as { properties: Record<string, object>; required: string[] }
  expect(schema.properties.token).toEqual({ type: 'string', title: 'token', writeOnly: true })
  expect(schema.required).toEqual(['token']); expect(p.group.fields).toMatchObject({ token: { secret: true } })
  const manifest = projectPluginSettings({ secrets: { token: { required: true } } }, capabilities(['token']))
  expect(manifest.status).toBe('supported')
})
it.each([
  [{ key: 'a', type: 'object' }], [{ key: 'a', type: 'string', component: 'Custom' }], [{ key: 'a', type: 'select', options: [1, 'one'] }],
  [{ key: 'a', type: 'select', options: [Infinity] }], [{ key: 'a', type: 'select', options: ['one', 'one'] }],
  [{ key: 'a', type: 'string', properties: { nested: {} } }],
])('explicitly rejects unsupported schemas %#', input => {
  expect(projectPluginSettings([input], capabilities(['a'])).status).toBe('unsupported-schema')
})
it('requires permissions and protects host-owned isolation fields from plugin declarations', () => {
  const caps = capabilities(['isolation'])
  expect(projectPluginSettings([{ key: 'isolation', type: 'string' }], { ...caps, reserved_keys: ['isolation'] }).status).toBe('unsupported-schema')
  expect(projectPluginSettings([{ key: 'isolation', type: 'string' }], { ...caps, permissions: {} }).status).toBe('unsupported-schema')
  const host = projectAppIsolationSettings('isolation', caps)
  if (host.status !== 'supported') throw new Error('Projection failed')
  expect(host.origin).toBe('app-isolation')
  expect(host.profile.fields[0]?.schema.enum).toEqual(['sandboxed-frame', 'main-origin'])
  expect(host.profile.fields[0]?.schema).not.toHaveProperty('default')
})
