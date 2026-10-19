// Feature control only. Mutate the real aggregate, prove the ordinary browser
// check exits 1, record both widths, then restore and check the correct component.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const source = fileURLToPath(new URL('../src/components/health-summary.tsx', import.meta.url))
const proof = fileURLToPath(new URL('./observe-browser.mjs', import.meta.url))
const original = readFileSync(source, 'utf8')
const wrong = original.replace('const aggregate = safeStatus(status)', "const aggregate = status === 'unknown' ? 'healthy' : safeStatus(status)")
if (wrong === original) throw Error('Mutation did not apply')
try {
  writeFileSync(source, wrong)
  const result = spawnSync(process.execPath, [proof], { env: { ...process.env, NEGATIVE_EXPECTED: '' }, encoding: 'utf8' })
  if (result.status !== 1 || !result.stderr.includes('Unknown health must never render healthy')) {
    throw Error(`Negative control failed to trigger the expected assertion: ${result.status}\n${result.stderr}`)
  }
  console.log('Ordinary proof rejects the false-healthy mutation with exit 1.')
  execFileSync(process.execPath, [proof], { env: { ...process.env, NEGATIVE_EXPECTED: 'unknown' }, stdio: 'inherit' })
} finally { writeFileSync(source, original) }
execFileSync(process.execPath, [proof], { env: { ...process.env, NEGATIVE_EXPECTED: '' }, stdio: 'inherit' })
