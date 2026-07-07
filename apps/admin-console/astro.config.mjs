import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    runtime: { mode: 'local' }
  }),
  integrations: [
    svelte(),
    tailwind({
      configFile: fileURLToPath(new URL('./tailwind.config.cjs', import.meta.url))
    })
  ],
  srcDir: './src'
});
