// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { headersStatiques } from '../../scripts/headers-statiques.mjs';

const APP_ENV = process.env.PUBLIC_APP_ENV || 'production';

// L'adresse vient de `scripts/build-env.mjs`, jamais d'ici ; à l'exécution, la variable
// `SITE_URL` du Worker prime (voir `request-context.ts`).
// Absente hors développement : la CI refuse, un poste de développeur est averti.
const SITE_URL = process.env.PUBLIC_SITE_URL || 'http://localhost:4323';
if (APP_ENV !== 'development' && !process.env.PUBLIC_SITE_URL) {
  const message = `[website] PUBLIC_SITE_URL absente pour un build « ${APP_ENV} » (voir scripts/build-env.mjs)`;
  if (process.env.CI) throw new Error(message);
  console.warn(`${message} : adresse locale utilisée.`);
}

export default defineConfig({
  output: 'server',
  site: SITE_URL,
  // Les URL héritées de WordPress se terminent toutes par une barre oblique et ce sont
  // elles qui sont indexées — mais `'always'` l'exige aussi des fichiers, et
  // `/media/<clé>/400.webp` tombait alors en 404. La règle est donc appliquée par le
  // middleware, qui sait distinguer une page d'un fichier.
  trailingSlash: 'ignore',
  /*
    Pas de session Astro : le site public n'en ouvre aucune.

    L'adaptateur Cloudflare branchait pourtant son pilote par défaut sur un binding KV
    `SESSION` que ce worker ne déclare nulle part — le runtime partait donc dans le
    paquet servi, et se faisait analyser à chaque démarrage à froid, pour un pilote
    posé sur du vide. `false` l'en sort (Astro ≥ 7.2).
  */
  session: false,
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
  integrations: [
    svelte(),
    // Les actifs (feuilles de style, logos) sont servis avant le worker : leurs en-têtes
    // passent par `_headers`. Valeurs identiques à src/lib/security-headers.ts.
    headersStatiques({
      hstsMaxAge: 63072000,
      permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=()'
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
      'import.meta.env.PUBLIC_APP_ENV': JSON.stringify(APP_ENV),
      'import.meta.env.PUBLIC_SITE_URL': JSON.stringify(SITE_URL)
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      /*
        Le service d'images « noop », le manifeste et le rendu Svelte côté serveur ne sont
        découverts par Vite qu'au premier rendu, après le pré-bundle : il ré-optimise
        alors les dépendances et recharge, mais le worker
        SSR de Cloudflare garde son graphe de modules et réclame un chunk qui n'existe
        plus (« The file does not exist at …/deps_ssr/route-cache-… »). Sous le démon de
        dev d'Astro 7, ce plantage survient avant que le serveur ne soit prêt : `astro dev`
        échouait à chaque lancement. Le déclarer d'avance évite la ré-optimisation.
      */
      include: ['astro/assets/services/noop', 'astro/app/manifest', '@astrojs/svelte/server.js'],
      exclude: ['astro:transitions', '@astrojs/cloudflare', '@nba/ui', '@nba/cms-ui', '@nba/club-ui']
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
