import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/** Kit-owned vocabulary, checked against the shipped stylesheet before use.
 * Metadata is data only: loading a kit does not execute its runtime module.
 * The CSS remains the theme layer; registration never permits an entire prefix.
 */
export async function loadIdiomManifest(path, vocabulary) {
  const fail = (message) => { throw new Error(`Idiom manifest ${path}: ${message}`) }
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  const { prefix, stylesheet, tokens, deprecated = {} } = manifest
  if (!/^[a-z][a-z0-9]*$/.test(prefix ?? '') || vocabulary.families.has(prefix)) {
    fail('prefix must be an idiom name distinct from base token families')
  }
  if (typeof stylesheet !== 'string' || !stylesheet || !tokens ||
      Array.isArray(tokens) || typeof tokens !== 'object' || !Object.keys(tokens).length) {
    fail('stylesheet and a nonempty token-to-binding object are required')
  }
  const css = (await readFile(resolve(dirname(path), stylesheet), 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const declarations = new Map()
  const normalize = (value) => value.trim().replace(/\s+/g, ' ')
  for (const match of css.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;{}]+);/g)) {
    if (!match[1].startsWith(`${prefix}-`)) continue
    if (declarations.has(match[1])) fail(`duplicate CSS binding for ${match[1]}`)
    declarations.set(match[1], normalize(match[2]))
  }
  for (const [name, binding] of Object.entries(tokens)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(name) || !name.startsWith(`${prefix}-`)) {
      fail(`${name} does not belong to ${prefix}-`)
    }
    if (vocabulary.colors.has(name.slice(prefix.length + 1))) {
      fail(`${name} shadows a base contract token`)
    }
    if (typeof binding !== 'string' || declarations.get(name) !== normalize(binding)) {
      fail(`CSS binding for ${name} is missing or differs from metadata`)
    }
  }
  for (const name of declarations.keys()) {
    if (!Object.hasOwn(tokens, name)) fail(`CSS token ${name} is absent from metadata`)
  }
  if (!deprecated || Array.isArray(deprecated) || typeof deprecated !== 'object') {
    fail('deprecated must be a name-to-replacement object')
  }
  for (const [name, replacement] of Object.entries(deprecated)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || !Object.hasOwn(tokens, replacement)) {
      fail(`invalid deprecation ${name} -> ${replacement}`)
    }
  }
  return { prefix, tokens: Object.keys(tokens), deprecated }
}
