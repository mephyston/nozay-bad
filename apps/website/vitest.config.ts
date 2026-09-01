import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': path.resolve(__dirname, '../admin/src/mocks/cloudflare-workers.ts'),
      '@nba/api-client': path.resolve(__dirname, '../../libs/shared/api-client/src/index.ts'),
      '@nba/security-headers': path.resolve(__dirname, '../../libs/shared/security-headers/src/index.ts'),
      '@nba/runtime-env': path.resolve(__dirname, '../../libs/shared/runtime-env/src/index.ts'),
      '@nba/html': path.resolve(__dirname, '../../libs/shared/html/src/index.ts'),
      '@nba/preview': path.resolve(__dirname, '../../libs/shared/preview/src/index.ts'),
      '@nba/cms/public': path.resolve(__dirname, '../../libs/domains/cms/shared/public.ts'),
      '@nba/db': path.resolve(__dirname, '../../libs/shared/db/src/index.ts')
    }
  },
  test: {
    name: 'website',
    globals: true,
    // Projet à fichier séparé : il n'hérite PAS du `setupFiles` de la config racine.
    // Sans cette ligne, l'horloge n'est pas figée ici (voir vitest.setup.clock.ts).
    setupFiles: [path.resolve(__dirname, '../..', 'vitest.setup.clock.ts')],
    // Node et non jsdom : le site public ne porte presque aucun JS, et ce qui est
    // testé ici (résolution d'URL, en-têtes, cache, SEO) est du code serveur.
    environment: 'node'
  }
});
