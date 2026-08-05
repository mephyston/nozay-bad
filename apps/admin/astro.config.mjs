import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import AstroPWA from '@vite-pwa/astro';
import tailwindcss from '@tailwindcss/vite';

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

export default defineConfig({
  output: 'server',
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
      'import.meta.env.PUBLIC_APP_ENV': JSON.stringify(APP_ENV)
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
        '@nba/iam-ui'
      ]
    },
    ssr: {
      external: ['@astrojs/cloudflare']
    }
  },
  srcDir: './src'
});
