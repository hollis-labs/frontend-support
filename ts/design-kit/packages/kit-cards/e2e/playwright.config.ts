import path from 'node:path'
import { defineConfig } from '@playwright/test'

const root = path.resolve(import.meta.dirname, '..')

/**
 * Runs against the PRODUCTION build of the demo gallery (`npm run demo:build`), served
 * by `vite preview` — so the stylesheet under test is the one a consumer gets from
 * `@hollis-labs/kit-cards/source.css`, not a dev server's. Screenshots land in
 * `e2e/.out`, which is gitignored: rendered evidence goes to the task tracker, never
 * into this public repository.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: path.join(root, 'e2e/.out/pw'),
  timeout: 180_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4179', browserName: 'chromium' },
  webServer: {
    command: 'npx vite preview --config demo/vite.config.ts --host 127.0.0.1 --port 4179 --strictPort',
    cwd: root,
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
