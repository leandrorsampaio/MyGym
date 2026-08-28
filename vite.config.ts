import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'MyGym',
        short_name: 'MyGym',
        description: 'Personal gym + football training coach',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1220',
        theme_color: '#0b1220',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // SPA: serve the cached shell for any navigation when offline.
        navigateFallback: '/index.html',
        // ...except paths that must reach the network: /signin, so Cloudflare Access can
        // challenge for a fresh session; /api/*, where the shell would otherwise be served
        // in place of the endpoint; and /cdn-cgi/*, which is Access's own login and logout.
        navigateFallbackDenylist: [/^\/signin/, /^\/api\//, /^\/cdn-cgi\//],
        runtimeCaching: [
          {
            // Exercise thumbnails (user-supplied image URLs) → cache on first view.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'thumbnails',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
