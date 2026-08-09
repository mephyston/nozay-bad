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
  // Les URL héritées de WordPress se terminent toutes par une barre oblique et ce sont
  // elles qui sont indexées — mais `'always'` l'exige aussi des fichiers, et
  // `/media/<clé>/400.webp` tombait alors en 404. La règle est donc appliquée par le
  // middleware, qui sait distinguer une page d'un fichier.
  trailingSlash: 'ignore',
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
  // Port fixe et strict.
  //
  // Sans `strictPort`, Astro glisse en silence sur le port suivant quand le sien est
  // pris : lancer les trois applications dans le désordre les décale d'un cran chacune
  // et l'on se retrouve avec le storefront sur le port du site. Mieux vaut un échec
  // franc, qui dit lequel des serveurs tourne déjà.
  server: { port: 4323, strictPort: true },
  srcDir: './src'
});
