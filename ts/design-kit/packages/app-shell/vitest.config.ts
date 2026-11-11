import path from 'node:path'
import { defineConfig } from 'vitest/config'

const sibling = (p: string) => path.resolve(__dirname, '..', p)

// Workspace sources, as the task requires: nothing here is published yet.
export default defineConfig({
  resolve: {
    alias: {
      '@hollis-labs/design-bindings': sibling('design-bindings/src/index.ts'),
      '@hollis-labs/design-components': sibling('design-components/src/index.ts'),
      '@hollis-labs/design-tokens': sibling('design-tokens/src/index.ts'),
      '@hollis-labs/plugin-host-ui/react': sibling('plugin-host-ui/src/react.tsx'),
      '@hollis-labs/plugin-host-ui': sibling('plugin-host-ui/src/index.ts'),
    },
  },
  test: { environment: 'jsdom', include: ['test/**/*.test.{ts,tsx}'], setupFiles: ['./test/setup.ts'] },
})
