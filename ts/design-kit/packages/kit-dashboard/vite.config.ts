import path from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

/**
 * Library build. Emits an ES module + `.d.ts` declarations to `dist/`.
 * Modules are preserved so consumers tree-shake at the component level.
 * React, its runtime, and every dependency stay external — the consuming
 * app installs them. CSS ships raw (see `exports["./theme.css"]`).
 */
const require = createRequire(import.meta.url)
const pkg = require('./package.json') as {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/**
 * EXTERNALS ARE DERIVED FROM package.json, not listed.
 *
 * The list used to be hand-written, and by the time this package was rewired onto
 * design-components it had drifted twice over: it still named `clsx`, `cmdk`,
 * `sonner`, `tailwind-merge` and `class-variance-authority`, none of which are
 * dependencies any more, and it did NOT name the three `@hollis-labs/*` packages,
 * which are. Both halves of that drift are silent — a stale name externalises
 * nothing, and a missing name VENDORS A SECOND COPY of a package the consumer
 * also installs.
 *
 * That second half is the one that bites: `sonner` keeps its toast queue in module
 * state, so a bundled copy means `toast()` and `<Toaster/>` push to different
 * queues and the toast never appears, with nothing to debug. design-components hit
 * exactly that and fixed it the same way.
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
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        ui: path.resolve(__dirname, 'src/ui.ts'),
        layout: path.resolve(__dirname, 'src/layout.ts'),
        data: path.resolve(__dirname, 'src/data.ts'),
        widgets: path.resolve(__dirname, 'src/widgets.ts'),
        charts: path.resolve(__dirname, 'src/charts.ts'),
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
