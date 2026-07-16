import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@metacult/shared-ui': path.resolve(__dirname, '../../../shared/ui/src/index.ts'),
      'libs/shared/ui': path.resolve(__dirname, '../../../../libs/shared/ui'),
      '@metacult/features-expenses-ui': path.resolve(__dirname, './src/index.ts'),
      '@metacult/features-expenses-data-access': path.resolve(__dirname, '../data-access/src/index.ts'),
    },
    conditions: ['browser'],
  },
  test: {
    name: 'features-expenses-ui',
    globals: true,
    environment: 'jsdom',
  },
});
