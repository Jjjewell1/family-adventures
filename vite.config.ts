import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/'
      },
      manifest: {
        name: 'Family Adventures',
        short_name: 'Adventures',
        description: "Our family's collection of adventures, memories, and shared moments",
        id: '/?pwa=home',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        theme_color: '#3B6F54',
        background_color: '#FBF7F0',
        categories: ['lifestyle', 'family'],
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-180x180.png',
            sizes: '180x180',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'New Adventure',
            short_name: 'New',
            url: '/adventures/create',
            icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Map',
            short_name: 'Map',
            url: '/map',
            icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Gallery',
            short_name: 'Gallery',
            url: '/gallery',
            icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /^\/admin\//, /^\/share\//],
        runtimeCaching: [
          // Visited pages work offline (network-first, cached on success)
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          },
          // SvelteKit client-side data so visited routes render offline
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/__data.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 3 }
            }
          },
          // Hashed app chunks not already covered by precache
          {
            urlPattern: /\/_app\/immutable\/.*\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-assets' }
          },
          // Uploaded photos (capped so storage stays sane)
          {
            urlPattern: ({ url }) =>
              url.pathname === '/api/media/image' || url.pathname === '/api/media/thumbnail',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'media',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 5 }
            }
          }
        ]
      }
    })
  ]
});