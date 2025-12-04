import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Načti env proměnné pro daný mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    
    // Server konfigurace pro dev mode
    server: {
      port: 5173,
      host: true, // umožní přístup z vnější sítě
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    
    // Build konfigurace
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
    },
    
    // Env prefix - zpřístupní VITE_* proměnné v klientu
    envPrefix: 'VITE_',
  };
})
