// @ts-nocheck
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      'astro:middleware': path.resolve(__dirname, './src/mocks/astro-middleware.ts'),
      'cloudflare:workers': path.resolve(__dirname, './src/mocks/cloudflare-workers.ts'),
      '@nba/ui': path.resolve(__dirname, '../../libs/shared/ui/src/index.ts'),
      '@nba/api-client': path.resolve(__dirname, '../../libs/shared/api-client/src/index.ts'),
      '@nba/iam-ui': path.resolve(__dirname, '../../libs/domains/iam/shared/ui.ts'),
      '@nba/iam': path.resolve(__dirname, '../../libs/domains/iam/index.ts'),
      'libs/shared/ui': path.resolve(__dirname, '../../libs/shared/ui'),
    },
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
