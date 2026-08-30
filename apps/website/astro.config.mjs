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
    /*
      Stockage local partagé avec l'API.

      Sans réglage, chaque projet persiste ses liaisons dans son propre
      `.wrangler/state` : l'API écrivait les médias déposés dans le sien, le site les
      cherchait dans le sien, et toute image envoyée depuis l'administration
      ressortait en 404 — en développement seulement, la production ne connaissant
      qu'un seul conteneur `nba-media`.

      Le chemin est résolu depuis la racine Vite (`apps/website`) puis suffixé de
      `v3` par le greffon Cloudflare. C'est l'API qu'on désigne parce que c'est elle
      qui écrit ; le site ne fait que lire.

      N'a d'effet qu'en local : rien de tout ceci n'existe une fois déployé.
    */
    persistState: { path: '../api/.wrangler/state' },
    /*
      Aucune transformation, ni au build ni à l'exécution.

      Le site ne fait passer aucune image par `<Image />` : les déclinaisons sont déjà
      produites en amont — au dépôt par l'API (binding Images), à la reprise par
      `scripts/wp-import` — et `Picture.astro` se contente de les servir depuis R2 sous
      cache immuable. Il n'y a donc rien à transformer ici, et `'passthrough'` le dit.

      À ne pas confondre avec `'compile'`, qui pré-optimiserait au build les images
      importées depuis `src/`. Le jour où le site en importerait, c'est cette
      valeur-là qu'il faudrait, pas celle-ci.
    */
    imageService: 'passthrough'
  }),
  // Ni PWA ni service worker : site public, indexable, sans session. Un worker de
  // cache ferait doublon avec le cache du bord, qui est déjà notre levier principal.
  integrations: [svelte()],
  vite: {
    /*
      `strictPort` vit ici et non dans `server` : c'est une option **Vite**, qu'Astro ne
      reconnaît pas dans sa propre configuration. Écrite au mauvais endroit, elle était
      ignorée en silence — et le serveur glissait donc sur le port suivant, ce que le
      commentaire ci-dessous voulait précisément empêcher.
    */
    server: { strictPort: true },
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
  server: { port: 4323 },
  srcDir: './src'
});
