import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import AstroPWA from '@vite-pwa/astro';
import tailwindcss from '@tailwindcss/vite';

// Environnement inliné au build (chaque branche est buildée séparément) :
//  - 'development' via le script `dev:storefront`
//  - 'staging'     injecté par la CI sur la branche staging
//  - 'production'  par défaut (branche main)
const APP_ENV = process.env.PUBLIC_APP_ENV || 'production';
// Suffixe des icônes selon l'env : bandeau DEV / TEST baked dans le PNG.
const ICON_SUFFIX = APP_ENV === 'development' ? '-dev' : APP_ENV === 'staging' ? '-test' : '';
const ENV_LABEL = APP_ENV === 'development' ? ' (DEV)' : APP_ENV === 'staging' ? ' (TEST)' : '';

// Clé publique VAPID, inlinée au build comme PUBLIC_APP_ENV : `pushManager.subscribe()`
// en a besoin côté navigateur. Elle est publique par nature (la clé privée reste un
// secret du Worker). Vide = bouton d'activation des notifications masqué.
const VAPID_PUBLIC_KEY = process.env.PUBLIC_VAPID_PUBLIC_KEY || '';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'advanced',
    runtime: { mode: 'local' }
  }),
  integrations: [
    svelte(),
    AstroPWA({
      // App SSR authentifiée : le SW ne doit ni recharger la page tout seul
      // (le rechargement effaçait le widget Turnstile en mode PWA), ni servir de
      // coquille HTML en cache pour les navigations (auth + Turnstile = toujours réseau).
      registerType: 'prompt',
      // `injectManifest` (et non le SW généré) : le service worker doit porter nos
      // propres handlers `push` et `notificationclick`, impossibles à ajouter au SW
      // produit par workbox.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.png', `apple-touch-icon${ICON_SUFFIX}.png`],
      manifest: {
        name: 'Nozay Bad' + ENV_LABEL,
        short_name: 'Nozay Bad' + ENV_LABEL,
        description: 'Espace adhérent du club Nozay Badminton',
        theme_color: '#262624',
        background_color: '#262624',
        display: 'standalone',
        icons: [
          {
            src: `/pwa/icon-192${ICON_SUFFIX}.png`,
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: `/pwa/icon-512${ICON_SUFFIX}.png`,
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{css,js,svg,png,ico,txt}']
      }
      // Aucune route de navigation n'est déclarée dans src/sw.ts : les navigations
      // vont toujours au réseau (SSR), jamais vers un index.html en cache
      // (inexistant ici) → évite le rechargement et la coquille périmée qui
      // cassaient le login/Turnstile en mode PWA.
    })
  ],
  vite: {
    define: {
      'import.meta.env.PUBLIC_APP_ENV': JSON.stringify(APP_ENV),
      'import.meta.env.PUBLIC_VAPID_PUBLIC_KEY': JSON.stringify(VAPID_PUBLIC_KEY)
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: [
        'astro:transitions',
        '@astrojs/cloudflare',
        '@nba/ui',
        '@nba/members-ui',
        '@nba/accounting-ui',
        '@nba/expenses-ui',
        '@nba/shop-ui',
        '@nba/iam-ui',
        '@nba/announcements-ui'
      ]
    },
    ssr: {
      external: ['@astrojs/cloudflare']
    }
  },
  // Port fixe et strict.
  //
  // Sans `strictPort`, Astro glisse en silence sur le port suivant quand le sien est
  // pris : lancer les trois applications dans le désordre les décale d'un cran chacune
  // et l'on se retrouve avec le storefront sur le port du site. Mieux vaut un échec
  // franc, qui dit lequel des serveurs tourne déjà.
  server: { port: 4322, strictPort: true },
  srcDir: './src'
});
