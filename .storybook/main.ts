import type { StorybookConfig } from '@storybook/svelte-vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const config: StorybookConfig = {
  stories: ['../libs/shared/ui/**/*.stories.@(svelte|ts)'],
  addons: [
    '@storybook/addon-themes',
    '@storybook/addon-svelte-csf',
  ],
  framework: {
    name: '@storybook/svelte-vite',
    // Désactive le plugin de docgen Svelte : sous Vite 8 (rolldown) il parse les
    // .svelte avec le parser JS et échoue. On perd la doc auto des props.
    options: { docgen: false },
  },
  core: { disableTelemetry: true },
  async viteFinal(cfg) {
    const { svelte } = await import('@sveltejs/vite-plugin-svelte');
    cfg.plugins = cfg.plugins ?? [];

    // Storybook ne charge pas automatiquement le plugin Svelte : sans lui, le
    // moteur rolldown de Vite 8 parse le .svelte brut comme du JSX et échoue.
    cfg.plugins.push(svelte());

    // Tailwind v4 (mêmes tokens/variants que les apps) pour un rendu fidèle.
    cfg.plugins.push(tailwindcss());

    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias ?? {}),
      '@nba/ui': fileURLToPath(new URL('../libs/shared/ui/src/index.ts', import.meta.url)),
    };
    return cfg;
  },
};

export default config;
