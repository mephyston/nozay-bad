import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { headersStatiques } from '../../scripts/headers-statiques.mjs';

// Environnement inliné au build, comme les autres applications (scripts/build-env.mjs).
const APP_ENV = process.env.PUBLIC_APP_ENV || 'production';

export default defineConfig({
  output: 'server',
  // La barre d'outils de dev se pose sur les boutons du bas de l'écran.
  devToolbar: { enabled: false },
  // Pas de session Astro : l'identité vient de Cloudflare Access ou d'un cookie signé.
  session: false,
  adapter: cloudflare({ runtime: { mode: 'local' } }),
  integrations: [
    svelte(),
    headersStatiques({
      hstsMaxAge: 31536000,
      permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
    })
  ],
  vite: {
    server: { strictPort: true },
    define: {
      'import.meta.env.PUBLIC_APP_ENV': JSON.stringify(APP_ENV),
      'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(process.env.VITE_APP_VERSION || 'dev')
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'astro/assets/services/noop',
        'astro/app/manifest',
        'astro/logger/console',
        '@astrojs/svelte/server.js',
        'bits-ui',
        'mode-watcher',
        'svelte-sonner',
        'tailwind-merge',
        'tailwind-variants',
        '@internationalized/date'
      ],
      exclude: ['astro:transitions', '@astrojs/cloudflare', '@nba/ui', '@nba/club-ui']
    },
    ssr: { external: ['@astrojs/cloudflare'] }
  },
  server: { port: 4325 },
  srcDir: './src'
});
