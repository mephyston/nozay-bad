import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [svelte()],
  resolve: {
    alias: {
      '@metacult/shared-ui': path.resolve(__dirname, '../../shared/ui/src/index.ts'),
      '@metacult/features-members-ui': path.resolve(__dirname, './ui.ts'),
      '@metacult/features-members-api': path.resolve(__dirname, './index.ts'),
      '@metacult/features-accounting-ui': path.resolve(__dirname, '../accounting/ui.ts'),
      '@metacult/features-expenses-ui': path.resolve(__dirname, '../expenses/ui.ts'),
      '@metacult/features-shop-ui': path.resolve(__dirname, '../shop/ui.ts'),
    },
    conditions: ['browser'],
  },
  test: {
    name: 'features-members-ui',
    globals: true,
    environment: 'jsdom',
    include: ['get-member-by-licence/ui/**/*.test.ts', 'import-members-csv/ui/**/*.test.ts', 'list-members/ui/**/*.test.ts'],
  },
});
