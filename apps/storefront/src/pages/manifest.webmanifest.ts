import type { APIRoute } from 'astro';

/**
 * Le manifeste PWA, composé à la demande.
 *
 * Il était généré au build par vite-pwa, avec un nom écrit dans `astro.config.mjs` :
 * le nom du club y était donc gravé pour tous. Servi ici, il lit l'identité du club
 * que le middleware a posée — `Astro.locals.club` — et le reste (icônes, couleurs,
 * affichage) ne change pas d'un club à l'autre.
 *
 * Le suffixe d'environnement et les icônes `-dev`/`-test` restent inlinés au build,
 * comme le bandeau (voir `Layout.astro`).
 */
const APP_ENV = import.meta.env.PUBLIC_APP_ENV || 'production';
const ICON_SUFFIX = APP_ENV === 'development' ? '-dev' : APP_ENV === 'staging' ? '-test' : '';
const ENV_LABEL = APP_ENV === 'development' ? ' (DEV)' : APP_ENV === 'staging' ? ' (TEST)' : '';

export const GET: APIRoute = ({ locals }) => {
  const club = locals.club?.settings;
  const sigle = club?.shortName || 'Club';
  const manifest = {
    name: `${sigle}${ENV_LABEL}`,
    short_name: `${sigle}${ENV_LABEL}`,
    description: `Espace adhérent du club ${club?.name || ''}`.trim(),
    lang: 'fr',
    start_url: '/',
    scope: '/',
    theme_color: '#262624',
    background_color: '#262624',
    display: 'standalone',
    icons: [
      { src: `/pwa/icon-192${ICON_SUFFIX}.png`, sizes: '192x192', type: 'image/png' },
      { src: `/pwa/icon-512${ICON_SUFFIX}.png`, sizes: '512x512', type: 'image/png' }
    ]
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Une heure : le nom du club change rarement, et l'installation le relit.
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
