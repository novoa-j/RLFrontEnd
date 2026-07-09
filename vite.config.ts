import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Where the RocketLab backend is reachable during local dev. Requests to
  // /telemetry are proxied there so the browser avoids CORS.
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/telemetry': { target, changeOrigin: true },
      },
    },
  }
})
