import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@nba/db': path.resolve(__dirname, './src/index.ts'),
    },
  },
  test: {
    name: 'shared-db',
    globals: true,
    // Projet à fichier séparé : il n'hérite PAS du `setupFiles` de la config racine.
    // Sans cette ligne, l'horloge n'est pas figée ici (voir vitest.setup.clock.ts).
    setupFiles: [path.resolve(__dirname, '../../..', 'vitest.setup.clock.ts')],
  },
});
