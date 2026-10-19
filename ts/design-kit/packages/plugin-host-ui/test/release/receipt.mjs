import {createHash} from 'node:crypto'
import {readFile, readdir, mkdir, writeFile, mkdtemp, rm} from 'node:fs/promises'
import {join, resolve} from 'node:path'
import {execFileSync} from 'node:child_process'
const [archiveArg, outputArg, ...rootArgs] = process.argv.slice(2)
if (!archiveArg || !outputArg || !rootArgs.length) throw new Error('Usage: receipt.mjs ARCHIVE OUTPUT CONSUMER_ROOT...')
const archive = resolve(archiveArg), scratch = await mkdtemp(join(process.env.TMPDIR, 'candidate-receipt-'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
async function inventory(root, prefix = '') {
  const result = {}
  for (const entry of await readdir(join(root, prefix), {withFileTypes: true})) {
    const path = join(prefix, entry.name)
    if (entry.isDirectory()) Object.assign(result, await inventory(root, path))
    else if (entry.isFile()) result[path] = sha(await readFile(join(root, path)))
  }
  return result
}
try {
  execFileSync('tar', ['-xzf', archive, '-C', scratch])
  const expected = await inventory(join(scratch, 'package'))
  const consumers = []
  for (const arg of rootArgs) {
    const root = resolve(arg), actual = await inventory(join(root, 'node_modules/@hollis-labs/plugin-host-ui'))
    const mismatches = Object.keys(expected).filter(path => expected[path] !== actual[path])
    const extra = Object.keys(actual).filter(path => !Object.hasOwn(expected, path))
    const packages = {}
    for (const name of ['@hollis-labs/plugin-host-ui', '@hollis-labs/design-components', '@hollis-labs/design-tokens', '@hollis-labs/plugin-registry', '@hollis-labs/kit-settings', 'react', 'react-dom', 'vite']) {
      const bytes = await readFile(join(root, 'node_modules', name, 'package.json'))
      packages[name] = {version: JSON.parse(bytes).version, manifestSha256: sha(bytes)}
    }
    consumers.push({root, packages, candidateFiles: actual, mismatches, extra, exactCandidateBytes: !mismatches.length && !extra.length})
  }
  await mkdir(resolve(outputArg, '..'), {recursive:true})
  await writeFile(outputArg, JSON.stringify({archive, archiveSha256: sha(await readFile(archive)), proposedVersion: '0.2.0', published: false, candidateFiles:expected, consumers}, null, 2))
  if (consumers.some(row => !row.exactCandidateBytes)) process.exitCode = 1
} finally {await rm(scratch, {recursive:true, force:true})}
