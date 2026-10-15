import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/..." means "src/...", the same alias as in tsconfig.app.json.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // In development, any request starting with /api is forwarded to the .NET API.
    // The browser only ever talks to Vite (same origin), so no CORS setup is needed.
    proxy: {
      '/api': 'http://localhost:5080',
    },
  },
})
