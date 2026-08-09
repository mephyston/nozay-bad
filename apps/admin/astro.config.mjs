import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import AstroPWA from '@vite-pwa/astro';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { satteriAlerts } from './plugins/markdown-alerts.mjs';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'));

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
  adapter: cloudflare({
    mode: 'advanced',
    runtime: { mode: 'local' }
  }),
  integrations: [
    svelte(),
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', `apple-touch-icon${ICON_SUFFIX}.png`],
      manifest: {
        name: 'Nozay Bad Admin' + ENV_LABEL,
        short_name: 'NBA Admin' + ENV_LABEL,
        description: 'Administration du club Nozay Badminton',
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
        globPatterns: ['**/*.{css,js,svg,png,ico,txt}']
      }
    })
  ],
  vite: {
    define: {
      'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || pkg.version),
      'import.meta.env.PUBLIC_APP_ENV': JSON.stringify(APP_ENV),
      'import.meta.env.PUBLIC_STOREFRONT_URL': JSON.stringify(STOREFRONT_URL),
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
        '@nba/notifications-ui',
        '@nba/iam',
        '@nba/iam-ui',
        '@nba/announcements-ui', '@nba/cms-ui', '@nba/schedules-ui', '@nba/events-ui'
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
  server: { port: 4321, strictPort: true },
  srcDir: './src'
});
