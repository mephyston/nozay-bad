import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync(path.resolve('../../package.json'), 'utf-8'));

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'advanced',
    runtime: { mode: 'local' }
  }),
  integrations: [svelte()],
  vite: {
    define: {
      'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || pkg.version)
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: [
        'astro:transitions',
        '@astrojs/cloudflare',
        '@nba/ui',
        '@nba/members-ui',
        '@nba/accounting-ui',
        '@nba/expenses-ui',
        '@nba/shop-ui',
        '@nba/iam',
        '@nba/iam-ui'
      ]
    },
    ssr: {
      external: ['@astrojs/cloudflare']
    }
  },
  srcDir: './src'
});
