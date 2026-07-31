import type { StorybookConfig } from '@storybook/svelte-vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// Reprend TOUS les alias @nba/* de tsconfig.base.json pour que les imports
// transitifs des patterns (ex. MobileBottomNav → @nba/iam-ui) se résolvent.
function nbaAliases(): Record<string, string> {
  const tsconfig = readFileSync(new URL('../tsconfig.base.json', import.meta.url), 'utf8');
  const { paths } = JSON.parse(tsconfig).compilerOptions as { paths: Record<string, string[]> };
  return Object.fromEntries(
    Object.entries(paths).map(([name, [target]]) => [
      name,
      fileURLToPath(new URL(`../${target}`, import.meta.url)),
    ]),
  );
}

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

    // Storybook ne charge pas automatiquement le plugin Svelte. On le place EN
    // TÊTE pour qu'il compile les .svelte (y compris les .stories.svelte) AVANT
    // le post-transform de addon-svelte-csf, qui attend du JS déjà compilé
    // (sinon rolldown parse le Svelte brut comme du JSX et échoue).
    cfg.plugins.unshift(...svelte());

    // Tailwind v4 (mêmes tokens/variants que les apps) pour un rendu fidèle.
    cfg.plugins.push(tailwindcss());

    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias ?? {}),
      ...nbaAliases(),
    };
    return cfg;
  },
};

export default config;
