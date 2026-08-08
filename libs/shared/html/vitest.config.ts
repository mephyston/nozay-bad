import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared-html',
    globals: true,
    // Environnement Node : l'assainissement se fait sur la chaîne, sans DOM — c'est
    // précisément la contrainte des Workers que cette lib respecte.
    environment: 'node'
  }
});
