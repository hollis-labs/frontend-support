import { test } from 'node:test'
import assert from 'node:assert/strict'
import { THEME_STORAGE_KEY, DEFAULT_THEME_ID, readStoredTheme, persistTheme } from '../dist/index.js'

test('theme-only persistence writes a string id under the shared key and reads it back', () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  persistTheme('dir-b', storage)
  assert.equal(values.get(THEME_STORAGE_KEY), 'dir-b')
  assert.equal(readStoredTheme(storage), 'dir-b')
})

test('absent, unknown and theme+mode JSON values fall back rather than being mistaken for ids', () => {
  for (const value of [null, 'not-a-theme', '{"theme":"dir-b","mode":"dark"}']) {
    assert.equal(readStoredTheme({ getItem: () => value }), DEFAULT_THEME_ID)
  }
  assert.equal(readStoredTheme(null), DEFAULT_THEME_ID)
})

test('configured key and accepted ids preserve a legacy or custom consumer', () => {
  const options = { storageKey: 'sysop.theme', themes: ['p4-white', 'hi-contrast'], defaultTheme: 'p4-white' }
  const values = new Map([['unrelated', 'untouched']])
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  persistTheme('hi-contrast', storage, options)
  assert.equal(values.get('sysop.theme'), 'hi-contrast')
  assert.equal(values.get('unrelated'), 'untouched')
  assert.equal(readStoredTheme(storage, options), 'hi-contrast')
  assert.equal(readStoredTheme({ getItem: () => 'dir-a' }, options), 'p4-white')
})

test('blocked getItem/setItem and null storage do not prevent live use', () => {
  const storage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  assert.equal(readStoredTheme(storage), DEFAULT_THEME_ID)
  assert.doesNotThrow(() => persistTheme('dir-b', storage))
  assert.doesNotThrow(() => persistTheme('dir-b', null))
})

test('a throwing localStorage getter is caught before reading or writing', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked getter') } })
  try {
    assert.equal(readStoredTheme(), DEFAULT_THEME_ID)
    assert.doesNotThrow(() => persistTheme('dir-b'))
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})
