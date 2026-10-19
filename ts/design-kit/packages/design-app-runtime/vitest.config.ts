import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  // `@/` is declared in tsconfig.json, so it must resolve here too. Declaring it in
  // one place and not the other is the trap: typecheck passes and the test run fails
  // to resolve, which is exactly what happened on the first run of this package.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
