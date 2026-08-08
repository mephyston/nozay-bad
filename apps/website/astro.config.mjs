// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

const APP_ENV = process.env.PUBLIC_APP_ENV || 'production';

const SITE_URL =
  APP_ENV === 'development'
    ? 'http://localhost:4323'
    : APP_ENV === 'staging'
      ? 'https://staging-www.nozaybad.fr'
      : 'https://nozaybad.fr';

export default defineConfig({
  output: 'server',
  site: SITE_URL,
  // Toutes les URL héritées de WordPress se terminent par une barre oblique, et ce
  // sont elles qui sont indexées. On conserve exactement cette forme : Astro redirige
  // alors de lui-même la variante sans barre, plutôt que de servir deux URL pour une
  // même page.
  trailingSlash: 'always',
  adapter: cloudflare({
    mode: 'advanced',
    runtime: { mode: 'local' },
    // Les variantes d'images sont produites une fois à l'import : aucun service de
    // transformation à l'exécution, ce qui garde le site sur l'offre gratuite.
    imageService: 'passthrough'
  }),
  // Ni PWA ni service worker : site public, indexable, sans session. Un worker de
  // cache ferait doublon avec le cache du bord, qui est déjà notre levier principal.
  integrations: [svelte()],
  vite: {
    define: {
      'import.meta.env.PUBLIC_APP_ENV': JSON.stringify(APP_ENV),
      'import.meta.env.PUBLIC_SITE_URL': JSON.stringify(SITE_URL)
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['astro:transitions', '@astrojs/cloudflare', '@nba/ui', '@nba/cms-ui']
    },
    ssr: { external: ['@astrojs/cloudflare'] }
  },
  srcDir: './src'
});
