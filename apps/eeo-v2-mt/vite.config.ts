import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || '/api.eeo';
  let apiPattern: RegExp | undefined;

  try {
    const normalized = apiBaseUrl.startsWith('http') ? apiBaseUrl : `https://placeholder.local${apiBaseUrl}`;
    const parsed = new URL(normalized);
    const origin = parsed.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pathname = parsed.pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/$/, '');
    apiPattern = new RegExp(`^${origin}${pathname}(/.*)?$`, 'i');
  } catch {
    apiPattern = undefined;
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: env.VITE_APP_NAME || 'EEO Mobile',
          short_name: 'EEO',
          description: 'Mobilni aplikace pro spravu objednavek',
          theme_color: '#1d3557',
          background_color: '#111216',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'document',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'documents-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 4,
                },
              },
            },
            {
              urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'assets-cache',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
              },
            },
            ...(apiPattern
              ? [
                  {
                    urlPattern: ({ url }: { url: URL }) => apiPattern?.test(url.href) ?? false,
                    handler: 'NetworkFirst' as const,
                    options: {
                      cacheName: 'api-cache',
                      networkTimeoutSeconds: 5,
                      expiration: {
                        maxEntries: 120,
                        maxAgeSeconds: 60 * 10,
                      },
                      cacheableResponse: {
                        statuses: [0, 200],
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      }),
    ],
    server: {
      port: 3001,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            return 'vendor';
          },
        },
      },
    },
  };
});
