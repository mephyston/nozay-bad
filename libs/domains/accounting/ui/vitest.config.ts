import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [svelte()],
  resolve: {
    alias: {
      '@metacult/shared-ui': path.resolve(__dirname, '../../../shared/ui/src/index.ts'),
      'libs/shared/ui': path.resolve(__dirname, '../../../../libs/shared/ui'),
      '@metacult/features-accounting-ui': path.resolve(__dirname, './src/index.ts'),
      '@metacult/features-accounting-data-access': path.resolve(__dirname, '../data-access/src/index.ts'),
      '@metacult/features-members-data-access': path.resolve(__dirname, '../../members/data-access/src/index.ts'),
    },
    conditions: ['browser'],
  },
  test: {
    name: 'features-accounting-ui',
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', '../**/ui/**/*.test.ts'],
  },
});
