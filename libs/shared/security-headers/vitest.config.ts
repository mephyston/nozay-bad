import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'shared-security-headers',
    globals: true,
    // Projet à fichier séparé : il n'hérite PAS du `setupFiles` de la config racine.
    // Sans cette ligne, l'horloge n'est pas figée ici (voir vitest.setup.clock.ts).
    setupFiles: [path.resolve(__dirname, '../../..', 'vitest.setup.clock.ts')],
    // Environnement Node : la lib ne manipule que Response/Headers, sans DOM.
    environment: 'node'
  }
});
