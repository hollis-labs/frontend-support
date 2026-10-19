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
 * EXTERNALS ARE DERIVED FROM package.json, NEVER LISTED — see kit-chat's vite.config.ts
 * for the incident behind that. It matters more here than anywhere: `media-chrome`
 * registers custom elements in the global registry, so a bundled second copy would
 * either throw "already defined" or silently use the wrong class. An optional peer is
 * still a peer and must still be external.
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
        // Opt-in subpath: media-chrome is an optional peer and registers custom elements, so
        // nothing in the main entry may import this module. See README, "AudioPlayer".
        'audio-player/index': path.resolve(__dirname, 'src/audio-player/index.tsx'),
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
