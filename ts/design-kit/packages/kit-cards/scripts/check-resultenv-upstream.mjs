import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = new URL('../', import.meta.url)
const provenance = JSON.parse(readFileSync(new URL('fixtures/shared-resultenv/provenance.json', root), 'utf8'))
const paths = [
  ['schema_sha256', 'resultenv.schema.json', 'agent/resultenv/schema/resultenv.schema.json'],
  ['fixtures_sha256', 'fixtures.json', 'agent/resultenv/testdata/fixtures.json'],
]
const sdkRootArg = process.argv.indexOf('--sdk-root')
if (sdkRootArg !== -1 && !process.argv[sdkRootArg + 1]) throw new Error('--sdk-root requires a libs checkout path')
const sdkRoot = sdkRootArg === -1 ? undefined : resolve(process.argv[sdkRootArg + 1])
if (sdkRoot) {
  const head = execFileSync('git', ['-C', sdkRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (head !== provenance.commit) throw new Error(`SDK head ${head} differs from snapshot source ${provenance.commit}`)
}
for (const [key, localName, upstreamPath] of paths) {
  const local = readFileSync(new URL(`fixtures/shared-resultenv/${localName}`, root))
  const digest = createHash('sha256').update(local).digest('hex')
  if (digest !== provenance[key]) throw new Error(`${localName} differs from pinned SDK source; refresh provenance and review adapter`)
  if (sdkRoot) {
    const upstream = readFileSync(resolve(sdkRoot, upstreamPath))
    if (!local.equals(upstream)) throw new Error(`${localName} differs from SDK head ${provenance.commit}`)
  }
}
