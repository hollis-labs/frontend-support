import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // e2e/*.spec.ts are Playwright specs (`npm run e2e`), not vitest tests.
  test: { environment: 'jsdom', globals: true, exclude: ['**/node_modules/**', 'e2e/**', 'demo/**'] },
})
