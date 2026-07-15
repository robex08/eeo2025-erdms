import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBasePath(value) {
  if (!value || value.trim() === '') {
    return '/'
  }

  let path = value.trim()
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  if (!path.endsWith('/')) {
    path = `${path}/`
  }

  return path
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredBase = normalizeBasePath(env.VITE_APP_BASE_PATH || '/dev/burza-sluzby/')
  const appBase = command === 'serve' ? '/' : configuredBase
  const apiBase = (env.VITE_BURZA_API_BASE || '/dev/api.burza-sluzby').trim()
  const apiTarget = (env.VITE_BURZA_DEV_API_TARGET || 'http://127.0.0.1:8000').trim()

  return {
    plugins: [react()],
    base: appBase,
    build: {
      outDir: 'build',
      assetsDir: 'assets',
    },
    server: {
      host: true,
      port: 5180,
      strictPort: true,
      proxy: {
        '/auth': {
          target: apiTarget,
          changeOrigin: true,
          headers: {
            Host: 'localhost',
          },
        },
        [apiBase]: {
          target: apiTarget,
          changeOrigin: true,
          headers: {
            Host: 'localhost',
          },
        },
      },
    },
  }
})
