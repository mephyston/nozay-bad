import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      'astro:middleware': path.resolve(__dirname, './src/mocks/astro-middleware.ts'),
      'cloudflare:workers': path.resolve(__dirname, './src/mocks/cloudflare-workers.ts'),
    },
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
