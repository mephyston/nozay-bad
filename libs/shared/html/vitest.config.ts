import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'shared-html',
    globals: true,
    // Projet à fichier séparé : il n'hérite PAS du `setupFiles` de la config racine.
    // Sans cette ligne, l'horloge n'est pas figée ici (voir vitest.setup.clock.ts).
    setupFiles: [path.resolve(__dirname, '../../..', 'vitest.setup.clock.ts')],
    // Environnement Node : l'assainissement se fait sur la chaîne, sans DOM — c'est
    // précisément la contrainte des Workers que cette lib respecte.
    environment: 'node'
  }
});
