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
    environment: 'jsdom',
  },
});
