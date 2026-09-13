import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import AstroPWA from '@vite-pwa/astro';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { satteriAlerts } from './plugins/markdown-alerts.mjs';
import { headersStatiques } from './plugins/headers-statiques.mjs';
import { buildCsp } from './src/lib/csp.ts';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environnement inliné au build (chaque branche est buildée séparément) :
//  - 'development' via les scripts `dev:*`
//  - 'staging'     injecté par la CI sur la branche staging
//  - 'production'  par défaut (branche main)
const APP_ENV = process.env.PUBLIC_APP_ENV || 'production';
// Suffixe des icônes selon l'env : bandeau DEV / TEST baked dans le PNG.
const ICON_SUFFIX = APP_ENV === 'development' ? '-dev' : APP_ENV === 'staging' ? '-test' : '';
const ENV_LABEL = APP_ENV === 'development' ? ' (DEV)' : APP_ENV === 'staging' ? ' (TEST)' : '';

// Espace adhérent correspondant à cet environnement. Sert à prévisualiser la page
// qu'ouvrira une notification : l'admin doit pointer vers SON storefront, sinon un
// test depuis la staging enverrait vers la production.
const STOREFRONT_URL =
  APP_ENV === 'development'
    ? 'http://localhost:4322'
    : APP_ENV === 'staging'
      ? 'https://staging-my.nozaybad.fr'
      : 'https://my.nozaybad.fr';
const WEBSITE_URL =
  APP_ENV === 'development'
    ? 'http://localhost:4323'
    : APP_ENV === 'staging'
      ? 'https://staging-www.nozaybad.fr'
      : 'https://nozaybad.fr';

export default defineConfig({
  /*
   * Pages figées produites en `chemin.html`, et non `chemin/index.html`.
   *
   * Sous la forme répertoire, le service d'actifs de Cloudflare redirige `/admin/teams`
   * vers `/admin/teams/` avant de servir quoi que ce soit : mesuré en préproduction,
   * quatorze redirections pour vingt affichages. Un aller-retour de plus à chaque
   * navigation, gagné en supprimant le rendu — le compte n'y était pas.
   *
   * `trailingSlash: 'never'` dit la même chose au routeur d'Astro, pour que les liens
   * qu'il produit visent la forme réellement servie.
   */
  build: { format: 'file' },
  trailingSlash: 'never',
  output: 'server',
  markdown: {
    // Processeur par défaut d'Astro, redéclaré pour lui greffer le rendu des
    // encarts `> [!NOTE]` du centre d'aide et du CHANGELOG.
    processor: satteri({ hastPlugins: [satteriAlerts] })
  },
  // Pas de `prefetch` : le HTML de l'admin est servi en `private, no-store`
  // (cf. lib/security-headers.ts), donc une page préchargée ne serait pas stockée et
  // la requête serait perdue — tout en déclenchant côté serveur les appels API et D1
  // d'une page jamais visitée.
  /*
    Pas de session Astro : l'identité vient de Cloudflare Access, dont le middleware
    vérifie le jeton à chaque requête. Rien n'a jamais été stocké dans le pilote KV que
    l'adaptateur branchait par défaut ; `false` sort le runtime du paquet (Astro ≥ 7.2).
  */
  session: false,
  adapter: cloudflare({
    runtime: { mode: 'local' }
  }),
  integrations: [
    // Les pages figées échappent au middleware : leurs en-têtes passent par `_headers`.
    headersStatiques({ csp: buildCsp(WEBSITE_URL) }),
    svelte(),
    AstroPWA({
      registerType: 'autoUpdate',
      // L'admin est derrière Cloudflare Access. Par spécification, un manifest est
      // récupéré **sans cookies** : la requête arrivait donc à Access sans jeton et
      // recevait la page de connexion en HTML au lieu du JSON. `useCredentials` ajoute
      // crossorigin="use-credentials" à la balise, ce qui joint le cookie de session.
      // Les icônes, elles, restent à débloquer côté Access (politique Bypass) : iOS les
      // récupère hors du contexte authentifié lors de « Ajouter à l'écran d'accueil ».
      useCredentials: true,
      includeAssets: ['pwa/favicon.png', `pwa/apple-touch-icon${ICON_SUFFIX}.png`],
      manifest: {
        name: 'Nozay Bad Admin' + ENV_LABEL,
        short_name: 'NBA Admin' + ENV_LABEL,
        description: 'Administration du club Nozay Badminton',
        // Sans cette ligne, vite-pwa émet `"lang": "en"` pour une app en français.
        lang: 'fr',
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
      workbox: {
        globPatterns: ['**/*.{css,js,svg,png,ico,txt}'],
        /*
         * Pas de repli de navigation, et c'est ce qui rend ce service worker installable.
         *
         * Par défaut, workbox enregistre une `NavigationRoute` liée à `/` via
         * `createHandlerBoundToURL`, qui **lève** quand l'URL n'est pas précachée. Or le
         * HTML est délibérément exclu de `globPatterns` : les pages de l'administration
         * sont nominatives, et les garder sur l'appareil contredirait le `no-store`
         * qu'elles portent. Le script échouait donc à l'évaluation, et le service worker
         * ne s'installait jamais — `autoUpdate` compris.
         *
         * Un repli n'aurait de sens que pour une application qui sait fonctionner hors
         * ligne. Celle-ci est derrière Cloudflare Access et lit une base : sans réseau,
         * une coquille vide n'apprendrait rien à personne.
         */
        navigateFallback: null
      }
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
      // Version publiée, transmise par la CI (semantic-release en préproduction, tag
      // promu en production). Plus de repli sur package.json : depuis la suppression de
      // @semantic-release/git, la version du dépôt est figée et serait donc fausse.
      'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || 'dev'),
      'import.meta.env.PUBLIC_APP_ENV': JSON.stringify(APP_ENV),
      'import.meta.env.PUBLIC_STOREFRONT_URL': JSON.stringify(STOREFRONT_URL),
      'import.meta.env.PUBLIC_WEBSITE_URL': JSON.stringify(WEBSITE_URL)
    },
    plugins: [tailwindcss()],
    /**
     * Alias explicites des paquets du dépôt.
     *
     * Astro sait dériver ces chemins de `compilerOptions.paths`, mais il le fait **au
     * démarrage du serveur** : ajouter un paquet oblige alors à redémarrer, et l'oubli se
     * manifeste par un « Cannot find module » qui désigne la page, pas la cause. Les
     * déclarer ici rend la résolution indépendante de l'ordre des opérations — et le
     * fichier énumère de toute façon déjà ces paquets un peu plus bas.
     */
    resolve: {
      alias: {
        '@nba/teams-api': path.resolve(__dirname, '../../libs/domains/teams/index.ts'),
        // Liste fermée des championnats, partagée. Alias étroit plutôt que le barrel `@nba/teams-api`, qui tire tout le serveur du domaine.
        '@nba/teams/championship': path.resolve(__dirname, '../../libs/domains/teams/shared/championship.ts'),
        // Liste fermée des fonctions au club, partagée ; alias étroit plutôt que le barrel.
        '@nba/members/club-functions': path.resolve(__dirname, '../../libs/domains/members/shared/club-functions.ts'),
        '@nba/members/membership-status': path.resolve(__dirname, '../../libs/domains/members/shared/membership-status.ts'),
        '@nba/teams-ui': path.resolve(__dirname, '../../libs/domains/teams/shared/ui.ts'),
        '@nba/club-ui': path.resolve(__dirname, '../../libs/domains/club/shared/ui.ts'),
        '@nba/club/settings': path.resolve(__dirname, '../../libs/domains/club/shared/settings-api.ts')
      }
    },
    optimizeDeps: {
      exclude: [
        'astro:transitions',
        '@astrojs/cloudflare',
        '@nba/ui',
        '@nba/members-ui',
        '@nba/accounting-ui',
        '@nba/expenses-ui',
        '@nba/shop-ui',
        '@nba/notifications-ui',
        '@nba/iam',
        '@nba/iam-ui',
        '@nba/announcements-ui', '@nba/cms-ui', '@nba/schedules-ui', '@nba/events-ui', '@nba/teams-ui', '@nba/club-ui'
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
  server: { port: 4321 },
  srcDir: './src'
});
