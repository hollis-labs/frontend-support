#!/usr/bin/env node
/**
 * Write the CSS the TypeScript describes — or, with --check, fail if what is
 * committed differs from what the TypeScript describes.
 *
 * The contract (§10) asks for exactly this: one source, one direction, and the
 * generated artifact committed so it stays readable in a diff and cannot drift.
 * `--check` is the half that makes the second part true.
 *
 * It runs in `test/generated-css.test.js` rather than as a new CI step, because
 * `.github/workflows/ci.yml` is a root file this session does not own — and a
 * check wired into the test suite is a check that already runs everywhere the
 * tests run, including locally, which is better than one more job anyway.
 *
 * Exit codes
 *   0  written, or (with --check) the committed CSS matches
 *   1  --check found a difference
 *   2  the generator itself could not run
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const cssDir = join(pkgRoot, 'css')

let emitAll, BUILTIN_THEMES, DEFAULT_THEME_ID
try {
  ;({ emitAll, BUILTIN_THEMES, DEFAULT_THEME_ID } = await import(join(pkgRoot, 'dist', 'index.js')))
} catch (cause) {
  console.error('generate: could not load dist/. Run `npm run build` first.')
  console.error(cause.message)
  process.exit(2)
}

const check = process.argv.includes('--check')
const files = emitAll(BUILTIN_THEMES, DEFAULT_THEME_ID)

if (!check) {
  for (const [rel, contents] of Object.entries(files)) {
    const path = join(cssDir, rel)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, contents)
  }
  console.log(`generate: wrote ${Object.keys(files).length} file(s) to css/`)
  process.exit(0)
}

const drifted = []
for (const [rel, contents] of Object.entries(files)) {
  let committed
  try {
    committed = readFileSync(join(cssDir, rel), 'utf8')
  } catch {
    drifted.push(`${rel} — missing`)
    continue
  }
  if (committed !== contents) drifted.push(`${rel} — differs`)
}

if (drifted.length === 0) {
  console.log(`generate --check: ${Object.keys(files).length} file(s) match the contract.`)
  process.exit(0)
}

console.error('generate --check FAILED. The committed CSS does not match what the')
console.error('TypeScript describes. TypeScript is the source: run `npm run generate`')
console.error('and commit the result. Do not edit css/ by hand.\n')
for (const d of drifted) console.error('  ' + d)
process.exit(1)
