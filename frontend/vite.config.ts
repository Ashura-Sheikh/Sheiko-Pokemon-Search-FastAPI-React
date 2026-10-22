import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The browser calls /api on the Vite dev server, which forwards to FastAPI.
    // Same origin for the browser, so the backend needs no CORS settings.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // The first full MUI page render in a test file can take several seconds on a
    // busy machine (one local run hit 9.5s against the 5s default), so allow 15s.
    testTimeout: 15_000,
  },
})
