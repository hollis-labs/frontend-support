import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  // `@/` is declared in tsconfig.json, so it must resolve here too. Declaring it
  // in one place and not the other is the trap design-app-runtime hit on its first
  // run: typecheck passes and the test run fails to resolve.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
