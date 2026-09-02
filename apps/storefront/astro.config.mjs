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

// Domaine du site public, seul porteur de la liaison R2 et de la route `/media/`.
// L'espace adhérent affiche les couvertures d'actualités : sans cette origine, leurs
// adresses relatives seraient résolues ici, où rien ne répond. Même règle que côté
// administration (`@nba/cms` → `media-url.ts`).
const WEBSITE_URL =
  APP_ENV === 'development'
    ? 'http://localhost:4323'
    : APP_ENV === 'staging'
      ? 'https://staging-www.nozaybad.fr'
      : 'https://nozaybad.fr';

export default defineConfig({
  output: 'server',
  /*
    Pas de session Astro, malgré l'espace adhérent.

    La nôtre est un JWT signé, relu dans l'en-tête `Cookie` par `lib/auth.ts` : sans
    état, et donc sans une lecture KV par requête — c'est ce choix qui tient le plan
    gratuit. Le runtime d'Astro et son pilote KV par défaut n'ont jamais rien stocké
    ici ; `false` les sort du paquet (Astro ≥ 7.2).
  */
  session: false,
  adapter: cloudflare({
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
      includeAssets: ['pwa/favicon.png', `pwa/apple-touch-icon${ICON_SUFFIX}.png`],
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
    /*
      `strictPort` vit ici et non dans `server` : c'est une option **Vite**, qu'Astro ne
      reconnaît pas dans sa propre configuration. Écrite au mauvais endroit, elle était
      ignorée en silence — et le serveur glissait donc sur le port suivant, ce que le
      commentaire ci-dessous voulait précisément empêcher.
    */
    server: { strictPort: true },
    define: {
      // Version publiée, transmise par la CI. Pas de repli sur package.json : depuis le
      // retrait de @semantic-release/git, la version du dépôt est figée.
      'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || 'dev'),
      'import.meta.env.PUBLIC_APP_ENV': JSON.stringify(APP_ENV),
      'import.meta.env.PUBLIC_VAPID_PUBLIC_KEY': JSON.stringify(VAPID_PUBLIC_KEY),
      'import.meta.env.PUBLIC_WEBSITE_URL': JSON.stringify(WEBSITE_URL)
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
        '@nba/events-ui',
        '@nba/teams-ui',
        '@nba/schedules-ui'
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
  server: { port: 4322 },
  srcDir: './src'
});
