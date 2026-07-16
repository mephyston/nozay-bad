import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@metacult/shared-ui': path.resolve(__dirname, '../../../shared/ui/src/index.ts'),
      'libs/shared/ui': path.resolve(__dirname, '../../../../libs/shared/ui'),
      '@metacult/features-shop-ui': path.resolve(__dirname, './src/index.ts'),
      '@metacult/features-shop-data-access': path.resolve(__dirname, '../data-access/src/index.ts'),
    },
    conditions: ['browser'],
  },
  test: {
    name: 'features-shop-ui',
    globals: true,
    environment: 'jsdom',
  },
});
