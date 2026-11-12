import { afterEach, expect, it } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildFrameArtifacts, buildFrameBootstrap } from '../dist/vite.js'
import { verifyArtifact } from '../src/isolation.js'
const scratch: string[] = []
afterEach(async () => { for (const path of scratch.splice(0)) await rm(path, { recursive: true, force: true }) })
it('packages an internal graph into exact-byte single-file ESM inventories with approved peer imports', async () => {
  const root = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'frame-artifacts-')); scratch.push(root)
  await writeFile(join(root, 'inner.js'), 'export const value = "verified";')
  await writeFile(join(root, 'entry.js'), 'import React from "react"; import { value } from "./inner.js"; export const View = () => React.createElement("p", null, value);')
  await writeFile(join(root, 'react.js'), 'export default { createElement: () => null };')
  const inventory = await buildFrameArtifacts({ root, entries: [{ specifier: 'react', source: join(root, 'react.js'), exports: [], defaultExport: true }, { specifier: '@fixture/ui', source: join(root, 'entry.js'), exports: ['View'] }] })
  const ui = inventory.artifacts.find(artifact => artifact.id === inventory.imports.find(row => row.specifier === '@fixture/ui')!.artifact)!
  const code = new TextDecoder().decode(await verifyArtifact(ui))
  expect(code).toContain('verified'); expect(code).not.toContain('./inner.js'); expect(code).toContain('react')
})
it('refuses unreviewed external graphs and builds a self-contained bootstrap', async () => {
  const root = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'frame-refusal-')); scratch.push(root)
  await writeFile(join(root, 'entry.js'), 'export { View } from "https://unreviewed.test/module.js";')
  await expect(buildFrameArtifacts({ root, entries: [{ specifier: '@fixture/ui', source: join(root, 'entry.js'), exports: ['View'] }] })).rejects.toThrow()
  expect(await buildFrameBootstrap()).toContain('ready-window')
})
