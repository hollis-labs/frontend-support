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
 * EXTERNALS ARE DERIVED FROM package.json, NEVER LISTED, AND THIS PACKAGE IS THE ONE
 * MOST EXPOSED TO GETTING IT WRONG.
 *
 * kit-chat carries the most runtime dependencies in this repo, and chat libraries are
 * exactly where module-level state lives. `design-components` shipped a build that
 * vendored `sonner` into `dist/` from a hand-kept list — and sonner holds its toast
 * queue in module state, so a consumer's `toast()` pushed onto a different queue than
 * the bundled `<Toaster/>`. Nothing appeared, no error, nothing in the stack pointed at
 * a bundler config. Two of the three packages that had a hand-written list had drifted,
 * one of them in both directions at once.
 *
 * Reading the manifest makes the two unable to disagree. `optional: true` on
 * `streamdown` does not change this: an optional peer is still a peer and must still be
 * external, or the `/markdown` subpath vendors a second copy of a parser the consumer
 * already installed.
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
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'markdown/index': path.resolve(__dirname, 'src/markdown/index.tsx'),
      },
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
