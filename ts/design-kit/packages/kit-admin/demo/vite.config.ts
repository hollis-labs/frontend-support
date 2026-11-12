import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Manual bundle evidence for the separate Settings-only host; no CI assertion.
export default defineConfig({ root: __dirname, plugins: [react(), tailwindcss(), {
  name: 'review-module-inventory',
  generateBundle(_, bundle) {
    const inventory = Object.values(bundle).filter(chunk => chunk.type === 'chunk').map(chunk => ({ file: chunk.fileName, imports: chunk.imports, modules: Object.keys(chunk.modules).map(id => path.relative(path.resolve(__dirname, '../../..'), id)) }))
    this.emitFile({ type: 'asset', fileName: 'review-modules.json', source: JSON.stringify(inventory, null, 2) })
  },
}], build: { outDir: 'dist', manifest: true, rollupOptions: { input: { demo: path.resolve(__dirname, 'index.html'), settingsOnly: path.resolve(__dirname, 'settings-only.html') } } } })
