import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'advanced',
    runtime: { mode: 'local' }
  }),
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: [
        '@astrojs/cloudflare',
        '@metacult/shared-ui',
        '@metacult/features-members-ui',
        '@metacult/features-accounting-ui',
        '@metacult/features-expenses-ui',
        '@metacult/features-shop-ui'
      ]
    }
  },
  srcDir: './src'
});
