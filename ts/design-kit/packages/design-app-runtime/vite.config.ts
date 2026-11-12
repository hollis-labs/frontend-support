import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

/**
 * Library build, mirroring kit-dashboard's proven config rather than inventing a
 * second one. Modules are preserved so consumers tree-shake at the hook level, and
 * react stays external — the consuming app installs it.
 *
 * NOTE, deliberately preserved: `vite-plugin-dts` emits declarations under
 * `dist/src/` (mirroring the source tree) while the JS is flattened to `dist/` by
 * `preserveModules`. That is why `package.json` `types` points at
 * `./dist/src/index.d.ts` and not `./dist/index.d.ts`. `rollupTypes: true` was tried
 * in sysop-ui and produced an empty `export {}` bundle. Captured as
 * [[sysop_ui_build_quirks]] — do not "fix" it without checking that.
 *
 * This package has NO runtime dependencies, so `external` is react and nothing else.
 * If that list ever grows, the "adopt it without taking any appearance" property is
 * what is being spent.
 */
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
      external: (id) =>
        id === 'react' ||
        id === 'react-dom' ||
        id.startsWith('react/') ||
        id.startsWith('react-dom/'),
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
