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
      '@metacult/shared-ui': path.resolve(__dirname, '../../libs/shared/ui/src/index.ts'),
      'libs/shared/ui': path.resolve(__dirname, '../../libs/shared/ui'),
    },
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
