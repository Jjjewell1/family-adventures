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
        // Phones and tablets in both orientations — locking portrait would block
        // landscape photo viewing, which is the whole point of a gallery app.
        orientation: 'any',
        theme_color: '#FBF7F0',
        background_color: '#FBF7F0',
        categories: ['lifestyle', 'family', 'photo'],
        prefer_related_applications: false,
        // Receiving a link from the iOS/Android share sheet drops the user straight
        // into "New adventure" with the shared title/text/url pre-filled. Handled by
        // the default form action in src/routes/adventures/create/+page.server.ts.
        share_target: {
          action: '/adventures/create',
          method: 'POST',
          enctype: 'application/x-www-form-urlencoded',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
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
          // Google Fonts are a third-party origin, so workbox needs an explicit rule
          // or the installed app falls back to system fonts the first time it goes
          // offline. Stale-while-revalidate keeps the shell typography intact offline.
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
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