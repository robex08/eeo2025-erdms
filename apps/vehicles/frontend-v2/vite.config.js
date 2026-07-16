import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
})
