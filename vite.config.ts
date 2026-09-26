import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'child_process';

function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Stamps the commit and build time into the bundle and onto <html data-build>.
 * A service worker or proxy cache can leave a browser running an older build for
 * days with no visible symptom, so the running build needs to be readable from
 * the page itself rather than inferred from a deploy log.
 */
function buildStamp(): Plugin {
  const commit = gitCommit();
  const builtAt = new Date().toISOString();
  return {
    name: 'build-stamp',
    config: () => ({
      define: {
        'import.meta.env.BUILD_COMMIT': JSON.stringify(commit),
        'import.meta.env.BUILD_AT': JSON.stringify(builtAt)
      }
    }),
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        return html.replace('<html lang="en">', `<html lang="en" data-build="${commit}">`);
      }
    }
  };
}

export default defineConfig({
  plugins: [
    buildStamp(),
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      // The generated registerSW.js registers './sw.js' at scope './', which
      // resolves to /adventures/sw.js on any nested route and 404s. SvelteKit
      // renders HTML at request time so there is no index.html for the plugin to
      // inject into anyway; +layout.svelte registers /sw.js explicitly instead.
      injectRegister: false,
      scope: '/',
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