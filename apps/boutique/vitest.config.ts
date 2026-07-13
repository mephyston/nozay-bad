import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      'cloudflare:workers': path.resolve(__dirname, '../admin-console/src/mocks/cloudflare-workers.ts'),
    },
    conditions: ['browser'],
  },
  test: {
    name: 'boutique',
    globals: true,
    environment: 'jsdom',
  },
});
