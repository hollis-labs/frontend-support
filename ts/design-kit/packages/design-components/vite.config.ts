import path from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

const require = createRequire(import.meta.url)
const pkg = require('./package.json') as {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/**
 * Library build, mirroring design-app-runtime and kit-dashboard rather than
 * inventing a third config. Modules are preserved so a consumer importing one
 * Button does not pull the package — which is the whole point of the split.
 *
 * NOTE, deliberately preserved: `vite-plugin-dts` emits declarations under
 * `dist/src/` (mirroring the source tree) while `preserveModules` flattens the JS
 * to `dist/`. That is why `package.json` `types` points at `./dist/src/index.d.ts`.
 * `rollupTypes: true` was tried in sysop-ui and produced an empty `export {}`
 * bundle — see [[sysop_ui_build_quirks]] before "fixing" it.
 *
 * EXTERNALS ARE THE BOUNDARY, NOT AN OPTIMISATION, AND THEY COVER `dependencies`
 * AS WELL AS PEERS.
 *
 * The peer half is the obvious one: bundling a second copy of a headless library
 * gives an app two portal roots and two context trees, and a Popover inside a
 * Dialog then breaks in a way nobody debugs quickly.
 *
 * The `dependencies` half is the same bug wearing different clothes, and the first
 * build of this package had it — `sonner` (22 kB) and `tailwind-merge` (80 kB) were
 * inlined under `dist/node_modules/`. npm installs those for the consumer anyway,
 * so the consumer gets two copies; and `sonner` keeps its toast queue in MODULE
 * STATE, so an app calling `toast()` from its own copy would push onto a different
 * queue than the `<Toaster/>` rendered from this one. The toast simply never
 * appears, with nothing to debug. `tailwind-merge` is the milder version of the
 * same thing: two configs, two caches, 80 kB paid twice.
 *
 * DERIVED FROM package.json RATHER THAN LISTED. A hand-written list is a second
 * place to remember, and the failure is silent — add a dependency, forget the list,
 * and it is quietly bundled. Reading the manifest makes the two impossible to
 * disagree.
 */
const EXTERNAL = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
]

export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.build.json',
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/__tests__'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: { index: path.resolve(__dirname, 'src/index.ts') },
      formats: ['es'],
    },
    rollupOptions: {
      external: (id) => EXTERNAL.some((p) => id === p || id.startsWith(p + '/')),
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
})
