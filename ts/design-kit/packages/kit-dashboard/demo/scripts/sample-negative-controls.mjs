// Local feature proof: temporarily mutate the implementation, run each expected
// failing geometry assertion, then restore and verify the correct implementation.
// Requires the Vite demo server and the browser environment used by sample-proof.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const source = fileURLToPath(new URL('../../src/components/widgets/timestamp-sample-chart.tsx', import.meta.url))
const proof = fileURLToPath(new URL('./sample-proof.mjs', import.meta.url))
const original = readFileSync(source, 'utf8')
const controls = {
  gap: original.replace('connectNulls={false}', 'connectNulls={true}'),
  zero: original.replace('const data = points.map', 'const data = points.filter(point => point.value !== 0).map'),
  gauge: original.replace('...point, timestamp:', '...point, value: point.value === null ? null : points.reduce((sum, sample) => sum + (sample.value ?? 0), 0), timestamp:'),
}
try {
  for (const [name, changed] of Object.entries(controls)) {
    if (changed === original) throw Error(`Mutation did not apply: ${name}`)
    writeFileSync(source, changed)
    execFileSync(process.execPath, [proof], { env: { ...process.env, NEGATIVE_EXPECTED: name, PROOF_BASELINE: '0' }, stdio: 'inherit' })
  }
} finally {
  writeFileSync(source, original)
}
execFileSync(process.execPath, [proof], { env: { ...process.env, NEGATIVE_EXPECTED: '', PROOF_BASELINE: '0' }, stdio: 'inherit' })
