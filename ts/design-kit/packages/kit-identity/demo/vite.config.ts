import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Demo against a real Substrate backend (for example Basalisk), not a stub.
 *   BACKEND=http://127.0.0.1:8085 npm run demo
 * `/api` is proxied; the proxy presents the backend's own Origin and Host so the same-origin checks pass.
 */
const target = process.env.BACKEND ?? 'http://127.0.0.1:8085'
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, '../src') } },
  server: { proxy: { '/api': { target, changeOrigin: true, headers: { Origin: target } } } },
})
