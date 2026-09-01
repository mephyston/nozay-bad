// @ts-nocheck
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      'astro:middleware': path.resolve(__dirname, './src/mocks/astro-middleware.ts'),
      'astro:transitions/client': path.resolve(__dirname, '../../libs/shared/ui/src/mocks/astro-transitions.ts'),
      'cloudflare:workers': path.resolve(__dirname, './src/mocks/cloudflare-workers.ts'),
      '@nba/ui': path.resolve(__dirname, '../../libs/shared/ui/src/index.ts'),
      '@nba/api-client': path.resolve(__dirname, '../../libs/shared/api-client/src/index.ts'),
      '@nba/security-headers': path.resolve(__dirname, '../../libs/shared/security-headers/src/index.ts'),
      '@nba/runtime-env': path.resolve(__dirname, '../../libs/shared/runtime-env/src/index.ts'),
      '@nba/iam-ui': path.resolve(__dirname, '../../libs/domains/iam/shared/ui.ts'),
      '@nba/iam': path.resolve(__dirname, '../../libs/domains/iam/index.ts'),
      // Le barrel @nba/iam expose désormais la résolution d'identité, qui touche la
      // base : l'alias devient nécessaire ici comme il l'est déjà côté build.
      '@nba/db': path.resolve(__dirname, '../../libs/shared/db/src/index.ts'),
      // Le relais du CMS signe le jeton d'aperçu d'une page : `PREVIEW_TOKEN_SECRET` est
      // partagé avec le site public, et n'a rien à faire dans le navigateur.
      '@nba/preview': path.resolve(__dirname, '../../libs/shared/preview/src/index.ts'),
      // Le relais des interclubs valide le championnat reçu contre la liste connue.
      '@nba/teams/championship': path.resolve(__dirname, '../../libs/domains/teams/shared/championship.ts'),
      // La fiche d'un adhérent n'affiche que des fonctions de la liste connue.
      '@nba/members/club-functions': path.resolve(__dirname, '../../libs/domains/members/shared/club-functions.ts'),
      'libs/shared/ui': path.resolve(__dirname, '../../libs/shared/ui'),
    },
    conditions: ['browser'],
  },
  test: {
    name: 'admin',
    globals: true,
    // Projet à fichier séparé : il n'hérite PAS du `setupFiles` de la config racine.
    // Sans cette ligne, l'horloge n'est pas figée ici (voir vitest.setup.clock.ts).
    setupFiles: [path.resolve(__dirname, '../..', 'vitest.setup.clock.ts')],
    environment: 'jsdom',
  },
});
