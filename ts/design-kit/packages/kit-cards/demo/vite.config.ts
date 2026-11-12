import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Gallery build for the Playwright matrix. Imports `@hollis-labs/kit-cards` through
 * its package export (the built `dist`), so the stylesheet the page gets is the one a
 * consumer gets from `source.css`. Run `npm run build` first.
 */
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^\.\.\/src\/registry$/, replacement: '@hollis-labs/kit-cards/registry' },
      { find: /^\.\.\/src$/, replacement: '@hollis-labs/kit-cards' },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
