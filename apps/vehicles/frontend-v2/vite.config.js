import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = command === 'build'
    ? (env.VITE_APP_BASE_PATH || '/dev/vehicles-v2/')
    : '/'

  return {
    base,
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/dev/api.vehicles': {
          target: 'https://erdms.zachranka.cz',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
