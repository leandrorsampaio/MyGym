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
        /*
         * Deliberately NO `navigateFallback`.
         *
         * That option answers *every* navigation from the precache, online or not — the
         * classic app-shell model. Combined with Cloudflare Access it bricks the app: when
         * the session lapses, the browser can't fetch a new /sw.js (Access redirects it),
         * so the worker keeps serving its snapshot and every deploy appears not to land.
         * You can be online, signed in, and still be shown a build from days ago.
         *
         * NetworkFirst instead. Online, you get the current build — and because a fresh
         * index.html references fresh hashed bundles, the app updates even while the worker
         * itself is stale. With a lapsed session the navigation returns Access's redirect
         * and you land on the login, which is the thing that actually needs to happen.
         * Offline, it falls back to the last page cached, so the gym still works.
         */
        // vite-plugin-pwa injects `navigateFallback: 'index.html'` by default, and that
        // route is registered *before* runtimeCaching — so without this the rule below is
        // dead code and every navigation still comes from the precache.
        navigateFallback: null,
        runtimeCaching: [
          {
            // /api, /signin and /cdn-cgi are left unhandled on purpose: they must always
            // hit the network, and a cached copy of a login page would be worse than useless.
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' && !/^\/(api\/|signin|cdn-cgi\/)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8 },
              // 200 only. An Access redirect surfaces as an opaque response (status 0);
              // caching that would pin the login page in place of the app.
              cacheableResponse: { statuses: [200] },
            },
          },
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
