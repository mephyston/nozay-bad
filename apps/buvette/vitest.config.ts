import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      'cloudflare:workers': path.resolve(__dirname, '../admin/src/mocks/cloudflare-workers.ts'),
      'astro:transitions/client': path.resolve(__dirname, '../../libs/shared/ui/src/mocks/astro-transitions.ts'),
      '@nba/ui': path.resolve(__dirname, '../../libs/shared/ui/src/index.ts'),
      '@nba/api-client': path.resolve(__dirname, '../../libs/shared/api-client/src/index.ts'),
      '@nba/club/context': path.resolve(__dirname, '../../libs/domains/club/shared/context.ts'),
      '@nba/club-ui': path.resolve(__dirname, '../../libs/domains/club/shared/ui.ts'),
      '@nba/security-headers': path.resolve(__dirname, '../../libs/shared/security-headers/src/index.ts'),
      '@nba/runtime-env': path.resolve(__dirname, '../../libs/shared/runtime-env/src/index.ts'),
      '@nba/mailer': path.resolve(__dirname, '../../libs/shared/mailer/src/index.ts')
    },
    conditions: ['browser']
  },
  test: {
    name: 'buvette',
    globals: true,
    setupFiles: [path.resolve(__dirname, '../..', 'vitest.setup.clock.ts')],
    environment: 'jsdom'
  }
});
