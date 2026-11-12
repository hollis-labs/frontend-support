import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Local fixture host for manual and screenshot review. Not shipped, not run by CI.
export default defineConfig({ root: __dirname, plugins: [react(), tailwindcss()] })
