import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    runtime: { mode: 'local' }
  }),
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()]
  },
  srcDir: './src'
});
