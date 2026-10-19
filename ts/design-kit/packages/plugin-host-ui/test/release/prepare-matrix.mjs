import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
const [archiveArgument, rootArgument] = process.argv.slice(2)
if (!archiveArgument || !rootArgument) throw new Error('Usage: prepare-matrix.mjs CANDIDATE.tgz OWN_EVIDENCE_ROOT')
const archive = resolve(archiveArgument), evidence = resolve(rootArgument)
for (const version of ['7.3.6', '8.2.2', '8.3.1']) {
  const root = join(evidence, `vite-${version}`)
  await mkdir(root, { recursive: true })
  const dependencies = {
    '@hollis-labs/plugin-host-ui': `file:${archive}`,
    '@hollis-labs/design-components': '0.4.0', '@hollis-labs/design-tokens': '0.4.0',
    '@hollis-labs/plugin-registry': '0.2.0', '@hollis-labs/kit-settings': '0.2.0',
    react: '19.3.0', 'react-dom': '19.3.0', 'es-module-lexer': '1.7.0',
    vite: version, typescript: '6.0.2', '@types/node': '24.13.4', '@types/react': '19.3.0', '@types/react-dom': '19.3.0',
  }
  await writeFile(join(root, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies }, null, 2) + '\n')
  await rm(join(root, 'package-lock.json'), { force: true })
  await rm(join(root, 'node_modules/@hollis-labs/plugin-host-ui'), { recursive: true, force: true })
  // Ordinary npm admission: no legacy-peer-deps, overrides or unpack bypass.
  const output = execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: root, encoding: 'utf8', env: process.env })
  await writeFile(join(root, 'install.log'), output)
  console.log(`PASS install: Vite ${version}`)
  await writeFile(join(root, 'index.html'), '<!doctype html><div id="root"></div><script type="module" src="/main.js"></script>')
  await writeFile(join(root, 'main.js'), `import { createElement } from 'react'; import { createRoot } from 'react-dom/client'; import { Button } from '@hollis-labs/design-components'; import { createPluginFrameBrowser } from '@hollis-labs/plugin-host-ui/isolation'; globalThis.candidateRuntime = createPluginFrameBrowser; createRoot(document.getElementById('root')).render(createElement(Button, null, 'Local candidate'));`)
  await writeFile(join(root, 'vite.config.mjs'), `import { defineConfig } from 'vite'; import { pluginHostImportmap } from '@hollis-labs/plugin-host-ui/vite'; export default defineConfig({ plugins: [pluginHostImportmap({ entries: [{ specifier: 'react', source: 'react', exports: ['createElement', 'useState'], defaultExport: true }] })] });`)
  await writeFile(join(root, 'public-api.ts'), `import { createPluginHostRuntime, createSlotCatalog } from '@hollis-labs/plugin-host-ui'; import { PluginHostProvider } from '@hollis-labs/plugin-host-ui/react'; import { PluginConfigForm } from '@hollis-labs/plugin-host-ui/settings'; import { createPluginFrameBrowser, type FrameModuleDelivery } from '@hollis-labs/plugin-host-ui/isolation'; import { buildFrameArtifacts, buildFrameBootstrap, pluginHostImportmap } from '@hollis-labs/plugin-host-ui/vite'; export const api = {createPluginHostRuntime, createSlotCatalog, PluginHostProvider, PluginConfigForm, createPluginFrameBrowser, buildFrameArtifacts, buildFrameBootstrap, pluginHostImportmap}; export type Delivery = FrameModuleDelivery;`)
}
