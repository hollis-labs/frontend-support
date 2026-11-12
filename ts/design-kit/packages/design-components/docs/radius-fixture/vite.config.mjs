import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
const root = fileURLToPath(new URL('.', import.meta.url))
const repo = fileURLToPath(new URL('../../../../', import.meta.url))
export default defineConfig({ root, cacheDir: repo + 'node_modules/.vite-radius-proof', plugins: [react(), tailwind()], resolve: { alias: { '@': repo + 'packages/kit-dashboard/src', react: repo + 'node_modules/react', 'react-dom': repo + 'node_modules/react-dom' } }, server: { fs: { allow: [repo] } } })
