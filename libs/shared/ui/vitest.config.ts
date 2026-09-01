import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      'astro:transitions/client': path.resolve(__dirname, './src/mocks/astro-transitions.ts'),
      '@nba/ui': path.resolve(__dirname, './src/index.ts'),
      'libs/shared/ui': path.resolve(__dirname, '../../shared/ui'),
    },
    conditions: ['browser'],
  },
  test: {
    name: 'shared-ui',
    globals: true,
    // Projet à fichier séparé : il n'hérite PAS du `setupFiles` de la config racine.
    // Sans cette ligne, l'horloge n'est pas figée ici (voir vitest.setup.clock.ts).
    setupFiles: [path.resolve(__dirname, '../../..', 'vitest.setup.clock.ts')],
    environment: 'jsdom',
  },
});
